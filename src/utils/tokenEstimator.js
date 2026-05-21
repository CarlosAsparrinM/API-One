function estimateTokensFromText(text) {
  // Very rough heuristic: ~4 chars per token for English-ish text.
  // For Spanish/code it varies, but it's good enough for budgeting.
  const chars = String(text || '').length;
  return Math.ceil(chars / 4);
}

function estimateTokensFromMessages(messages) {
  if (!Array.isArray(messages)) {
    return 0;
  }
  let total = 0;
  for (const msg of messages) {
    // Overhead per message (role + formatting)
    total += 4;
    total += estimateTokensFromText(msg?.content || '');
  }
  return total;
}

module.exports = {
  estimateTokensFromText,
  estimateTokensFromMessages,
};
