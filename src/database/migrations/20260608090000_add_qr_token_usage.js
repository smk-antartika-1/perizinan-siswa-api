/**
 * @param {import("knex").Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable("permission_qr_tokens", (t) => {
    t.timestamp("used_at");
    t.uuid("used_by_user_id").references("id").inTable("users");
  });

  await knex.schema.alterTable("permission_qr_tokens", (t) => {
    t.index(["token_hash", "used_at"], "permission_qr_tokens_hash_used_idx");
  });
}

/**
 * @param {import("knex").Knex} knex
 */
export async function down(knex) {
  await knex.schema.alterTable("permission_qr_tokens", (t) => {
    t.dropIndex(["token_hash", "used_at"], "permission_qr_tokens_hash_used_idx");
    t.dropColumn("used_by_user_id");
    t.dropColumn("used_at");
  });
}

