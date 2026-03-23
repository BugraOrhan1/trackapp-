const { getSql } = require("./_lib/db");
const { comparePassword, signAuthToken, json } = require("./_lib/auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    console.log("Login: Parsing body");
    const { email, password } = JSON.parse(event.body || "{}");
    if (!email || !password) {
      return json(400, { error: "E-mail en wachtwoord zijn verplicht" });
    }

    console.log("Login: Getting SQL client");
    const sql = getSql();
    console.log("Login: Querying user - email:", email);
    
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
    console.log("Login: User found, comparing password");
    
    const ok = await comparePassword(password, user.password_hash);
    if (!ok) {
      return json(401, { error: "Onjuiste inloggegevens" });
    }

    console.log("Login: Password OK, signing token");
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
    console.error("Login ERROR:", error.message);
    console.error("Login ERROR STACK:", error.stack);
    return json(500, { 
      error: error.message || "Serverfout",
      debug: error.message 
    });
  }
};
