const crypto = require('crypto');

function sha256(input) {
  return crypto.createHash('sha256').update(String(input || '')).digest('hex');
}

function hashMessage(role, content) {
  return sha256(`${role || ''}\n${content || ''}`);
}

module.exports = {
  sha256,
  hashMessage,
};
