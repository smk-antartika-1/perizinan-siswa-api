import { db } from "../../config/db.js";

export async function listStudentsByClass(req, res, next) {
  try {
    let rowsQuery = db("student_profiles as sp")
      .join("users as u", "u.id", "sp.user_id")
      .join("classes as c", "c.id", "sp.class_id")
      .select("c.id as class_id", "c.name as class_name", "u.id", "u.name", "u.nis");

    if (req.user.role === "wali_kelas") {
      rowsQuery = rowsQuery.whereIn(
        "sp.class_id",
        db("class_homeroom_teachers").select("class_id").where("teacher_user_id", req.user.id),
      );
    }

    const rows = await rowsQuery.orderBy("c.name").orderBy("u.name");
    const grouped = rows.reduce((acc, row) => {
      if (!acc[row.class_name]) acc[row.class_name] = [];
      acc[row.class_name].push({ id: row.id, name: row.name, nis: row.nis });
      return acc;
    }, {});

    res.json(grouped);
  } catch (err) {
    next(err);
  }
}
