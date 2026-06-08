import { db } from "../../config/db.js";
import { env } from "../../config/env.js";
import { sha256, verifyQrToken } from "../../utils/security.js";
import { isPermissionExpired } from "../../utils/permissions.js";
import { uploadPublicUrl } from "../../utils/uploads.js";

const STATUS_TO_FRONTEND = {
  pending_wali: "pending",
  approved_wali: "approved_wali",
  approved_piket: "approved_piket",
  expired: "expired",
  rejected: "rejected",
  completed: "completed",
  closed_no_return: "completed",
};

const SCAN_ACTION = "scan_keluar";

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
    status: STATUS_TO_FRONTEND[row.status] || row.status,
    rawStatus: row.status,
    category: row.category,
    nomorPolisi: row.nomor_polisi,
    departureTime: row.departure_time,
    estimatedReturnTime: row.estimated_return_time,
    actualReturnTime: row.actual_return_time,
    willNotReturn: row.will_not_return,
    rejectedReason: row.rejected_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    scannedAt: row.scanned_at,
  };
}

function getDateRange(dateValue) {
  const dateText =
    typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
      ? dateValue
      : new Date().toISOString().slice(0, 10);
  const start = new Date(`${dateText}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

async function insertScanLog(trx, permission, userId, scannedAt = new Date()) {
  await trx("entry_exit_logs").insert({
    permission_id: permission.id,
    student_user_id: permission.student_user_id,
    class_id: permission.class_id,
    action: SCAN_ACTION,
    acted_by_user_id: userId,
    created_at: scannedAt,
  });
}

export async function scanQr(req, res, next) {
  try {
    const { token } = req.params;
    let payload;
    try {
      payload = verifyQrToken(token);
    } catch {
      return next({ status: 401, message: "QR Code tidak valid." });
    }
    const tokenHash = sha256(token);

    const result = await db.transaction(async (trx) => {
      const saved = await trx("permission_qr_tokens")
        .where({
          permission_id: payload.permissionId,
          token_hash: tokenHash,
        })
        .forUpdate()
        .first();

      if (!saved) {
        return { error: { status: 401, message: "QR Code tidak valid." } };
      }
      if (saved.used_at) {
        return {
          error: {
            status: 409,
            message: "QR Code sudah digunakan dan tidak dapat dipakai kembali.",
          },
        };
      }
      if (saved.revoked_at || new Date(saved.expires_at) <= new Date()) {
        return {
          error: {
            status: 410,
            message: "QR Code sudah kedaluwarsa atau tidak aktif.",
          },
        };
      }

      const permission = await trx("permissions as p")
        .leftJoin("users as s", "s.id", "p.student_user_id")
        .leftJoin("classes as c", "c.id", "p.class_id")
        .leftJoin("permission_documents as d", function joinLatestDocument() {
          this.on("d.permission_id", "p.id").andOn(
            "d.created_at",
            trx.raw(
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

      if (!permission) {
        return { error: { status: 404, message: "Perizinan tidak ditemukan" } };
      }
      if (
        permission.status !== "approved_piket" ||
        isPermissionExpired(permission)
      ) {
        return {
          error: { status: 403, message: "Perizinan tidak aktif/expired" },
        };
      }

      const usedAt = new Date();
      await trx("permission_qr_tokens").where({ id: saved.id }).update({
        used_at: usedAt,
        used_by_user_id: req.user.id,
      });
      await insertScanLog(trx, permission, req.user.id, usedAt);

      return {
        permission: { ...permission, scanned_at: usedAt },
        documentUrl: uploadPublicUrl(permission.file_path),
      };
    });

    if (result.error) return next(result.error);

    res.json({
      permission: normalizePermission(result.permission),
      documentUrl: result.documentUrl,
      suratUrl: `${env.appUrl}/api/v1/permissions/${result.permission.id}/surat`,
    });
  } catch (err) {
    next(err);
  }
}

export async function listScannedPermissions(req, res, next) {
  try {
    const { start, end } = getDateRange(req.query.date);
    const latestScans = db("entry_exit_logs")
      .select("permission_id")
      .max("created_at as scanned_at")
      .where({ action: SCAN_ACTION })
      .andWhere("created_at", ">=", start)
      .andWhere("created_at", "<", end)
      .groupBy("permission_id")
      .as("scan");

    const rows = await db(latestScans)
      .join("permissions as p", "p.id", "scan.permission_id")
      .leftJoin("users as s", "s.id", "p.student_user_id")
      .leftJoin("classes as c", "c.id", "p.class_id")
      .select(
        "p.*",
        "s.name as student_name",
        "s.nis",
        "c.name as class_name",
        "scan.scanned_at",
      )
      .orderBy("scan.scanned_at", "desc");

    res.json({ data: rows.map(normalizePermission) });
  } catch (err) {
    next(err);
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
