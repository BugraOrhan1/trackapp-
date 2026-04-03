const { getSql } = require("./_lib/db");
const { hashPassword, randomToken, json } = require("./_lib/auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const sql = getSql();
    const { name, email, password, birthDate } = JSON.parse(event.body || "{}");

    if (!name || !email || !password || !birthDate) {
      return json(400, { error: "Naam, e-mail, wachtwoord en geboortedatum zijn verplicht" });
    }

    if (String(password).length < 8) {
      return json(400, { error: "Wachtwoord moet minimaal 8 tekens zijn" });
    }

    const existing = await sql`select id from app_users where email = ${email} limit 1`;
    if (existing.length > 0) {
      return json(409, { error: "E-mail bestaat al" });
    }

    const passwordHash = await hashPassword(password);

    const inserted = await sql`
      insert into app_users (name, email, password_hash, birth_date, email_verified)
      values (${name}, ${email}, ${passwordHash}, ${birthDate}, true)
      returning id, name, email
    `;

    return json(201, {
      ok: true,
      message: "Ingelogd!",
      user: inserted[0],
    });
  } catch (error) {
    return json(500, { error: error.message || "Serverfout" });
  }
};
