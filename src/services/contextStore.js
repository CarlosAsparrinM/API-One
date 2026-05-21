class MemoryContextStore {
  constructor() {
    this.messagesByConversation = new Map();
    this.summariesByConversation = new Map();
  }

  async init() {
    return true;
  }

  async appendMessage(msg) {
    const { conversationId } = msg;
    if (!conversationId) {
      throw new Error('conversationId is required');
    }
    const list = this.messagesByConversation.get(conversationId) || [];
    if (msg.contentHash && list.some(m => m.contentHash === msg.contentHash)) {
      return null;
    }
    const stored = {
      id: `${conversationId}_${list.length + 1}`,
      archived: false,
      ...msg,
      createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
    };
    list.push(stored);
    this.messagesByConversation.set(conversationId, list);
    return stored;
  }

  async listMessages(conversationId, { limit = 100, includeArchived = false } = {}) {
    const list = this.messagesByConversation.get(conversationId) || [];
    const filtered = includeArchived ? list : list.filter(m => !m.archived);
    const slice = filtered.slice(Math.max(0, filtered.length - limit));
    return slice.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  async listAllMessages(conversationId, { includeArchived = false } = {}) {
    const list = this.messagesByConversation.get(conversationId) || [];
    const filtered = includeArchived ? list : list.filter(m => !m.archived);
    return filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  async archiveMessages(conversationId, predicateFn) {
    const list = this.messagesByConversation.get(conversationId) || [];
    let changed = 0;
    for (const m of list) {
      if (!m.archived && predicateFn(m)) {
        m.archived = true;
        changed += 1;
      }
    }
    this.messagesByConversation.set(conversationId, list);
    return changed;
  }

  async getLatestSummary(conversationId) {
    return this.summariesByConversation.get(conversationId) || null;
  }

  async saveSummary(conversationId, summary) {
    const payload = {
      conversationId,
      summary,
      updatedAt: new Date(),
    };
    this.summariesByConversation.set(conversationId, payload);
    return payload;
  }

  async resetConversation(conversationId) {
    this.messagesByConversation.delete(conversationId);
    this.summariesByConversation.delete(conversationId);
    return true;
  }
}

let storeInstance = null;

async function getContextStore() {
  if (!storeInstance) {
    storeInstance = new MemoryContextStore();
    await storeInstance.init();
  }

  return storeInstance;
}

module.exports = {
  getContextStore,
  MemoryContextStore,
};