import { db } from "../../config/db.js";

export async function getProfile(req, res) {
  const profile = await db("student_profiles")
    .leftJoin("classes", "classes.id", "student_profiles.class_id")
    .select("student_profiles.nopol", "classes.name as class_name")
    .where("student_profiles.user_id", req.user.id)
    .first();
  res.json({
    id: req.user.id,
    name: req.user.name,
    role: req.user.role,
    username: req.user.username,
    nis: req.user.nis,
    nip: req.user.nip,
    avatarUrl: req.user.avatar_url,
    className: profile?.class_name || null,
    nopol: profile?.nopol || null,
  });
}

export async function updateProfile(req, res, next) {
  try {
    const updates = {};
    if (req.file) updates.avatar_url = req.file.filename;
    if (Object.keys(updates).length > 0) await db("users").where({ id: req.user.id }).update(updates);
    if (req.user.role === "siswa" && typeof req.body.nopol === "string") {
      await db("student_profiles").where({ user_id: req.user.id }).update({ nopol: req.body.nopol });
    }
    res.json({ message: "Profil berhasil diperbarui" });
  } catch (err) {
    next(err);
  }
}
