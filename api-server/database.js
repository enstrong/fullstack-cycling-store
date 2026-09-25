const { Pool } = require("pg");
const fs = require("node:fs/promises");
const path = require("node:path");
function createPool() {
  return new Pool({
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
    idle_in_transaction_session_timeout: 15000,
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });
}
async function migrate(pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(724192)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)",
    );
    for (const name of [
      "001-accounts",
      "002-order-history",
      "003-order-images",
      "004-safety-constraints",
      "005-shipping-details",
      "006-product-research",
    ]) {
      const done = await client.query(
        "SELECT name FROM schema_migrations WHERE name=$1",
        [name],
      );
      if (!done.rowCount) {
        await client.query(
          await fs.readFile(
            path.join(__dirname, `migrations/${name}.sql`),
            "utf8",
          ),
        );
        if (name === "006-product-research") {
          const entries = JSON.parse(
            await fs.readFile(
              path.join(__dirname, "data/product-research.json"),
              "utf8",
            ),
          );
          for (const entry of entries) {
            await client.query(
              "UPDATE products SET research=$1,description=$2 WHERE name=$3",
              [
                JSON.stringify(entry.research),
                entry.research.description,
                entry.name,
              ],
            );
          }
        }
        await client.query("INSERT INTO schema_migrations(name) VALUES($1)", [
          name,
        ]);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
module.exports = { createPool, migrate };
