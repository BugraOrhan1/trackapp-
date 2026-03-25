const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const BASE_PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DB_PATH = path.join(ROOT, "local-db.json");
const JWT_SECRET = process.env.JWT_SECRET || "dev-local-secret-change-me";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function ensureDb() {
  if (fs.existsSync(DB_PATH)) {
    return;
  }

  const initial = {
    users: [],
    reports: [],
    lastUserId: 0,
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), "utf8");
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error("Request body te groot"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Ongeldige JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return auth.slice(7).trim();
}

function verifyAuth(req) {
  const token = getBearerToken(req);
  if (!token) {
    throw new Error("Geen token");
  }
  return jwt.verify(token, JWT_SECRET);
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      birth_date: user.birth_date,
      email_verified: user.email_verified,
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

async function handleApi(req, res, parsedUrl) {
  const route = parsedUrl.pathname;

  if (route === "/api/health-check" && req.method === "GET") {
    const db = readDb();
    return sendJson(res, 200, {
      status: "OK",
      mode: "local",
      users: db.users.length,
      reports: db.reports.length,
    });
  }

  if (route === "/api/auth-register" && req.method === "POST") {
    const body = await parseRequestBody(req);
    const { name, email, password, birthDate } = body;

    if (!name || !email || !password || !birthDate) {
      return sendJson(res, 400, { error: "Naam, e-mail, wachtwoord en geboortedatum zijn verplicht" });
    }
    if (String(password).length < 8) {
      return sendJson(res, 400, { error: "Wachtwoord moet minimaal 8 tekens zijn" });
    }

    const db = readDb();
    const normalizedEmail = String(email).toLowerCase().trim();
    if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      return sendJson(res, 409, { error: "E-mail bestaat al" });
    }

    const hash = await bcrypt.hash(password, 10);
    db.lastUserId += 1;
    const user = {
      id: String(db.lastUserId),
      name: String(name),
      email: normalizedEmail,
      password_hash: hash,
      birth_date: String(birthDate),
      email_verified: true,
      created_at: Date.now(),
    };
    db.users.push(user);
    writeDb(db);

    return sendJson(res, 201, {
      ok: true,
      message: "Ingelogd!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  }

  if (route === "/api/auth-login" && req.method === "POST") {
    const body = await parseRequestBody(req);
    const { email, password } = body;

    if (!email || !password) {
      return sendJson(res, 400, { error: "E-mail en wachtwoord zijn verplicht" });
    }

    const db = readDb();
    const normalizedEmail = String(email).toLowerCase().trim();
    const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      return sendJson(res, 401, { error: "Onjuiste inloggegevens" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return sendJson(res, 401, { error: "Onjuiste inloggegevens" });
    }

    const token = signToken(user);
    return sendJson(res, 200, {
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
  }

  if (route === "/api/auth-me" && req.method === "GET") {
    try {
      const payload = verifyAuth(req);
      return sendJson(res, 200, {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        birth_date: payload.birth_date,
        email_verified: payload.email_verified,
      });
    } catch {
      return sendJson(res, 401, { error: "Ongeldige sessie" });
    }
  }

  if (route === "/api/auth-logout" && req.method === "POST") {
    return sendJson(res, 200, { ok: true });
  }

  if (route === "/api/reports-list" && req.method === "GET") {
    try {
      verifyAuth(req);
      const db = readDb();
      const reports = [...db.reports].sort((a, b) => Number(b.timestamp) - Number(a.timestamp)).slice(0, 400);
      return sendJson(res, 200, reports);
    } catch {
      return sendJson(res, 401, { error: "Niet geautoriseerd" });
    }
  }

  if (route === "/api/reports-create" && req.method === "POST") {
    try {
      const auth = verifyAuth(req);
      const body = await parseRequestBody(req);
      if (!body?.id || !body?.type || !body?.location || !body?.timestamp) {
        return sendJson(res, 400, { error: "Ongeldige melding" });
      }

      const db = readDb();
      const exists = db.reports.some((r) => r.id === body.id);
      if (!exists) {
        db.reports.push({
          id: String(body.id),
          type: String(body.type),
          location: body.location,
          timestamp: Number(body.timestamp),
          confirmed: Number(body.confirmed || 0),
          owner_email: auth.email,
          owner_id: String(auth.sub),
        });
        writeDb(db);
      }

      return sendJson(res, 201, { ok: true });
    } catch (error) {
      return sendJson(res, 401, { error: error.message || "Niet geautoriseerd" });
    }
  }

  if (route === "/api/reports-update" && req.method === "PATCH") {
    try {
      const auth = verifyAuth(req);
      const reportId = parsedUrl.query.id;
      if (!reportId) {
        return sendJson(res, 400, { error: "Report id ontbreekt" });
      }

      const body = await parseRequestBody(req);
      const db = readDb();
      const report = db.reports.find((r) => r.id === String(reportId));
      if (!report || String(report.owner_id) !== String(auth.sub)) {
        return sendJson(res, 403, { error: "Alleen eigenaar kan wijzigen" });
      }

      report.confirmed = Number(body.confirmed || 0);
      writeDb(db);
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      return sendJson(res, 401, { error: error.message || "Niet geautoriseerd" });
    }
  }

  if (route === "/api/reports-delete" && req.method === "DELETE") {
    try {
      const auth = verifyAuth(req);
      const reportId = parsedUrl.query.id;
      if (!reportId) {
        return sendJson(res, 400, { error: "Report id ontbreekt" });
      }

      const db = readDb();
      const idx = db.reports.findIndex((r) => r.id === String(reportId));
      if (idx < 0 || String(db.reports[idx].owner_id) !== String(auth.sub)) {
        return sendJson(res, 403, { error: "Alleen eigenaar kan verwijderen" });
      }

      db.reports.splice(idx, 1);
      writeDb(db);
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      return sendJson(res, 401, { error: error.message || "Niet geautoriseerd" });
    }
  }

  return sendJson(res, 404, { error: "Route niet gevonden" });
}

function serveStatic(req, res, parsedUrl) {
  let pathname = parsedUrl.pathname;
  if (pathname === "/") {
    pathname = "/index.html";
  }

  const safePath = path.normalize(pathname).replace(/^([.][.][/\\])+/, "");
  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  try {
    if (parsedUrl.pathname.startsWith("/api/")) {
      await handleApi(req, res, parsedUrl);
      return;
    }
    serveStatic(req, res, parsedUrl);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Serverfout" });
  }
});

function startServer(port, attemptsLeft = 10) {
  server.listen(port, () => {
    ensureDb();
    console.log(`Local server gestart op http://localhost:${port}`);
    console.log("API base URL: /api");
  });

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      const nextPort = port + 1;
      console.warn(`Poort ${port} is bezet, probeer ${nextPort}...`);
      setTimeout(() => startServer(nextPort, attemptsLeft - 1), 150);
      return;
    }

    console.error("Server start mislukt:", error.message);
    process.exit(1);
  });
}

startServer(BASE_PORT);
