const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET ontbreekt");
  }
  return secret;
}

function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      birth_date: user.birth_date,
      email_verified: user.email_verified,
    },
    getJwtSecret(),
    { expiresIn: "30d" }
  );
}

function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function getBearerToken(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return header.slice(7).trim();
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function randomToken() {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

module.exports = {
  signAuthToken,
  verifyAuthToken,
  getBearerToken,
  hashPassword,
  comparePassword,
  randomToken,
  json,
};
