import { db } from "../../config/db.js";
import { uploadPublicUrl } from "../../utils/uploads.js";

export async function getStudentByNis(req, res, next) {
  try {
    const student = await db("users as u")
      .join("student_profiles as sp", "sp.user_id", "u.id")
      .join("classes as c", "c.id", "sp.class_id")
      .leftJoin("class_homeroom_teachers as cht", "cht.class_id", "c.id")
      .leftJoin("users as wali", "wali.id", "cht.teacher_user_id")
      .select(
        "u.id",
        "u.name",
        "u.username",
        "u.email",
        "u.nis",
        "u.avatar_url",
        "sp.nopol",
        "c.name as class_name",
        "wali.id as wali_id",
        "wali.name as wali_name",
      )
      .where("u.nis", req.params.nis)
      .andWhere("u.role", "siswa")
      .first();

    if (!student) return next({ status: 404, message: "Siswa tidak ditemukan" });

    const permissions = await db("permissions")
      .where({ student_user_id: student.id })
      .orderBy("created_at", "desc")
      .limit(10);

    res.json({
      id: student.id,
      name: student.name,
      username: student.username,
      email: student.email,
      nis: student.nis,
      kelas: student.class_name,
      nopol: student.nopol,
      avatarUrl: uploadPublicUrl(student.avatar_url),
      waliKelas: student.wali_id ? { id: student.wali_id, name: student.wali_name } : null,
      activePermission: permissions.find((item) => item.status === "approved_piket") || null,
      recentPermissions: permissions,
    });
  } catch (err) {
    next(err);
  }
}
