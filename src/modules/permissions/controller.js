import { db } from "../../config/db.js";
import { env } from "../../config/env.js";
import { sha256, signQrToken } from "../../utils/security.js";

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
    .leftJoin("permission_documents as d", "d.permission_id", "p.id")
    .select(
      "p.*",
      "s.name as student_name",
      "s.nis",
      "c.name as class_name",
      "d.file_path as document_path",
    )
    .orderBy("p.created_at", "desc");
}

export async function createPermission(req, res, next) {
  try {
    const profile = await getStudentProfile(req.user.id);
    if (!profile) return next({ status: 400, message: "Profile siswa belum lengkap" });
    const [row] = await db("permissions")
      .insert({
        student_user_id: req.user.id,
        class_id: profile.class_id,
        type: req.validated.body.type,
        reason: req.validated.body.reason,
        departure_time: req.validated.body.departureTime,
        estimated_return_time: req.validated.body.estimatedReturnTime || null,
        status: "pending_wali",
      })
      .returning("*");
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

export async function listPermissions(req, res, next) {
  try {
    let query = basePermissionQuery();
    if (req.user.role === "siswa") query = query.where("p.student_user_id", req.user.id);
    if (req.user.role === "wali_kelas") {
      query = query.whereIn(
        "p.class_id",
        db("class_homeroom_teachers").select("class_id").where("teacher_user_id", req.user.id),
      );
    }
    const rows = await query;
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function getPermissionById(req, res, next) {
  try {
    const row = await basePermissionQuery().where("p.id", req.params.id).first();
    if (!row) return next({ status: 404, message: "Perizinan tidak ditemukan" });
    res.json(row);
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

export async function approveByWali(req, res, next) {
  try {
    const row = await db("permissions").where({ id: req.params.id }).first();
    if (!row) return next({ status: 404, message: "Perizinan tidak ditemukan" });
    if (row.status !== "pending_wali") return next({ status: 400, message: "Status tidak valid" });
    await db("permissions").where({ id: row.id }).update({ status: "approved_wali", updated_at: new Date() });
    await markApproval(row.id, req.user.id, req.user.role, "approve_wali", req.validated.body.note);
    res.json({ message: "Perizinan disetujui wali kelas" });
  } catch (err) {
    next(err);
  }
}

export async function approveByPiket(req, res, next) {
  try {
    const row = await db("permissions").where({ id: req.params.id }).first();
    if (!row) return next({ status: 404, message: "Perizinan tidak ditemukan" });
    if (row.status !== "approved_wali") return next({ status: 400, message: "Status tidak valid" });
    await db("permissions").where({ id: row.id }).update({ status: "approved_piket", updated_at: new Date() });
    await markApproval(row.id, req.user.id, req.user.role, "approve_piket", req.validated.body.note);
    await db("entry_exit_logs").insert({
      permission_id: row.id,
      student_user_id: row.student_user_id,
      class_id: row.class_id,
      action: "izin_disetujui_piket",
      acted_by_user_id: req.user.id,
      note: req.validated.body.note || null,
    });
    res.json({ message: "Perizinan disetujui guru piket" });
  } catch (err) {
    next(err);
  }
}

export async function rejectPermission(req, res, next) {
  try {
    const row = await db("permissions").where({ id: req.params.id }).first();
    if (!row) return next({ status: 404, message: "Perizinan tidak ditemukan" });
    await db("permissions").where({ id: row.id }).update({
      status: "rejected",
      rejected_reason: req.validated.body.reason || "Ditolak",
      updated_at: new Date(),
    });
    await markApproval(row.id, req.user.id, req.user.role, "reject", req.validated.body.reason);
    res.json({ message: "Perizinan ditolak" });
  } catch (err) {
    next(err);
  }
}

export async function uploadDocument(req, res, next) {
  try {
    if (!req.file) return next({ status: 400, message: "Dokumen wajib diupload" });
    const permission = await db("permissions").where({ id: req.params.id }).first();
    if (!permission) return next({ status: 404, message: "Perizinan tidak ditemukan" });
    await db("permission_documents").insert({
      permission_id: permission.id,
      file_path: req.file.filename,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      uploaded_by_user_id: req.user.id,
    });
    res.status(201).json({ message: "Dokumen berhasil diupload", file: req.file.filename });
  } catch (err) {
    next(err);
  }
}

export async function generateQr(req, res, next) {
  try {
    const permission = await db("permissions").where({ id: req.params.id }).first();
    if (!permission) return next({ status: 404, message: "Perizinan tidak ditemukan" });
    const doc = await db("permission_documents").where({ permission_id: permission.id }).orderBy("created_at", "desc").first();
    if (!doc) return next({ status: 400, message: "Dokumen belum tersedia" });
    const token = signQrToken({ permissionId: permission.id, documentId: doc.id });
    const expiresAt = new Date(Date.now() + env.qrTokenTtlMinutes * 60000);
    await db("permission_qr_tokens").insert({
      permission_id: permission.id,
      token_hash: sha256(token),
      expires_at: expiresAt,
      generated_by_user_id: req.user.id,
    });
    const qrUrl = `${env.appUrl}/api/v1/security/scan/${token}`;
    res.json({ qrUrl, expiresAt });
  } catch (err) {
    next(err);
  }
}

export async function historyGroupedByClass(req, res, next) {
  try {
    const rows = await basePermissionQuery();
    const grouped = rows.reduce((acc, item) => {
      const key = item.class_name || "Tanpa Kelas";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
    res.json(grouped);
  } catch (err) {
    next(err);
  }
}
