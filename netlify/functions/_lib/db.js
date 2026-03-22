const { neon } = require("@neondatabase/serverless");

function getSql() {
  const databaseUrl = process.env.NEON_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("NEON_DATABASE_URL ontbreekt");
  }

  return neon(databaseUrl);
}

module.exports = { getSql };
