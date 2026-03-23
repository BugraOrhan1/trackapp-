const { getSql } = require("./_lib/db");
const { json } = require("./_lib/auth");

exports.handler = async (event) => {
  try {
    console.log("Health check: Starting");
    console.log("Health check: NEON_DATABASE_URL exists?", !!process.env.NEON_DATABASE_URL);
    console.log("Health check: JWT_SECRET exists?", !!process.env.JWT_SECRET);

    const sql = getSql();
    console.log("Health check: Got SQL client, testing connection...");

    // Test query
    const result = await sql`SELECT NOW() as current_time`;
    console.log("Health check: Query successful");

    // Try to get table info
    const tables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log("Health check: Found tables:", tables.map(t => t.table_name));

    return json(200, {
      status: "OK",
      message: "Database connection successful",
      environment: {
        NEON_DATABASE_URL: process.env.NEON_DATABASE_URL ? "SET" : "MISSING",
        JWT_SECRET: process.env.JWT_SECRET ? "SET" : "MISSING",
      },
      database: {
        current_time: result[0].current_time,
        tables: tables.map(t => t.table_name),
      },
    });
  } catch (error) {
    console.error("Health check FAILED:", error.message);
    console.error("Stack:", error.stack);
    
    return json(500, {
      status: "ERROR",
      error: error.message,
      environment: {
        NEON_DATABASE_URL: process.env.NEON_DATABASE_URL ? "SET" : "MISSING",
        JWT_SECRET: process.env.JWT_SECRET ? "SET" : "MISSING",
      },
    });
  }
};
