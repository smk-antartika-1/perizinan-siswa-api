import bcrypt from "bcryptjs";
import XLSX from "xlsx";
import { db } from "../../config/db.js";

export async function importStudents(req, res, next) {
  try {
    if (!req.file) return next({ status: 400, message: "File excel wajib diupload" });
    const wb = XLSX.readFile(req.file.path);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);
    let inserted = 0;
    for (const row of rows) {
      const nis = String(row.nis || row.NIS || "").trim();
      const name = String(row.name || row.nama || "").trim();
      const className = String(row.kelas || row.class || "").trim();
      if (!nis || !name || !className) continue;
      const existingClass = await db("classes").where({ name: className }).first();
      const classId = existingClass
        ? existingClass.id
        : (await db("classes").insert({ name: className }).returning("id"))[0].id;
      const user = await db("users").where({ username: nis }).first();
      let userId = user?.id;
      if (!userId) {
        const hash = await bcrypt.hash(nis, 10);
        userId = (await db("users").insert({
          role: "siswa",
          username: nis,
          password_hash: hash,
          name,
          nis,
          must_change_password: true,
        }).returning("id"))[0].id;
        inserted += 1;
      }
      const profile = await db("student_profiles").where({ user_id: userId }).first();
      if (profile) await db("student_profiles").where({ user_id: userId }).update({ class_id: classId });
      else await db("student_profiles").insert({ user_id: userId, class_id: classId });
    }
    res.json({ message: "Import selesai", inserted });
  } catch (err) {
    next(err);
  }
}
