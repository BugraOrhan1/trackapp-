const { getSql } = require("./_lib/db");
const { getBearerToken, verifyAuthToken, json } = require("./_lib/auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const token = getBearerToken(event);
    if (!token) {
      return json(401, { error: "Geen token" });
    }

    const auth = verifyAuthToken(token);
    const report = JSON.parse(event.body || "{}");

    if (!report?.id || !report?.type || !report?.location || !report?.timestamp) {
      return json(400, { error: "Ongeldige melding" });
    }

    const sql = getSql();
    await sql`
      insert into reports (id, type, location, "timestamp", confirmed, owner_email, owner_id)
      values (
        ${report.id},
        ${report.type},
        ${JSON.stringify(report.location)}::jsonb,
        ${Number(report.timestamp)},
        ${Number(report.confirmed || 0)},
        ${auth.email},
        ${auth.sub}::uuid
      )
      on conflict (id) do nothing
    `;

    return json(201, { ok: true });
  } catch (error) {
    return json(401, { error: error.message || "Niet geautoriseerd" });
  }
};
