import bcrypt from "bcryptjs";
import XLSX from "xlsx";
import { db } from "../../config/db.js";
import { loadClassMap, normalizeClassName, resolveClassId } from "../../utils/classes.js";

const TEMPLATES = {
  siswa: {
    filename: "template_import_siswa.xlsx",
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
    filename: "template_import_walikelas.xlsx",
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
    filename: "template_import_gurupiket.xlsx",
    description: "Template import data Guru Piket",
    headers: ["nama", "nip", "email", "password"],
    samples: [["Pak Andi Wijaya", "NIP-G01", "andi@sekolah.id", "password"]],
  },
  security: {
    filename: "template_import_security.xlsx",
    description: "Template import data Security / Penjaga Gerbang",
    headers: ["nama", "nip", "email", "password"],
    samples: [["Pak Slamet", "SCR-001", "slamet@sekolah.id", "password"]],
  },
  admin: {
    filename: "template_import_admin.xlsx",
    description: "Template import data Administrator",
    headers: ["nama", "nip", "email", "password"],
    samples: [["Admin IT", "ADM-001", "admin@sekolah.id", "password"]],
  },
};

function sendWorkbook(res, workbook, filename) {
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
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
    classId: row.student_class_id || row.homeroom_class_id || null,
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
      "sc.id as student_class_id",
      "sc.name as student_class_name",
      "hc.id as homeroom_class_id",
      "hc.name as homeroom_class_name",
    );
}

async function syncRoleProfiles(userId, role, { classId, className } = {}) {
  await db("student_profiles").where({ user_id: userId }).del();
  await db("class_homeroom_teachers").where({ teacher_user_id: userId }).del();

  const resolvedClassId =
    classId ?? (className ? await resolveClassId(className) : null);

  if (role === "siswa") {
    if (resolvedClassId)
      await db("student_profiles").insert({
        user_id: userId,
        class_id: resolvedClassId,
      });
  }

  if (role === "wali_kelas") {
    if (resolvedClassId) {
      await db("class_homeroom_teachers")
        .insert({ class_id: resolvedClassId, teacher_user_id: userId })
        .onConflict(["class_id", "teacher_user_id"])
        .ignore();
    }
  }
}

function applyUserListFilters(query, { role, classId, search }) {
  if (role && role !== "all") query = query.where("u.role", role);
  if (classId) {
    query = query.where((builder) => {
      builder
        .where("sp.class_id", classId)
        .orWhere("cht.class_id", classId);
    });
  }
  if (search) {
    const term = `%${search.toLowerCase()}%`;
    query = query.where((builder) => {
      builder
        .whereRaw("lower(u.name) like ?", [term])
        .orWhereRaw("lower(u.username) like ?", [term])
        .orWhereRaw("lower(coalesce(u.nis, '')) like ?", [term])
        .orWhereRaw("lower(coalesce(u.nip, '')) like ?", [term])
        .orWhereRaw("lower(coalesce(u.email, '')) like ?", [term])
        .orWhereRaw("lower(coalesce(sc.name, '')) like ?", [term])
        .orWhereRaw("lower(coalesce(hc.name, '')) like ?", [term]);
    });
  }
  return query;
}

const SORT_COLUMNS = {
  name: "u.name",
  username: "u.username",
  created_at: "u.created_at",
};

/** Admin → Guru Piket → Security → Wali Kelas → Siswa */
const ROLE_SORT_SQL = `
  CASE u.role
    WHEN 'admin' THEN 1
    WHEN 'guru_piket' THEN 2
    WHEN 'security' THEN 3
    WHEN 'wali_kelas' THEN 4
    WHEN 'siswa' THEN 5
    ELSE 6
  END
`;

function applyUserListSort(query, { sort, order }) {
  if (sort === "role") {
    const direction = order === "desc" ? "DESC" : "ASC";
    return query
      .orderByRaw(`${ROLE_SORT_SQL} ${direction}`)
      .orderBy("u.name", "asc");
  }
  const sortColumn = SORT_COLUMNS[sort] || SORT_COLUMNS.name;
  return query.orderBy(sortColumn, order);
}

