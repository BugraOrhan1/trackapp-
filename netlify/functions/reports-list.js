const { getSql } = require("./_lib/db");
const { getBearerToken, verifyAuthToken, json } = require("./_lib/auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const token = getBearerToken(event);
    if (!token) {
      return json(401, { error: "Geen token" });
    }

    verifyAuthToken(token);

    const sql = getSql();
    const reports = await sql`
      select id, type, location, "timestamp", confirmed, owner_email, owner_id
      from reports
      order by "timestamp" desc
      limit 400
    `;

    return json(200, reports);
  } catch {
    return json(401, { error: "Niet geautoriseerd" });
  }
};
