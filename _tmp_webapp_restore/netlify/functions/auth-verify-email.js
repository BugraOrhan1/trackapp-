const { getSql } = require("./_lib/db");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: "Method not allowed",
    };
  }

  try {
    const token = event.queryStringParameters?.token;
    if (!token) {
      return {
        statusCode: 400,
        body: "Token ontbreekt",
      };
    }

    const sql = getSql();
    const rows = await sql`
      update app_users
      set email_verified = true,
          verification_token = null,
          updated_at = now()
      where verification_token = ${token}
      returning id
    `;

    if (rows.length === 0) {
      return {
        statusCode: 400,
        body: "Ongeldige of verlopen verificatie-link",
      };
    }

    const redirectUrl = process.env.PUBLIC_APP_URL || process.env.URL || "/";
    return {
      statusCode: 302,
      headers: {
        Location: `${redirectUrl.replace(/\/$/, "")}/?verified=1`,
      },
      body: "",
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: `Verificatie mislukt: ${error.message || "Serverfout"}`,
    };
  }
};
