const bcrypt = require("bcryptjs");

// Shared by the server and the explicit migration; never accepts plaintext as a hash.
const PASSWORD_COST = 12;
function isPasswordHash(value) {
  return typeof value === "string" && value.length === 60 && /^\$2[ab]\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$/.test(value);
}
function validPasswordLength(password) {
  return typeof password === "string" && password.length > 0 && Buffer.byteLength(password, "utf8") <= 72;
}
async function hashPassword(password) {
  if (!validPasswordLength(password)) throw new Error("PASSWORD_LENGTH_INVALID");
  return bcrypt.hash(password, PASSWORD_COST);
}
async function verifyPassword(password, storedHash) {
  if (!validPasswordLength(password) || !isPasswordHash(storedHash)) return false;
  return bcrypt.compare(password, storedHash);
}
module.exports = { PASSWORD_COST, isPasswordHash, validPasswordLength, hashPassword, verifyPassword };
