/**
 * @param {import("knex").Knex} knex
 */
export async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.schema.createTable("classes", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.string("name").notNullable().unique();
    t.timestamps(true, true);
  });

  await knex.schema.createTable("users", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.enu("role", ["siswa", "wali_kelas", "guru_piket", "security", "admin"], { useNative: true, enumName: "user_role" }).notNullable();
    t.string("username").notNullable().unique();
    t.string("password_hash").notNullable();
    t.string("name").notNullable();
    t.string("nis");
    t.string("nip");
    t.string("avatar_url");
    t.boolean("must_change_password").notNullable().defaultTo(false);
    t.boolean("is_active").notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable("student_profiles", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("user_id").notNullable().unique().references("id").inTable("users").onDelete("CASCADE");
    t.uuid("class_id").notNullable().references("id").inTable("classes");
    t.string("nopol");
    t.timestamps(true, true);
  });

  await knex.schema.createTable("class_homeroom_teachers", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("class_id").notNullable().references("id").inTable("classes").onDelete("CASCADE");
    t.uuid("teacher_user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    t.unique(["class_id", "teacher_user_id"]);
    t.timestamps(true, true);
  });

  await knex.schema.createTable("permissions", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("student_user_id").notNullable().references("id").inTable("users");
    t.uuid("class_id").notNullable().references("id").inTable("classes");
    t.enu("type", ["keluar_masuk", "pulang_tidak_kembali"], { useNative: true, enumName: "permission_type" }).notNullable();
    t.enu("status", ["pending_wali", "approved_wali", "approved_piket", "rejected", "completed", "closed_no_return"], {
      useNative: true,
      enumName: "permission_status",
    }).notNullable();
    t.text("reason").notNullable();
    t.timestamp("departure_time").notNullable();
    t.timestamp("estimated_return_time");
    t.timestamp("actual_return_time");
    t.boolean("will_not_return").defaultTo(false);
    t.text("rejected_reason");
    t.timestamps(true, true);
  });

  await knex.schema.createTable("permission_approvals", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("permission_id").notNullable().references("id").inTable("permissions").onDelete("CASCADE");
    t.uuid("actor_user_id").notNullable().references("id").inTable("users");
    t.enu("actor_role", ["wali_kelas", "guru_piket", "admin"], { useNative: true, enumName: "approval_actor_role" }).notNullable();
    t.string("action").notNullable();
    t.string("note");
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("permission_documents", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("permission_id").notNullable().references("id").inTable("permissions").onDelete("CASCADE");
    t.string("file_path").notNullable();
    t.string("mime_type").notNullable();
    t.integer("file_size").notNullable();
    t.uuid("uploaded_by_user_id").notNullable().references("id").inTable("users");
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("permission_qr_tokens", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("permission_id").notNullable().references("id").inTable("permissions").onDelete("CASCADE");
    t.string("token_hash").notNullable();
    t.timestamp("expires_at").notNullable();
    t.timestamp("revoked_at");
    t.uuid("generated_by_user_id").notNullable().references("id").inTable("users");
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("refresh_tokens", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    t.string("token_hash").notNullable();
    t.timestamp("expires_at").notNullable();
    t.timestamp("revoked_at");
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("entry_exit_logs", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("permission_id").notNullable().references("id").inTable("permissions").onDelete("CASCADE");
    t.uuid("student_user_id").notNullable().references("id").inTable("users");
    t.uuid("class_id").notNullable().references("id").inTable("classes");
    t.string("action").notNullable();
    t.uuid("acted_by_user_id").references("id").inTable("users");
    t.string("note");
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });
}

/**
 * @param {import("knex").Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("entry_exit_logs");
  await knex.schema.dropTableIfExists("refresh_tokens");
  await knex.schema.dropTableIfExists("permission_qr_tokens");
  await knex.schema.dropTableIfExists("permission_documents");
  await knex.schema.dropTableIfExists("permission_approvals");
  await knex.schema.dropTableIfExists("permissions");
  await knex.schema.dropTableIfExists("class_homeroom_teachers");
  await knex.schema.dropTableIfExists("student_profiles");
  await knex.schema.dropTableIfExists("users");
  await knex.schema.dropTableIfExists("classes");
}
