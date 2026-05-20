import bcrypt from "bcryptjs";

/**
 * @param {import("knex").Knex} knex
 */
export async function seed(knex) {
  await knex("notifications").del();
  await knex("entry_exit_logs").del();
  await knex("permission_qr_tokens").del();
  await knex("permission_documents").del();
  await knex("permission_comments").del();
  await knex("permission_approvals").del();
  await knex("permissions").del();
  await knex("class_homeroom_teachers").del();
  await knex("student_profiles").del();
  await knex("refresh_tokens").del();
  await knex("users").del();
  await knex("classes").del();

  const [xiiIpa1, xiiIps2] = await knex("classes")
    .insert([{ name: "XII IPA 1" }, { name: "XII IPS 2" }])
    .returning("*");

  const pass = await bcrypt.hash("password", 10);
  const nisPass = await bcrypt.hash("2024001", 10);

  const [wali, piket, security, admin, siswa] = await knex("users")
    .insert([
      {
        role: "wali_kelas",
        username: "NIP001",
        password_hash: pass,
        name: "Ibu Ratna",
        nip: "NIP001",
      },
      {
        role: "guru_piket",
        username: "NIP002",
        password_hash: pass,
        name: "Pak Andi",
        nip: "NIP002",
      },
      {
        role: "security",
        username: "SEC001",
        password_hash: pass,
        name: "Pak Slamet",
        nip: "SEC001",
      },
      {
        role: "admin",
        username: "ADM001",
        password_hash: pass,
        name: "Admin IT",
        nip: "ADM001",
      },
      {
        role: "siswa",
        username: "2024001",
        password_hash: nisPass,
        name: "Budi Santoso",
        nis: "2024001",
        must_change_password: true,
      },
    ])
    .returning("*");

  await knex("class_homeroom_teachers").insert({
    class_id: xiiIpa1.id,
    teacher_user_id: wali.id,
  });

  await knex("student_profiles").insert({
    user_id: siswa.id,
    class_id: xiiIpa1.id,
  });

  await knex("permissions").insert({
    student_user_id: siswa.id,
    class_id: xiiIpa1.id,
    type: "keluar_masuk",
    status: "pending_wali",
    reason: "Keperluan keluarga",
    departure_time: new Date(),
    estimated_return_time: new Date(Date.now() + 2 * 3600 * 1000),
  });
}
