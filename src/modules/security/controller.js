import { db } from "../../config/db.js";
import { env } from "../../config/env.js";
import { sha256, verifyQrToken } from "../../utils/security.js";
import { isPermissionExpired } from "../../utils/permissions.js";

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

function normalizePermission(row) {
  return {
    id: row.id,
    studentId: row.student_user_id,
    studentName: row.student_name,
    nis: row.nis,
    kelas: row.class_name,
    reason: row.reason,
    type: row.type,
    status: row.status,
    category: row.category,
    nomorPolisi: row.nomor_polisi,
    departureTime: row.departure_time,
    estimatedReturnTime: row.estimated_return_time,
    actualReturnTime: row.actual_return_time,
    willNotReturn: row.will_not_return,
    rejectedReason: row.rejected_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function scanQr(req, res, next) {
  try {
    const { token } = req.params;
    const payload = verifyQrToken(token);
    const saved = await db("permission_qr_tokens")
      .where({
        permission_id: payload.permissionId,
        token_hash: sha256(token),
        revoked_at: null,
      })
      .andWhere("expires_at", ">", new Date())
      .first();
    if (!saved)
      return next({ status: 401, message: "QR token tidak valid/expired" });
    const permission = await db("permissions as p")
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
        "d.file_path",
      )
      .where("p.id", payload.permissionId)
      .first();
    if (!permission)
      return next({ status: 404, message: "Perizinan tidak ditemukan" });
    if (
      permission.status !== "approved_piket" ||
      isPermissionExpired(permission)
    ) {
      return next({ status: 403, message: "Perizinan tidak aktif/expired" });
    }
    const documentUrl = permission.file_path
      ? `${env.appUrl}/uploads/${permission.file_path}`
      : null;
    res.json({
      permission: normalizePermission(permission),
      documentUrl,
      suratUrl: `${env.appUrl}/api/v1/permissions/${permission.id}/surat`,
    });
  } catch {
    next({ status: 401, message: "QR token tidak valid/expired" });
  }
}

export async function markReturned(req, res, next) {
  try {
    const permission = await db("permissions")
      .where({ id: req.params.id })
      .first();
    if (!permission)
      return next({ status: 404, message: "Perizinan tidak ditemukan" });
    await db("permissions").where({ id: permission.id }).update({
      status: "completed",
      actual_return_time: new Date(),
      updated_at: new Date(),
    });
    await db("entry_exit_logs").insert({
      permission_id: permission.id,
      student_user_id: permission.student_user_id,
      class_id: permission.class_id,
      action: "sudah_kembali",
      acted_by_user_id: req.user.id,
    });
    await notifyUsers([permission.student_user_id], {
      title: "Siswa Kembali",
      message: "Status kembali Anda telah dicatat oleh petugas security.",
      type: "info",
      permissionId: permission.id,
    });
    res.json({ message: "Status siswa sudah kembali dicatat" });
  } catch (err) {
    next(err);
  }
}

export async function reopenPermission(req, res, next) {
  try {
    const permission = await db("permissions")
      .where({ id: req.params.id })
      .first();
    if (!permission)
      return next({ status: 404, message: "Perizinan tidak ditemukan" });
    await db("permissions").where({ id: permission.id }).update({
      status: "approved_piket",
      actual_return_time: null,
      will_not_return: false,
      updated_at: new Date(),
    });
    await db("entry_exit_logs").insert({
      permission_id: permission.id,
      student_user_id: permission.student_user_id,
      class_id: permission.class_id,
      action: "kepulangan_dibatalkan",
      acted_by_user_id: req.user.id,
    });
    res.json({ message: "Status perizinan dibuka kembali" });
  } catch (err) {
    next(err);
  }
}

export async function markNoReturn(req, res, next) {
  try {
    const permission = await db("permissions")
      .where({ id: req.params.id })
      .first();
    if (!permission)
      return next({ status: 404, message: "Perizinan tidak ditemukan" });
    await db("permissions").where({ id: permission.id }).update({
      status: "closed_no_return",
      will_not_return: true,
      updated_at: new Date(),
    });
    await db("entry_exit_logs").insert({
      permission_id: permission.id,
      student_user_id: permission.student_user_id,
      class_id: permission.class_id,
      action: "tidak_akan_kembali",
      acted_by_user_id: req.user.id,
    });
    await notifyUsers([permission.student_user_id], {
      title: "Tidak Akan Kembali",
      message:
        "Status tidak akan kembali Anda telah dicatat oleh petugas security.",
      type: "warning",
      permissionId: permission.id,
    });
    res.json({ message: "Status tidak akan kembali dicatat" });
  } catch (err) {
    next(err);
  }
}
