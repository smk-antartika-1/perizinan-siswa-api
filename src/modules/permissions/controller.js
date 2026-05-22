import { db } from "../../config/db.js";
import { env } from "../../config/env.js";
import { sha256, signQrToken } from "../../utils/security.js";
import {
  getPermissionExpiry,
  isPermissionExpired,
} from "../../utils/permissions.js";

const STATUS_TO_FRONTEND = {
  pending_wali: "pending",
  approved_wali: "approved_wali",
  approved_piket: "approved_piket",
  expired: "expired",
  rejected: "rejected",
  completed: "completed",
  closed_no_return: "completed",
};

const ACTION_LABELS = {
  approve_wali: "Disetujui Wali Kelas",
  approve_piket: "Disetujui Guru Piket",
  bypass_piket: "Disetujui Langsung (Bypass Wali Kelas)",
  reject: "Ditolak",
};

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function getStudentProfile(userId) {
  return db("student_profiles")
    .leftJoin("classes", "classes.id", "student_profiles.class_id")
    .select("student_profiles.*", "classes.name as class_name")
    .where("student_profiles.user_id", userId)
    .first();
}

function basePermissionQuery() {
  return db("permissions as p")
    .leftJoin("users as s", "s.id", "p.student_user_id")
    .leftJoin("classes as c", "c.id", "p.class_id")
    .leftJoin("permission_documents as d", function joinLatestDocument() {
      this.on("d.permission_id", "p.id").andOn(
        "d.created_at",
        db.raw(
          "(select max(created_at) from permission_documents where permission_id = p.id)",
        ),
      );
    })
    .select(
      "p.*",
      "s.name as student_name",
      "s.nis",
      "c.name as class_name",
      "d.file_path as document_path",
    )
    .orderBy("p.created_at", "desc");
}

async function notifyUsers(userIds, payload) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return;
  await db("notifications").insert(
    uniqueIds.map((userId) => ({
      user_id: userId,
      title: payload.title,
      message: payload.message,
      type: payload.type || "info",
      permission_id: payload.permissionId || null,
    })),
  );
}

async function getHomeroomTeacherIds(classId) {
  const rows = await db("class_homeroom_teachers")
    .where({ class_id: classId })
    .select("teacher_user_id");
  return rows.map((row) => row.teacher_user_id);
}

async function getRoleUserIds(...roles) {
  const rows = await db("users")
    .whereIn("role", roles)
    .andWhere({ is_active: true })
    .select("id");
  return rows.map((row) => row.id);
}

async function getPermissionExtras(permissionId) {
  const comments = await db("permission_comments as pc")
    .join("users as u", "u.id", "pc.user_id")
    .select(
      "pc.id",
      "pc.text",
      "pc.created_at",
      "u.name as user_name",
      "u.role as user_role",
    )
    .where("pc.permission_id", permissionId)
    .orderBy("pc.created_at", "asc");

  const approvals = await db("permission_approvals as pa")
    .join("users as u", "u.id", "pa.actor_user_id")
    .select(
      "pa.id",
      "pa.action",
      "pa.note",
      "pa.created_at",
      "u.name as actor_name",
      "u.role as actor_role",
    )
    .where("pa.permission_id", permissionId)
    .orderBy("pa.created_at", "asc");

  return {
    comments: comments.map((comment) => ({
      id: comment.id,
      userName: comment.user_name,
      userRole: comment.user_role,
      text: comment.text,
      timestamp: comment.created_at,
    })),
    approvals,
  };
}

