const { getSql } = require("./_lib/db");
const { comparePassword, signAuthToken, json } = require("./_lib/auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const { email, password } = JSON.parse(event.body || "{}");
    if (!email || !password) {
      return json(400, { error: "E-mail en wachtwoord zijn verplicht" });
    }

    const sql = getSql();
    const users = await sql`
      select id, name, email, birth_date, email_verified, password_hash
      from app_users
      where email = ${email}
      limit 1
    `;

    if (users.length === 0) {
      return json(401, { error: "Onjuiste inloggegevens" });
    }

    const user = users[0];
    const ok = await comparePassword(password, user.password_hash);
    if (!ok) {
      return json(401, { error: "Onjuiste inloggegevens" });
    }

    const token = signAuthToken(user);

    return json(200, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        birth_date: user.birth_date,
        email_verified: user.email_verified,
      },
      access_token: token,
      refresh_token: null,
    });
  } catch (error) {
    return json(500, { error: error.message || "Serverfout" });
  }
};
