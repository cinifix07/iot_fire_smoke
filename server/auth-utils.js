const crypto = require("crypto");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  if (typeof storedHash !== "string" || !storedHash.startsWith("scrypt$")) {
    return false;
  }

  const parts = storedHash.split("$");
  if (parts.length !== 3) {
    return false;
  }

  const [, salt, expected] = parts;
  const derivedKey = crypto.scryptSync(String(password), salt, 64).toString("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const derivedBuffer = Buffer.from(derivedKey, "hex");

  if (expectedBuffer.length !== derivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, derivedBuffer);
}

module.exports = {
  hashPassword,
  verifyPassword,
};
