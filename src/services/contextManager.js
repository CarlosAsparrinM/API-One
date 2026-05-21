const crypto = require('crypto');
const logger = require('../utils/logger');
const { getContextStore } = require('./contextStore');
const { getEmbeddingService } = require('./embeddingService');
const { hashMessage } = require('../utils/contentHash');
const { cosineSimilarity } = require('../utils/similarity');
const { estimateTokensFromMessages, estimateTokensFromText } = require('../utils/tokenEstimator');
const { getProviderManager } = require('./providerManager');

function isEnabled() {
  return String(process.env.CONTEXT_ENABLED || 'false').toLowerCase() === 'true';
}

function getStoreMode() {
  return String(process.env.CONTEXT_STORE || 'memory').toLowerCase();
}

function isMemoryStoreEnabled() {
  return getStoreMode() === 'memory';
}

function normalizeConversationId(value) {
  const v = String(value || '').trim();
  if (!v) {
    return null;
  }
  // Keep it URL/header safe
  return v.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 128) || null;
}

function extractConversationId(req) {
  return (
    normalizeConversationId(req?.body?.conversation_id) ||
    normalizeConversationId(req?.headers?.['x-conversation-id']) ||
    null
  );
}

function generateConversationId() {
  return `conv_${crypto.randomUUID()}`;
}

function pickCurrentUserMessage(messages) {
  if (!Array.isArray(messages)) {
    return null;
  }
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role === 'user' && typeof m.content === 'string' && m.content.trim()) {
      return m;
    }
  }
  return null;
}

function dedupeByHash(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = it.contentHash || hashMessage(it.role, it.content);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(it);
  }
  return out;
}

function buildMessageList({ clientSystemMessages, summaryText, selectedHistory, currentUser }) {
  const messages = [];

  // Keep client system messages first (preserve user config/instructions)
  for (const s of clientSystemMessages) {
    messages.push({ role: 'system', content: String(s.content || '') });
  }

  if (summaryText) {
    messages.push({
      role: 'system',
      content: `Conversation memory (summary):\n${summaryText}`,
    });
  }

  for (const h of selectedHistory) {
    // only user/assistant messages here
    messages.push({ role: h.role, content: h.content });
  }

  messages.push({ role: 'user', content: currentUser.content });
  return messages;
}

function trimToTokenBudget(messages, maxTokens) {
  if (!Array.isArray(messages)) {
    return messages;
  }
  let estimate = estimateTokensFromMessages(messages);
  if (estimate <= maxTokens) {
    return messages;
  }

  // Keep: all system messages + last user message.
  const systemMessages = messages.filter(m => m.role === 'system');
  const lastUser = messages[messages.length - 1];

  // Candidates are the middle (history)
  const history = messages.slice(systemMessages.length, messages.length - 1);

  // Drop older history first
  const trimmedHistory = [];
  for (let i = history.length - 1; i >= 0; i--) {
    trimmedHistory.unshift(history[i]);
    const candidate = [...systemMessages, ...trimmedHistory, lastUser];
    estimate = estimateTokensFromMessages(candidate);
    if (estimate > maxTokens) {
      trimmedHistory.shift();
      break;
    }
  }

  const result = [...systemMessages, ...trimmedHistory, lastUser];
  return result;
}

async function embedIfNeeded(embeddingService, conversationId, msg) {
  const embedOnWrite = String(process.env.CONTEXT_EMBED_ON_WRITE || 'true').toLowerCase() === 'true';
  if (!embedOnWrite) {
    return msg;
  }

  const roles = String(process.env.CONTEXT_EMBED_ROLES || 'user,assistant')
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);

  if (!roles.includes(msg.role)) {
    return msg;
  }

  const content = String(msg.content || '').trim();
  if (!content) {
    return msg;
  }

  const embedding = await embeddingService.embedText(content);
  return {
    ...msg,
    conversationId,
    embedding: embedding || undefined,
  };
}

