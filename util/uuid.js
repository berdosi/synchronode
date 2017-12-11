// note: not a standard UUID, which wouldn't provide any advantage, either
const crypt = require("crypto");
module.exports = () => crypt.randomBytes(16).toString("hex")