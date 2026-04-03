const { getSql } = require("./_lib/db");
const { getBearerToken, verifyAuthToken, json } = require("./_lib/auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "PATCH") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const token = getBearerToken(event);
    if (!token) {
      return json(401, { error: "Geen token" });
    }

    const auth = verifyAuthToken(token);
    const reportId = event.queryStringParameters?.id;
    const body = JSON.parse(event.body || "{}");

    if (!reportId) {
      return json(400, { error: "Report id ontbreekt" });
    }

    const sql = getSql();
    const updated = await sql`
      update reports
      set confirmed = ${Number(body.confirmed || 0)}
      where id = ${reportId}
        and owner_id = ${auth.sub}::uuid
      returning id
    `;

    if (updated.length === 0) {
      return json(403, { error: "Alleen eigenaar kan wijzigen" });
    }

    return json(200, { ok: true });
  } catch (error) {
    return json(401, { error: error.message || "Niet geautoriseerd" });
  }
};