async function serializePermission(row, includeExtras = true) {
  const extras = includeExtras
    ? await getPermissionExtras(row.id)
    : { comments: [], approvals: [] };
  const expiresAt = getPermissionExpiry(row);
  const expired = isPermissionExpired(row);
  const auditLog = [
    {
      id: `${row.id}-created`,
      action: "Diajukan",
      actorName: row.student_name,
      actorRole: "siswa",
      timestamp: row.created_at,
      details: row.reason,
    },
    ...extras.approvals.map((approval) => ({
      id: approval.id,
      action: ACTION_LABELS[approval.action] || approval.action,
      actorName: approval.actor_name,
      actorRole: approval.actor_role,
      timestamp: approval.created_at,
      details: approval.note || undefined,
    })),
  ];

  return {
    id: row.id,
    studentId: row.student_user_id,
    studentName: row.student_name,
    nis: row.nis,
    kelas: row.class_name,
    type: row.type,
    reason: row.reason,
    departureTime: row.departure_time,
    estimatedReturnTime: row.estimated_return_time,
    actualReturnTime: row.actual_return_time,
    status: STATUS_TO_FRONTEND[row.status] || row.status,
    rawStatus: row.status,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    isExpired: expired,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rejectedReason: row.rejected_reason,
    willNotReturn: row.will_not_return,
    nomorPolisi: row.nomor_polisi,
    category: row.category || "keperluan",
    documentUrl: row.document_path
      ? `${env.appUrl}/uploads/${row.document_path}`
      : null,
    suratUrl: `${env.appUrl}/api/v1/permissions/${row.id}/surat`,
    comments: extras.comments,
    auditLog,
  };
}

async function getPermissionRowOrFail(id, next) {
  const row = await db("permissions").where({ id }).first();
  if (!row) {
    next({ status: 404, message: "Perizinan tidak ditemukan" });
    return null;
  }
  return row;
}

export async function createPermission(req, res, next) {
  try {
    const profile = await getStudentProfile(req.user.id);
    if (!profile)
      return next({ status: 400, message: "Profile siswa belum lengkap" });
    const [row] = await db("permissions")
      .insert({
        student_user_id: req.user.id,
        class_id: profile.class_id,
        type: req.validated.body.type,
        reason: req.validated.body.reason,
        departure_time: req.validated.body.departureTime,
        estimated_return_time: req.validated.body.estimatedReturnTime || null,
        status: "pending_wali",
        category: req.validated.body.category,
        nomor_polisi: req.validated.body.nomorPolisi || null,
      })
      .returning("*");

    await notifyUsers(await getHomeroomTeacherIds(profile.class_id), {
      title: "Pengajuan Izin Baru",
      message: `${req.user.name} mengajukan izin baru: ${row.reason}`,
      type: "info",
      permissionId: row.id,
    });

    const fullRow = await basePermissionQuery().where("p.id", row.id).first();
    res.status(201).json(await serializePermission(fullRow));
  } catch (err) {
    next(err);
  }
}

export async function listPermissions(req, res, next) {
  try {
    let query = basePermissionQuery();
    if (req.user.role === "siswa")
      query = query.where("p.student_user_id", req.user.id);
    if (req.user.role === "wali_kelas") {
      query = query.whereIn(
        "p.class_id",
        db("class_homeroom_teachers")
          .select("class_id")
          .where("teacher_user_id", req.user.id),
      );
    }
    const rows = await query;
    res.json(await Promise.all(rows.map((row) => serializePermission(row))));
  } catch (err) {
    next(err);
  }
}

export async function getPermissionById(req, res, next) {
  try {
    const row = await basePermissionQuery()
      .where("p.id", req.params.id)
      .first();
    if (!row)
      return next({ status: 404, message: "Perizinan tidak ditemukan" });
    res.json(await serializePermission(row));
  } catch (err) {
    next(err);
  }
}

async function markApproval(permissionId, actorId, actorRole, action, note) {
  await db("permission_approvals").insert({
    permission_id: permissionId,
    actor_user_id: actorId,
    actor_role: actorRole,
    action,
    note: note || null,
  });
}

async function addActionComment(permissionId, userId, text) {
  if (!text) return;
  await db("permission_comments").insert({
    permission_id: permissionId,
    user_id: userId,
    text,
  });
}

export async function approveByWali(req, res, next) {
  try {
    const row = await getPermissionRowOrFail(req.params.id, next);
    if (!row) return;
    if (row.status !== "pending_wali")
      return next({ status: 400, message: "Status tidak valid" });
    await db("permissions")
      .where({ id: row.id })
      .update({ status: "approved_wali", updated_at: new Date() });
    await markApproval(
      row.id,
      req.user.id,
      req.user.role,
      "approve_wali",
      req.validated.body.note,
    );
    await addActionComment(row.id, req.user.id, req.validated.body.note);
    await notifyUsers(await getRoleUserIds("guru_piket"), {
      title: "Izin Menunggu Guru Piket",
      message: `Izin siswa telah disetujui wali kelas dan menunggu persetujuan guru piket.`,
      type: "warning",
      permissionId: row.id,
    });
    res.json({ message: "Perizinan disetujui wali kelas" });
  } catch (err) {
    next(err);
  }
}

