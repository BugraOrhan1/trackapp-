const { verifyAuthToken, getBearerToken, json } = require("./_lib/auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const token = getBearerToken(event);
    if (!token) {
      return json(401, { error: "Geen token" });
    }

    const payload = verifyAuthToken(token);
    return json(200, {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      birth_date: payload.birth_date,
      email_verified: payload.email_verified,
    });
  } catch {
    return json(401, { error: "Ongeldige sessie" });
  }
};