async function storeIncomingMessages(conversationId, messages) {
  const store = await getContextStore();
  const embeddingService = getEmbeddingService();

  if (!Array.isArray(messages) || messages.length === 0) {
    return;
  }

  // Store all non-system messages from client (dedup by content hash)
  for (const m of messages) {
    if (!m || !m.role || typeof m.content !== 'string') {
      continue;
    }
    if (m.role === 'system') {
      continue;
    }

    const base = {
      conversationId,
      role: m.role,
      content: m.content,
      source: 'client',
      contentHash: hashMessage(m.role, m.content),
      createdAt: new Date(),
    };

    const enriched = await embedIfNeeded(embeddingService, conversationId, base);
    await store.appendMessage(enriched);
  }
}

async function selectRelevantHistory(conversationId, queryText) {
  const store = await getContextStore();
  const embeddingService = getEmbeddingService();

  const recentLimit = Number(process.env.CONTEXT_RECENT_MESSAGES || 8);
  const topK = Number(process.env.CONTEXT_TOP_K_RELEVANT || 8);
  const minSim = Number(process.env.CONTEXT_MIN_SIMILARITY || 0.25);

  const recent = await store.listMessages(conversationId, { limit: recentLimit, includeArchived: false });

  const queryEmbedding = await embeddingService.embedText(queryText);
  let relevant = [];

  if (queryEmbedding) {
    // Pull a bounded set for scoring (avoid scanning huge conversations)
    const pool = await store.listMessages(conversationId, { limit: 300, includeArchived: false });

    relevant = pool
      .filter(m => (m.role === 'user' || m.role === 'assistant') && Array.isArray(m.embedding) && m.embedding.length > 0)
      .map(m => ({
        ...m,
        similarity: cosineSimilarity(queryEmbedding, m.embedding),
      }))
      .filter(m => m.similarity >= minSim)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  // Merge + dedupe
  const merged = dedupeByHash([...recent, ...relevant])
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return {
    selected: merged,
    recentCount: recent.length,
    relevantCount: relevant.length,
    hadEmbeddings: !!queryEmbedding,
  };
}

async function maybeSummarizeConversation(conversationId) {
  const store = await getContextStore();
  const triggerTokens = Number(process.env.CONTEXT_SUMMARY_TRIGGER_TOKENS || 12000);
  const keepRecent = Number(process.env.CONTEXT_SUMMARY_KEEP_RECENT || 10);
  const maxChars = Number(process.env.CONTEXT_SUMMARY_MAX_CHARS || 12000);

  const all = await store.listAllMessages(conversationId, { includeArchived: false });
  if (all.length <= keepRecent + 2) {
    return null;
  }

  const totalTokens = all.reduce((sum, m) => sum + estimateTokensFromText(m.content), 0);
  if (totalTokens < triggerTokens) {
    return null;
  }

  const toSummarize = all.slice(0, Math.max(0, all.length - keepRecent));
  const textBlock = toSummarize
    .map(m => `${m.role.toUpperCase()}: ${String(m.content || '').trim()}`)
    .join('\n')
    .slice(0, maxChars);

  const manager = getProviderManager();

  const summaryPrompt = [
    {
      role: 'system',
      content: 'You are a summarization engine. Create a compact, factual memory for future turns. Keep key decisions, requirements, and important facts. Avoid fluff.',
    },
    {
      role: 'user',
      content: `Summarize this conversation segment as bullet points + key facts:\n\n${textBlock}`,
    },
  ];

  try {
    const result = await manager.executeWithFallback('chat', {
      model: 'auto',
      messages: summaryPrompt,
      temperature: 0.2,
      maxTokens: 800,
    });

    const summaryText = String(result.response || '').trim();
    if (!summaryText) {
      return null;
    }

    await store.saveSummary(conversationId, summaryText);

    // Archive summarized messages
    const summarizedHashes = new Set(toSummarize.map(m => m.contentHash).filter(Boolean));
    await store.archiveMessages(conversationId, (m) => summarizedHashes.has(m.contentHash));

    logger.info(`✓ Conversation ${conversationId} summarized (${toSummarize.length} msgs archived)`);
    return summaryText;
  } catch (e) {
    logger.warn(`Summarization failed: ${e.message}`);
    return null;
  }
}

async function prepareChatMessages(req) {
  const enabled = isEnabled();
  const memoryStoreEnabled = isMemoryStoreEnabled();

  const inputMessages = Array.isArray(req?.body?.messages) ? req.body.messages : null;
  if (!inputMessages) {
    return {
      conversationId: null,
      messagesForModel: null,
      contextMeta: { enabled: false, store: getStoreMode() },
    };
  }

  const clientSystemMessages = inputMessages.filter(m => m?.role === 'system' && typeof m.content === 'string');
  const currentUser = pickCurrentUserMessage(inputMessages);

  // If there is no user message, don't do anything special
  if (!currentUser) {
    return {
      conversationId: null,
      messagesForModel: inputMessages,
      contextMeta: { enabled, store: getStoreMode(), reason: 'no_user_message' },
    };
  }

  let conversationId = extractConversationId(req);
  if (!conversationId) {
    const autoCreate = String(process.env.CONTEXT_AUTO_CREATE_CONVERSATION || 'false').toLowerCase() === 'true';
    if (!autoCreate) {
      // If not provided, keep stateless behavior (no persistence) by default.
      return {
        conversationId: null,
        messagesForModel: inputMessages,
        contextMeta: { enabled, store: getStoreMode(), reason: 'missing_conversation_id' },
      };
    }
    conversationId = generateConversationId();
  }

  if (!enabled || !memoryStoreEnabled) {
    return {
      conversationId,
      messagesForModel: inputMessages,
      contextMeta: {
        enabled: false,
        store: getStoreMode(),
        reason: !enabled ? 'context_disabled' : 'unsupported_store',
      },
    };
  }

  await storeIncomingMessages(conversationId, inputMessages);

  const store = await getContextStore();
  const summaryDoc = await store.getLatestSummary(conversationId);
  const summaryText = summaryDoc?.summary || null;

  const selection = await selectRelevantHistory(conversationId, currentUser.content);

  const maxPromptTokens = Number(process.env.CONTEXT_MAX_PROMPT_TOKENS || 6000);
  let messagesForModel = buildMessageList({
    clientSystemMessages,
    summaryText,
    selectedHistory: selection.selected,
    currentUser,
  });

  messagesForModel = trimToTokenBudget(messagesForModel, maxPromptTokens);

  return {
    conversationId,
    messagesForModel,
    contextMeta: {
      enabled: true,
      store: getStoreMode(),
      hadEmbeddings: selection.hadEmbeddings,
      recentUsed: selection.recentCount,
      relevantUsed: selection.relevantCount,
      selectedHistoryCount: selection.selected.length,
      tokenEstimate: estimateTokensFromMessages(messagesForModel),
      summaryPresent: !!summaryText,
    },
  };
}

async function persistAssistantTurn({ conversationId, assistantText }) {
  if (!conversationId || !isEnabled() || !isMemoryStoreEnabled()) {
    return;
  }
  const store = await getContextStore();
  const embeddingService = getEmbeddingService();

  const base = {
    conversationId,
    role: 'assistant',
    content: String(assistantText || ''),
    source: 'api',
    contentHash: hashMessage('assistant', String(assistantText || '')),
    createdAt: new Date(),
  };

  const enriched = await embedIfNeeded(store, embeddingService, conversationId, base);
  await store.appendMessage(enriched);

  // Summarize if needed
  await maybeSummarizeConversation(conversationId);
}

async function getConversationMessages(conversationId, { limit = 100, includeArchived = false } = {}) {
  const store = await getContextStore();
  return store.listMessages(conversationId, { limit, includeArchived });
}

async function getConversationSummary(conversationId) {
  const store = await getContextStore();
  return store.getLatestSummary(conversationId);
}

module.exports = {
  extractConversationId,
  generateConversationId,
  prepareChatMessages,
  persistAssistantTurn,
  getConversationMessages,
  getConversationSummary,
};