export async function approveByPiket(req, res, next) {
  try {
    const row = await getPermissionRowOrFail(req.params.id, next);
    if (!row) return;
    if (row.status !== "approved_wali")
      return next({ status: 400, message: "Status tidak valid" });
    await db("permissions")
      .where({ id: row.id })
      .update({
        status: "approved_piket",
        nomor_polisi: req.validated.body.nomorPolisi || row.nomor_polisi,
        updated_at: new Date(),
      });
    await markApproval(
      row.id,
      req.user.id,
      req.user.role,
      "approve_piket",
      req.validated.body.note,
    );
    await addActionComment(row.id, req.user.id, req.validated.body.note);
    await db("entry_exit_logs").insert({
      permission_id: row.id,
      student_user_id: row.student_user_id,
      class_id: row.class_id,
      action: "izin_disetujui_piket",
      acted_by_user_id: req.user.id,
      note: req.validated.body.note || null,
    });
    await notifyUsers([row.student_user_id], {
      title: "Izin Disetujui",
      message: "Pengajuan izin Anda telah disetujui guru piket.",
      type: "success",
      permissionId: row.id,
    });
    res.json({ message: "Perizinan disetujui guru piket" });
  } catch (err) {
    next(err);
  }
}

export async function approveBypassPiket(req, res, next) {
  try {
    const row = await getPermissionRowOrFail(req.params.id, next);
    if (!row) return;
    if (row.status !== "pending_wali")
      return next({
        status: 400,
        message: "Hanya izin pending wali yang dapat dibypass",
      });
    const reason =
      req.validated.body.reason || req.validated.body.note || "Bypass darurat";
    await db("permissions")
      .where({ id: row.id })
      .update({
        status: "approved_piket",
        nomor_polisi: req.validated.body.nomorPolisi || row.nomor_polisi,
        updated_at: new Date(),
      });
    await markApproval(
      row.id,
      req.user.id,
      req.user.role,
      "bypass_piket",
      reason,
    );
    await addActionComment(row.id, req.user.id, `[BYPASS DARURAT] ${reason}`);
    await notifyUsers([row.student_user_id], {
      title: "Izin Disetujui Darurat",
      message: "Pengajuan izin Anda disetujui langsung oleh guru piket.",
      type: "success",
      permissionId: row.id,
    });
    res.json({ message: "Perizinan disetujui langsung oleh guru piket" });
  } catch (err) {
    next(err);
  }
}

export async function rejectPermission(req, res, next) {
  try {
    const row = await getPermissionRowOrFail(req.params.id, next);
    if (!row) return;
    const reason =
      req.validated.body.reason || req.validated.body.note || "Ditolak";
    await db("permissions").where({ id: row.id }).update({
      status: "rejected",
      rejected_reason: reason,
      updated_at: new Date(),
    });
    await markApproval(row.id, req.user.id, req.user.role, "reject", reason);
    await addActionComment(row.id, req.user.id, `Ditolak: ${reason}`);
    await notifyUsers([row.student_user_id], {
      title: "Izin Ditolak",
      message: `Pengajuan izin Anda ditolak. Alasan: ${reason}`,
      type: "error",
      permissionId: row.id,
    });
    res.json({ message: "Perizinan ditolak" });
  } catch (err) {
    next(err);
  }
}

