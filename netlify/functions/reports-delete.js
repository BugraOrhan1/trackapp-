const { getSql } = require("./_lib/db");
const { getBearerToken, verifyAuthToken, json } = require("./_lib/auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "DELETE") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const token = getBearerToken(event);
    if (!token) {
      return json(401, { error: "Geen token" });
    }

    const auth = verifyAuthToken(token);
    const reportId = event.queryStringParameters?.id;

    if (!reportId) {
      return json(400, { error: "Report id ontbreekt" });
    }

    const sql = getSql();
    const deleted = await sql`
      delete from reports
      where id = ${reportId}
        and owner_id = ${auth.sub}::uuid
      returning id
    `;

    if (deleted.length === 0) {
      return json(403, { error: "Alleen eigenaar kan verwijderen" });
    }

    return json(200, { ok: true });
  } catch (error) {
    return json(401, { error: error.message || "Niet geautoriseerd" });
  }
};