export async function listUsers(req, res, next) {
  try {
    const { role, classId, search, page, limit, sort, order } =
      req.validated.query;
    let query = usersBaseQuery();
    query = applyUserListFilters(query, { role, classId, search });

    const [{ count }] = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct("u.id as count");

    query = applyUserListSort(query, { sort, order });
    const rows = await query
      .limit(limit)
      .offset((page - 1) * limit);

    const total = Number(count);
    res.json({
      data: rows.map(normalizeUser),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserStats(req, res, next) {
  try {
    const { classId } = req.validated.query;
    let query = usersBaseQuery();
    query = applyUserListFilters(query, { classId, role: null, search: null });

    const rows = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .select("u.role")
      .countDistinct("u.id as count")
      .groupBy("u.role");

    const byRole = rows.reduce((acc, row) => {
      acc[row.role] = Number(row.count);
      return acc;
    }, {});

    const total = Object.values(byRole).reduce((sum, n) => sum + n, 0);
    res.json({ total, byRole });
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

    await syncRoleProfiles(user.id, body.role, {
      classId: body.classId,
      className: body.kelas || body.className,
    });
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
    if (body.role || body.kelas || body.className || body.classId)
      await syncRoleProfiles(current.id, nextRole, {
        classId: body.classId,
        className: body.kelas || body.className,
      });

    const row = await usersBaseQuery().where("u.id", current.id).first();
    res.json(normalizeUser(row));
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    if (req.user?.id === req.validated.params.id) {
      return next({
        status: 403,
        message: "Tidak dapat menghapus akun Anda sendiri",
      });
    }

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
    const rows = config.samples.map((sample) =>
      Object.fromEntries(
        config.headers.map((header, index) => [header, sample[index] || ""]),
      ),
    );
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows, { header: config.headers });
    XLSX.utils.sheet_add_aoa(
      ws,
      [[`${config.description} - E-Izin Siswa`]],
      { origin: "G1" },
    );
    XLSX.utils.book_append_sheet(wb, ws, "template");
    sendWorkbook(res, wb, config.filename);
  } catch (err) {
    next(err);
  }
}

export async function exportUsersXlsx(req, res, next) {
  try {
    const { role } = req.validated.query;
    let query = usersBaseQuery();
    if (role !== "all") query = query.where("u.role", role);
    const rows = await query.orderBy("u.role").orderBy("u.name");
    const suffix = role === "all" ? "semua" : role;
    const data = rows.map((row) => ({
      Nama: row.name,
      Username: row.username,
      Peran: row.role,
      NIS: row.nis || "",
      NIP: row.nip || "",
      Kelas: row.student_class_name || row.homeroom_class_name || "",
      Email: row.email || "",
      Aktif: row.is_active ? "ya" : "tidak",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data, {
      header: [
        "Nama",
        "Username",
        "Peran",
        "NIS",
        "NIP",
        "Kelas",
        "Email",
        "Aktif",
      ],
    });
    XLSX.utils.book_append_sheet(wb, ws, "pengguna");
    sendWorkbook(res, wb, `pengguna_${suffix}.xlsx`);
  } catch (err) {
    next(err);
  }
}

export function ensureXlsxFile(req, _res, next) {
  if (!req.file) return next();
  const fileName = req.file?.originalname || "";
  if (!fileName.toLowerCase().endsWith(".xlsx")) {
    return next({
      status: 400,
      message: "File wajib berformat .xlsx",
    });
  }
  return next();
}

function pick(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim())
      return String(value).trim();
  }
  return "";
}

function readImportRows(filePath) {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws);
}

const CLASS_REQUIRED_ROLES = new Set(["siswa", "wali_kelas"]);

function toImportPreviewRow(row, index, role, classMap) {
  const nis = pick(row, ["nis", "NIS"]);
  const nip = pick(row, ["nip", "NIP"]);
  const identifier = role === "siswa" ? nis : nip;
  const kelasRaw = pick(row, ["kelas", "class", "kelas_binaan", "Kelas", "KELAS"]);
  let kelasStatus = "not_required";
  let classId = null;

  if (CLASS_REQUIRED_ROLES.has(role)) {
    if (!kelasRaw) {
      kelasStatus = "missing";
    } else {
      const normalized = normalizeClassName(kelasRaw).toLowerCase();
      const found = classMap.get(normalized);
      if (found) {
        kelasStatus = "matched";
        classId = found;
      } else {
        kelasStatus = "missing";
      }
    }
  }

  return {
    no: index + 1,
    nama: pick(row, ["name", "nama", "Nama"]),
    identifier,
    kelas: kelasRaw,
    kelasStatus,
    classId,
    email: pick(row, ["email", "Email"]),
  };
}

export async function previewImportUsers(req, res, next) {
  try {
    if (!req.file)
      return next({ status: 400, message: "File excel wajib diupload" });
    const role = req.validated.query.role;
    const rows = readImportRows(req.file.path);
    const classMap = await loadClassMap();
    const previewRows = rows.map((row, index) =>
      toImportPreviewRow(row, index, role, classMap),
    );

    const unknownClasses = [
      ...new Set(
        previewRows
          .filter((r) => r.kelasStatus === "missing" && r.kelas)
          .map((r) => r.kelas),
      ),
    ];
    const summary = {
      matched: previewRows.filter((r) => r.kelasStatus === "matched").length,
      missing: previewRows.filter((r) => r.kelasStatus === "missing").length,
      notRequired: previewRows.filter((r) => r.kelasStatus === "not_required").length,
    };

    res.json({
      totalRows: rows.length,
      rows: previewRows,
      unknownClasses,
      summary,
    });
  } catch (err) {
    next(err);
  }
}

export async function importUsers(req, res, next) {
  try {
    if (!req.file)
      return next({ status: 400, message: "File excel wajib diupload" });
    const role = req.validated.query.role;
    const rows = readImportRows(req.file.path);
    const classMap = await loadClassMap();
    let inserted = 0;
    let skipped = 0;
    let skippedUnknownClass = 0;

    for (const row of rows) {
      const name = pick(row, ["name", "nama", "Nama"]);
      const nis = pick(row, ["nis", "NIS"]);
      const nip = pick(row, ["nip", "NIP"]);
      const username = role === "siswa" ? nis : nip;
      const kelasRaw = pick(row, ["kelas", "class", "kelas_binaan", "Kelas", "KELAS"]);
      const email = pick(row, ["email", "Email"]);
      const password =
        pick(row, ["password", "Password"]) || username || "password123";

      if (!name || !username) {
        skipped += 1;
        continue;
      }

      if (CLASS_REQUIRED_ROLES.has(role)) {
        const normalized = normalizeClassName(kelasRaw).toLowerCase();
        const classId = normalized ? classMap.get(normalized) : null;
        if (!classId) {
          skipped += 1;
          skippedUnknownClass += 1;
          continue;
        }
      }

      const existing = await db("users")
        .whereRaw("lower(username) = lower(?)", [username])
        .first();
      if (existing) {
        skipped += 1;
        continue;
      }

      const normalizedKelas = normalizeClassName(kelasRaw).toLowerCase();
      const resolvedClassId = classMap.get(normalizedKelas) ?? null;

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
      await syncRoleProfiles(user.id, role, { classId: resolvedClassId });
      inserted += 1;
    }

    res.json({
      message: "Import selesai",
      inserted,
      skipped,
      skippedReasons: { unknownClass: skippedUnknownClass },
    });
  } catch (err) {
    next(err);
  }
}

export async function importStudents(req, res, next) {
  req.validated = { query: { role: "siswa" } };
  return importUsers(req, res, next);
}
