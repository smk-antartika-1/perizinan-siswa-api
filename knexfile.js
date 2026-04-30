import "dotenv/config";

const base = {
  client: "pg",
  connection: process.env.DATABASE_URL,
  migrations: {
    directory: "./src/database/migrations",
    extension: "js",
  },
  seeds: {
    directory: "./src/database/seeds",
    extension: "js",
  },
};

export default {
  development: base,
  production: base,
};
