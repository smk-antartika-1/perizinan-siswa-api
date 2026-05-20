/**
 * @param {import("knex").Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable("users", (t) => {
    t.string("email");
  });

  await knex.schema.alterTable("permissions", (t) => {
    t.enu("category", ["sakit", "keperluan", "dispensasi", "lainnya"], {
      useNative: true,
      enumName: "permission_category",
    }).defaultTo("keperluan");
    t.string("nomor_polisi");
  });

  await knex.schema.createTable("permission_comments", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("permission_id").notNullable().references("id").inTable("permissions").onDelete("CASCADE");
    t.uuid("user_id").notNullable().references("id").inTable("users");
    t.text("text").notNullable();
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("notifications", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    t.string("title").notNullable();
    t.text("message").notNullable();
    t.enu("type", ["info", "warning", "success", "error"], {
      useNative: true,
      enumName: "notification_type",
    }).notNullable().defaultTo("info");
    t.uuid("permission_id").references("id").inTable("permissions").onDelete("SET NULL");
    t.timestamp("read_at");
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });
}

/**
 * @param {import("knex").Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("notifications");
  await knex.schema.dropTableIfExists("permission_comments");

  await knex.schema.alterTable("permissions", (t) => {
    t.dropColumn("nomor_polisi");
    t.dropColumn("category");
  });

  await knex.schema.alterTable("users", (t) => {
    t.dropColumn("email");
  });

  await knex.raw("DROP TYPE IF EXISTS notification_type");
  await knex.raw("DROP TYPE IF EXISTS permission_category");
}
