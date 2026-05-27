import { db } from "../../config/db.js";
import { normalizeClassName } from "../../utils/classes.js";

export async function listClasses(_req, res, next) {
  try {
    const rows = await db("classes as c")
      .leftJoin("student_profiles as sp", "sp.class_id", "c.id")
      .leftJoin("class_homeroom_teachers as cht", "cht.class_id", "c.id")
      .select(
        "c.id",
        "c.name",
        "c.created_at",
        "c.updated_at",
        db.raw("count(distinct sp.user_id) as student_count"),
        db.raw("count(distinct cht.teacher_user_id) as homeroom_count"),
      )
      .groupBy("c.id")
      .orderBy("c.name");

    const homeroomRows = await db("class_homeroom_teachers as cht")
      .join("users as u", "u.id", "cht.teacher_user_id")
      .select("cht.class_id", "u.name")
      .orderBy("u.name");

    const homeroomByClass = homeroomRows.reduce((acc, row) => {
      if (!acc[row.class_id]) acc[row.class_id] = [];
      acc[row.class_id].push(row.name);
      return acc;
    }, {});

    res.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        studentCount: Number(row.student_count),
        homeroomCount: Number(row.homeroom_count),
        homeroomTeachers: homeroomByClass[row.id] ?? [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    );
  } catch (err) {
    next(err);
  }
}

export async function createClass(req, res, next) {
  try {
    const name = normalizeClassName(req.validated.body.name);
    const existing = await db("classes")
      .whereRaw("lower(name) = lower(?)", [name])
      .first();
    if (existing)
      return next({ status: 409, message: "Nama kelas sudah ada" });
    const [row] = await db("classes").insert({ name }).returning("*");
    res.status(201).json({
      id: row.id,
      name: row.name,
      studentCount: 0,
      homeroomCount: 0,
      homeroomTeachers: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateClass(req, res, next) {
  try {
    const { id } = req.validated.params;
    const name = normalizeClassName(req.validated.body.name);
    const current = await db("classes").where({ id }).first();
    if (!current) return next({ status: 404, message: "Kelas tidak ditemukan" });
    if (name.toLowerCase() !== current.name.toLowerCase()) {
      const dup = await db("classes")
        .whereRaw("lower(name) = lower(?)", [name])
        .whereNot({ id })
        .first();
      if (dup) return next({ status: 409, message: "Nama kelas sudah ada" });
    }
    const [updated] = await db("classes")
      .where({ id })
      .update({ name, updated_at: new Date() })
      .returning("*");
    res.json({ id: updated.id, name: updated.name, createdAt: updated.created_at, updatedAt: updated.updated_at });
  } catch (err) {
    next(err);
  }
}

export async function deleteClass(req, res, next) {
  try {
    const { id } = req.validated.params;
    const cls = await db("classes").where({ id }).first();
    if (!cls) return next({ status: 404, message: "Kelas tidak ditemukan" });

    const [{ count: studentCount }] = await db("student_profiles").where({ class_id: id }).count("user_id as count");
    if (Number(studentCount) > 0)
      return next({ status: 409, message: `Kelas masih memiliki ${studentCount} siswa. Pindahkan atau hapus siswa terlebih dahulu.` });

    const [{ count: homeroomCount }] = await db("class_homeroom_teachers").where({ class_id: id }).count("teacher_user_id as count");
    if (Number(homeroomCount) > 0)
      return next({ status: 409, message: "Kelas masih memiliki wali kelas terkait." });

    const [{ count: permCount }] = await db("permissions").where({ class_id: id }).count("id as count");
    if (Number(permCount) > 0)
      return next({ status: 409, message: `Kelas memiliki ${permCount} data perizinan. Tidak dapat dihapus.` });

    await db("classes").where({ id }).del();
    res.json({ message: "Kelas berhasil dihapus" });
  } catch (err) {
    next(err);
  }
}

export async function listStudentsByClass(req, res, next) {
  try {
    let rowsQuery = db("student_profiles as sp")
      .join("users as u", "u.id", "sp.user_id")
      .join("classes as c", "c.id", "sp.class_id")
      .select(
        "c.id as class_id",
        "c.name as class_name",
        "u.id",
        "u.name",
        "u.nis",
      );

    if (req.user.role === "wali_kelas") {
      rowsQuery = rowsQuery.whereIn(
        "sp.class_id",
        db("class_homeroom_teachers")
          .select("class_id")
          .where("teacher_user_id", req.user.id),
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
