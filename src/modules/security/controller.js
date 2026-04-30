import { db } from "../../config/db.js";
import { env } from "../../config/env.js";
import { sha256, verifyQrToken } from "../../utils/security.js";

export async function scanQr(req, res, next) {
  try {
    const { token } = req.params;
    const payload = verifyQrToken(token);
    const saved = await db("permission_qr_tokens")
      .where({ permission_id: payload.permissionId, token_hash: sha256(token), revoked_at: null })
      .andWhere("expires_at", ">", new Date())
      .first();
    if (!saved) return next({ status: 401, message: "QR token tidak valid/expired" });
    const permission = await db("permissions as p")
      .leftJoin("users as s", "s.id", "p.student_user_id")
      .leftJoin("permission_documents as d", "d.permission_id", "p.id")
      .select("p.*", "s.name as student_name", "d.file_path")
      .where("p.id", payload.permissionId)
      .first();
    if (!permission) return next({ status: 404, message: "Perizinan tidak ditemukan" });
    const documentUrl = permission.file_path ? `${env.appUrl}/uploads/${permission.file_path}` : null;
    res.json({ permission, documentUrl });
  } catch {
    next({ status: 401, message: "QR token tidak valid/expired" });
  }
}

export async function markReturned(req, res, next) {
  try {
    const permission = await db("permissions").where({ id: req.params.id }).first();
    if (!permission) return next({ status: 404, message: "Perizinan tidak ditemukan" });
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
    res.json({ message: "Status siswa sudah kembali dicatat" });
  } catch (err) {
    next(err);
  }
}

export async function markNoReturn(req, res, next) {
  try {
    const permission = await db("permissions").where({ id: req.params.id }).first();
    if (!permission) return next({ status: 404, message: "Perizinan tidak ditemukan" });
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
    res.json({ message: "Status tidak akan kembali dicatat" });
  } catch (err) {
    next(err);
  }
}