export async function addComment(req, res, next) {
  try {
    const row = await getPermissionRowOrFail(req.params.id, next);
    if (!row) return;
    const [comment] = await db("permission_comments")
      .insert({
        permission_id: row.id,
        user_id: req.user.id,
        text: req.validated.body.text,
      })
      .returning("*");
    res.status(201).json({
      id: comment.id,
      userName: req.user.name,
      userRole: req.user.role,
      text: comment.text,
      timestamp: comment.created_at,
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadDocument(req, res, next) {
  try {
    if (!req.file)
      return next({ status: 400, message: "Dokumen wajib diupload" });
    const permission = await db("permissions")
      .where({ id: req.params.id })
      .first();
    if (!permission)
      return next({ status: 404, message: "Perizinan tidak ditemukan" });
    await db("permission_documents").insert({
      permission_id: permission.id,
      file_path: req.file.filename,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      uploaded_by_user_id: req.user.id,
    });
    res
      .status(201)
      .json({ message: "Dokumen berhasil diupload", file: req.file.filename });
  } catch (err) {
    next(err);
  }
}

export async function generateQr(req, res, next) {
  try {
    const permission = await db("permissions")
      .where({ id: req.params.id })
      .first();
    if (!permission)
      return next({ status: 404, message: "Perizinan tidak ditemukan" });
    const token = signQrToken({ permissionId: permission.id });
    const expiresAt = new Date(Date.now() + env.qrTokenTtlMinutes * 60000);
    await db("permission_qr_tokens").insert({
      permission_id: permission.id,
      token_hash: sha256(token),
      expires_at: expiresAt,
      generated_by_user_id: req.user.id,
    });
    const qrUrl = `${env.appUrl}/api/v1/security/scan/${token}`;
    res.json({
      qrUrl,
      expiresAt,
      suratUrl: `${env.appUrl}/api/v1/permissions/${permission.id}/surat`,
    });
  } catch (err) {
    next(err);
  }
}

export async function getPermissionSurat(req, res, next) {
  try {
    const row = await basePermissionQuery()
      .where("p.id", req.params.id)
      .first();
    if (!row) return res.sendStatus(404);
    if (row.status !== "approved_piket") return res.sendStatus(403);
    const expiresAt = getPermissionExpiry(row);
    if (expiresAt && new Date() > expiresAt) return res.sendStatus(403);
    const permission = await serializePermission(row, false);
    const safeStatus = escapeXml(permission.status.toUpperCase());
    const safeStudentName = escapeXml(permission.studentName);
    const safeKelas = escapeXml(permission.kelas || "-");
    const safeReason = escapeXml(String(permission.reason).slice(0, 88));
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 720 480">
        <rect width="720" height="480" fill="#ffffff" rx="18"/>
        <rect x="0" y="0" width="720" height="72" fill="#2563eb" rx="18"/>
        <rect x="0" y="18" width="720" height="54" fill="#2563eb"/>
        <text x="360" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white">SURAT IZIN KELUAR SISWA</text>
        <text x="360" y="112" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#64748b">E-Izin Siswa - Sistem Perizinan Digital</text>
        <line x1="48" y1="136" x2="672" y2="136" stroke="#e2e8f0" stroke-width="1"/>
        <text x="48" y="170" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8">DOKUMEN</text>
        <text x="48" y="194" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#1e293b">TIKET PERIZINAN</text>
        <text x="360" y="170" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8">STATUS</text>
        <text x="360" y="194" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#16a34a">${safeStatus}</text>
        <line x1="48" y1="218" x2="672" y2="218" stroke="#e2e8f0" stroke-width="1"/>
        <text x="48" y="252" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8">NAMA SISWA</text>
        <text x="48" y="276" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#334155">${safeStudentName}</text>
        <text x="360" y="252" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8">KELAS</text>
        <text x="360" y="276" font-family="Arial, sans-serif" font-size="16" fill="#334155">${safeKelas}</text>
        <text x="48" y="326" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8">ALASAN</text>
        <text x="48" y="350" font-family="Arial, sans-serif" font-size="15" fill="#334155">${safeReason}</text>
        <line x1="48" y1="382" x2="672" y2="382" stroke="#e2e8f0" stroke-width="1"/>
        <text x="48" y="418" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8">DIVERIFIKASI OLEH SISTEM</text>
        <text x="48" y="442" font-family="Arial, sans-serif" font-size="14" fill="#334155">Guru Piket / Wali Kelas</text>
        <rect x="492" y="400" width="180" height="48" fill="#f1f5f9" rx="8"/>
        <text x="582" y="430" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#2563eb">VALID</text>
      </svg>
    `;
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(svg.trim());
  } catch (err) {
    next(err);
  }
}

export async function historyGroupedByClass(req, res, next) {
  try {
    const rows = await basePermissionQuery();
    const serialized = await Promise.all(
      rows.map((row) => serializePermission(row)),
    );
    const grouped = serialized.reduce((acc, item) => {
      const key = item.kelas || "Tanpa Kelas";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
    res.json(grouped);
  } catch (err) {
    next(err);
  }
}
