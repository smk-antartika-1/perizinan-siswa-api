/**
 * @param {import("knex").Knex} knex
 */
export const config = { transaction: false };

/**
 * @param {import("knex").Knex} knex
 */
export async function up(knex) {
  await knex.raw(
    "ALTER TYPE permission_status ADD VALUE IF NOT EXISTS 'expired'",
  );
}

/**
 * @param {import("knex").Knex} knex
 */
export async function down(_knex) {
  // Enum values cannot be removed safely; no-op.
}
