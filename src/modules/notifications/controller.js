import { db } from "../../config/db.js";

function normalizeNotification(row) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    permissionId: row.permission_id,
    read: Boolean(row.read_at),
    readAt: row.read_at,
    timestamp: row.created_at,
  };
}

export async function listNotifications(req, res, next) {
  try {
    const rows = await db("notifications")
      .where({ user_id: req.user.id })
      .orderBy("created_at", "desc");
    res.json({
      data: rows.map(normalizeNotification),
      unreadCount: rows.filter((row) => !row.read_at).length,
    });
  } catch (err) {
    next(err);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const [row] = await db("notifications")
      .where({ id: req.params.id, user_id: req.user.id })
      .update({ read_at: new Date() })
      .returning("*");
    if (!row) return next({ status: 404, message: "Notifikasi tidak ditemukan" });
    res.json(normalizeNotification(row));
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await db("notifications").where({ user_id: req.user.id }).whereNull("read_at").update({ read_at: new Date() });
    res.json({ message: "Semua notifikasi telah dibaca" });
  } catch (err) {
    next(err);
  }
}
