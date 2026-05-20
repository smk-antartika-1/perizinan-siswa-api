import bcrypt from "bcryptjs";
import XLSX from "xlsx";
import { db } from "../../config/db.js";

const TEMPLATES = {
  siswa: {
    filename: "template_import_siswa.csv",
    description: "Template import data Siswa",
    headers: ["nama", "nis", "kelas", "email", "password"],
    samples: [
      [
        "Budi Santoso",
        "2024001",
        "XII IPA 1",
        "budi@sekolah.id",
        "password123",
      ],
      ["Siti Rahayu", "2024002", "XII IPA 1", "siti@sekolah.id", "password123"],
    ],
  },
  wali_kelas: {
    filename: "template_import_walikelas.csv",
    description: "Template import data Wali Kelas",
    headers: ["nama", "nip", "kelas_binaan", "email", "password"],
    samples: [
      [
        "Ibu Ratna Sari",
        "NIP-001",
        "XII IPA 1",
        "ratna@sekolah.id",
        "password",
      ],
    ],
  },
  guru_piket: {
    filename: "template_import_gurupiket.csv",
    description: "Template import data Guru Piket",
    headers: ["nama", "nip", "email", "password"],
    samples: [["Pak Andi Wijaya", "NIP-G01", "andi@sekolah.id", "password"]],
  },
  security: {
    filename: "template_import_security.csv",
    description: "Template import data Security / Penjaga Gerbang",
    headers: ["nama", "nip", "email", "password"],
    samples: [["Pak Slamet", "SCR-001", "slamet@sekolah.id", "password"]],
  },
  admin: {
    filename: "template_import_admin.csv",
    description: "Template import data Administrator",
    headers: ["nama", "nip", "email", "password"],
    samples: [["Admin IT", "ADM-001", "admin@sekolah.id", "password"]],
  },
};

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function normalizeUser(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    username: row.username,
    email: row.email,
    nis: row.nis,
    nip: row.nip,
    avatarUrl: row.avatar_url,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
    kelas: row.student_class_name || row.homeroom_class_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function usersBaseQuery() {
  return db("users as u")
    .leftJoin("student_profiles as sp", "sp.user_id", "u.id")
    .leftJoin("classes as sc", "sc.id", "sp.class_id")
    .leftJoin("class_homeroom_teachers as cht", "cht.teacher_user_id", "u.id")
    .leftJoin("classes as hc", "hc.id", "cht.class_id")
    .select(
      "u.id",
      "u.name",
      "u.role",
      "u.username",
      "u.email",
      "u.nis",
      "u.nip",
      "u.avatar_url",
      "u.is_active",
      "u.must_change_password",
      "u.created_at",
      "u.updated_at",
      "sc.name as student_class_name",
      "hc.name as homeroom_class_name",
    );
}

async function getOrCreateClass(name) {
  const className = String(name || "").trim();
  if (!className) return null;
  const existing = await db("classes")
    .whereRaw("lower(name) = lower(?)", [className])
    .first();
  if (existing) return existing.id;
  const [created] = await db("classes")
    .insert({ name: className })
    .returning("*");
  return created.id;
}

async function syncRoleProfiles(userId, role, className) {
  await db("student_profiles").where({ user_id: userId }).del();
  await db("class_homeroom_teachers").where({ teacher_user_id: userId }).del();

  if (role === "siswa") {
    const classId = await getOrCreateClass(className);
    if (classId)
      await db("student_profiles").insert({
        user_id: userId,
        class_id: classId,
      });
  }

  if (role === "wali_kelas") {
    const classId = await getOrCreateClass(className);
    if (classId) {
      await db("class_homeroom_teachers")
        .insert({ class_id: classId, teacher_user_id: userId })
        .onConflict(["class_id", "teacher_user_id"])
        .ignore();
    }
  }
}

export async function listUsers(req, res, next) {
  try {
    const { role, search, page, limit } = req.validated.query;
    let query = usersBaseQuery();

    if (role && role !== "all") query = query.where("u.role", role);
    if (search) {
      const term = `%${search.toLowerCase()}%`;
      query = query.where((builder) => {
        builder
          .whereRaw("lower(u.name) like ?", [term])
          .orWhereRaw("lower(u.username) like ?", [term])
          .orWhereRaw("lower(coalesce(u.nis, '')) like ?", [term])
          .orWhereRaw("lower(coalesce(u.nip, '')) like ?", [term])
          .orWhereRaw("lower(coalesce(u.email, '')) like ?", [term]);
      });
    }

    const [{ count }] = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct("u.id as count");
    const rows = await query
      .orderBy("u.created_at", "desc")
      .limit(limit)
      .offset((page - 1) * limit);

    res.json({
      data: rows.map(normalizeUser),
      meta: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const body = req.validated.body;
    const existing = await db("users")
      .whereRaw("lower(username) = lower(?)", [body.username])
      .first();
    if (existing)
      return next({ status: 409, message: "Username sudah digunakan" });

    const passwordHash = await bcrypt.hash(body.password, 10);
    const [user] = await db("users")
      .insert({
        role: body.role,
        username: body.username,
        password_hash: passwordHash,
        name: body.name,
        email: body.email || null,
        nis: body.role === "siswa" ? body.nis || body.username : null,
        nip: body.role !== "siswa" ? body.nip || body.username : null,
        must_change_password: true,
      })
      .returning("*");

    await syncRoleProfiles(user.id, body.role, body.kelas || body.className);
    const row = await usersBaseQuery().where("u.id", user.id).first();
    res.status(201).json(normalizeUser(row));
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const body = req.validated.body;
    const current = await db("users")
      .where({ id: req.validated.params.id })
      .first();
    if (!current)
      return next({ status: 404, message: "Pengguna tidak ditemukan" });

    if (
      body.username &&
      body.username.toLowerCase() !== current.username.toLowerCase()
    ) {
      const existing = await db("users")
        .whereRaw("lower(username) = lower(?)", [body.username])
        .first();
      if (existing)
        return next({ status: 409, message: "Username sudah digunakan" });
    }

    const nextRole = body.role || current.role;
    const updates = {};
    for (const key of ["name", "username", "email"]) {
      if (Object.prototype.hasOwnProperty.call(body, key))
        updates[key] = body[key] || null;
    }
    if (body.role) updates.role = body.role;
    if (Object.prototype.hasOwnProperty.call(body, "isActive"))
      updates.is_active = body.isActive;
    if (Object.prototype.hasOwnProperty.call(body, "nis"))
      updates.nis = nextRole === "siswa" ? body.nis || null : null;
    if (Object.prototype.hasOwnProperty.call(body, "nip"))
      updates.nip = nextRole !== "siswa" ? body.nip || null : null;
    if (body.password) {
      updates.password_hash = await bcrypt.hash(body.password, 10);
      updates.must_change_password = true;
    }
    updates.updated_at = new Date();

    if (Object.keys(updates).length > 0)
      await db("users").where({ id: current.id }).update(updates);
    if (body.role || body.kelas || body.className)
      await syncRoleProfiles(
        current.id,
        nextRole,
        body.kelas || body.className,
      );

    const row = await usersBaseQuery().where("u.id", current.id).first();
    res.json(normalizeUser(row));
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const updated = await db("users")
      .where({ id: req.validated.params.id })
      .update({ is_active: false, updated_at: new Date() });
    if (!updated)
      return next({ status: 404, message: "Pengguna tidak ditemukan" });
    res.json({ message: "Pengguna dinonaktifkan" });
  } catch (err) {
    next(err);
  }
}

export async function downloadImportTemplate(req, res, next) {
  try {
    const config = TEMPLATES[req.validated.query.role];
    if (!config) return next({ status: 400, message: "Role tidak dikenal" });
    const lines = [
      `# ${config.description} — E-Izin Siswa`,
      '# Hapus baris yang diawali "#" ini sebelum mengimpor. Isi data mulai baris ke-3.',
      config.headers.join(","),
      ...config.samples.map((row) => row.map(csvEscape).join(",")),
    ];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${config.filename}"`,
    );
    res.send(`\uFEFF${lines.join("\r\n")}`);
  } catch (err) {
    next(err);
  }
}

export async function exportUsersCsv(req, res, next) {
  try {
    const { role } = req.validated.query;
    let query = usersBaseQuery();
    if (role !== "all") query = query.where("u.role", role);
    const rows = await query.orderBy("u.role").orderBy("u.name");
    const lines = [
      [
        "Nama",
        "Username",
        "Peran",
        "NIS",
        "NIP",
        "Kelas",
        "Email",
        "Aktif",
      ].join(","),
      ...rows.map((row) =>
        [
          row.name,
          row.username,
          row.role,
          row.nis || "",
          row.nip || "",
          row.student_class_name || row.homeroom_class_name || "",
          row.email || "",
          row.is_active ? "ya" : "tidak",
        ]
          .map(csvEscape)
          .join(","),
      ),
    ];
    const suffix = role === "all" ? "semua" : role;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="pengguna_${suffix}.csv"`,
    );
    res.send(`\uFEFF${lines.join("\r\n")}`);
  } catch (err) {
    next(err);
  }
}

function pick(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim())
      return String(value).trim();
  }
  return "";
}

export async function importUsers(req, res, next) {
  try {
    if (!req.file)
      return next({ status: 400, message: "File excel wajib diupload" });
    const role = req.validated.query.role;
    const wb = XLSX.readFile(req.file.path);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);
    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const name = pick(row, ["name", "nama", "Nama"]);
      const nis = pick(row, ["nis", "NIS"]);
      const nip = pick(row, ["nip", "NIP"]);
      const username = role === "siswa" ? nis : nip;
      const className = pick(row, [
        "kelas",
        "class",
        "kelas_binaan",
        "Kelas",
        "KELAS",
      ]);
      const email = pick(row, ["email", "Email"]);
      const password =
        pick(row, ["password", "Password"]) || username || "password123";

      if (!name || !username) {
        skipped += 1;
        continue;
      }
      const existing = await db("users")
        .whereRaw("lower(username) = lower(?)", [username])
        .first();
      if (existing) {
        skipped += 1;
        continue;
      }

      const [user] = await db("users")
        .insert({
          role,
          username,
          password_hash: await bcrypt.hash(password, 10),
          name,
          email: email || null,
          nis: role === "siswa" ? username : null,
          nip: role !== "siswa" ? username : null,
          must_change_password: true,
        })
        .returning("*");
      await syncRoleProfiles(user.id, role, className);
      inserted += 1;
    }

    res.json({ message: "Import selesai", inserted, skipped });
  } catch (err) {
    next(err);
  }
}

export async function importStudents(req, res, next) {
  req.validated = { query: { role: "siswa" } };
  return importUsers(req, res, next);
}
