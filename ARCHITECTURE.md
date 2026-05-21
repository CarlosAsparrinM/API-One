# Architecture - API-ONE

Technical architecture and system design of API-ONE.

## System Overview

```
┌─────────────────────────────────────────┐
│ Client Applications                      │
│ (Web apps, bots, scripts, tools)        │
└────────────────┬────────────────────────┘
                 │ HTTP (OpenAI compatible)
        ┌────────▼─────────────┐
        │ API-ONE Server       │
        │ :3000                │
        └────────┬─────────────┘
                 │
        ┌────────▼──────────────────────────┐
        │ Request Router                    │
        │ ├─ Authenticate (API key for `/v1` routes) │
        │ ├─ Validate request              │
        │ └─ Route to processor            │
        └────────┬───────────────────────────┘
                 │
        ┌────────▼──────────────────────────┐
        │ Request Processors                │
        │ ├─ Chat completion               │
        │ ├─ Embeddings                    │
        │ ├─ Conversation management       │
        │ └─ Health/stats                  │
        └────────┬───────────────────────────┘
                 │
        ┌────────▼──────────────────────────┐
        │ Optional Features                 │
        │ ├─ Context Manager                │
        │ │  └─ In-memory message store     │
        │ ├─ Embedding Service             │
        │ │  └─ Vector cache               │
        │ └─ Conversation Store            │
        │    └─ In-memory only             │
        └────────┬───────────────────────────┘
                 │
        ┌────────▼──────────────────────────┐
        │ Provider Manager                  │
        │ ├─ Route to best provider        │
        │ └─ Automatic fallback on failure │
        └────────┬───────────────────────────┘
                 │
     ┌───────────┼───────────┬────────────┬─────────┐
     │           │           │            │         │
  ┌──▼──┐    ┌──▼──┐    ┌───▼──┐    ┌───▼──┐
  │S.N. │    │Cereb│    │Groq  │    │Gemini│
  └──┬──┘    └──┬──┘    └───┬──┘    └───┬──┘
     │          │           │           │
     └──────────┼───────────┼───────────┘
                │           │
        (HTTP to provider APIs)
```

## Request Flow

### Chat Completion Flow

```
1. CLIENT REQUEST
   POST /v1/chat/completions
   {
     "model": "api-fallback",
     "messages": [...],
     "conversation_id": "chat-123"  // optional
   }
                ↓
2. REQUEST VALIDATION
  ├─ Check API key valid (only for `/v1` routes; `/health` and `/stats` are public)
   ├─ Check messages array non-empty
   └─ Parse request body
                ↓
3. CONTEXT PREPARATION (if enabled)
   ├─ Check if conversation_id provided
  ├─ Retrieve previous messages from in-memory store
   ├─ Generate embeddings for semantic retrieval
   ├─ Build context: [summary + recent + relevant]
   └─ Trim to token budget
                ↓
4. PROVIDER SELECTION
   ├─ Read AI_PROVIDER_PRIORITY
   ├─ Build fallback chain: [SambaNova → Cerebras → Groq → Gemini]
   └─ Try each in order
                ↓
5. PROVIDER ATTEMPT
   ├─ Format request for provider
   ├─ Add auth headers
   ├─ Call provider API
   ├─ On success → Store response, go to step 6
   ├─ On failure → Record error, try next provider (back to step 5)
   └─ All failed → Return error with fallback trace
                ↓
6. RESPONSE PROCESSING
   ├─ Extract answer from provider response
   ├─ Parse token usage
   ├─ Store assistant message (if context enabled)
   └─ Build metadata (provider used, latency, trace)
                ↓
7. CACHE/STORE (if enabled)
   ├─ Save user message to store
   ├─ Save assistant message to store
   ├─ Generate and cache embeddings
   └─ Mark messages as archived if needed
                ↓
8. CLIENT RESPONSE
   {
     "choices": [{
       "message": {
         "role": "assistant",
         "content": "..."
       }
     }],
     "metadata": {
       "provider": "sambanova",
       "request_latency_ms": 342,
       "fallback_trace": [...]
     }
   }
```

## Provider Fallback Chain

### Automatic Routing

```
Request arrives
    ↓
Try SambaNova (fastest)
    ├─ Success? ✓ Return response
    └─ Fail? (timeout/error/rate-limited)
         ↓
Try Cerebras (very fast)
    ├─ Success? ✓ Return response
    └─ Fail?
         ↓
Try Groq (reliable)
    ├─ Success? ✓ Return response
    └─ Fail?
         ↓
Try Gemini (most reliable)
    ├─ Success? ✓ Return response
    └─ Fail? ✗ Return error
```

## Context Management & Optional Features

### Memory Modes

**Stateless (Default)**
- No conversation memory
- Each request is independent
- Lowest latency
- Best for quick queries

**Stateful (Optional)**
- Conversation memory enabled
- Automatic context retrieval
- Semantic search with embeddings
- Best for multi-turn conversations

### Embedding & Vector Cache

```
Message: "What is AI?"
    ↓
Generate embedding (if not cached)
    ├─ Check LRU cache
    └─ If miss → call configured provider via Provider Manager (Gemini commonly used for embeddings)
       ↓
Cache in memory (max 2000 vectors)
    ↓
Use for semantic search on future queries
```

### Auto-Summarization

When conversation grows:
- Triggers at 12k tokens
- Creates summary of old messages
- Keeps recent 10 messages
- Archives older messages
- Reduces context overhead

## Performance Profile

| Operation | Latency | Notes |
|-----------|---------|-------|
| Stateless chat | 200-1200ms | Depends on provider |
| Stateful chat | 300-1300ms | +context retrieval |
| Embeddings | 100-400ms | Uses Gemini |
| Context retrieval | 10-50ms | In-memory search |

## Error Handling & Fallback

```
Request to Provider A fails
    ↓
Log failure with reason
    ↓
Try Provider B
    ├─ Success → Return response
    └─ Fail → Try Provider C
       ├─ Success → Return response
       └─ Fail → Try Provider D
          ├─ Success → Return response
          └─ Fail → Return error with trace
```

Response always includes fallback_trace showing what was tried.

## Data Storage

### In-Memory (default)
- Fast
- No persistence (resets on restart)
- `CONTEXT_STORE=memory` is the only supported mode right now

Note: Persistent storage (e.g., MongoDB) has been removed from this codebase; there is no active Mongo integration.

## Configuration Hierarchy

```
1. Environment variables (.env)
2. Configuration files (modelCatalog.js)
3. Hardcoded defaults (in code)
```

Most important settings:
- `AI_PROVIDER_PRIORITY` - Fallback order
- `CONTEXT_ENABLED` - Enable/disable memory
- `CONTEXT_STORE` - Use `memory`; other values disable the memory flow

Rate limiting: provider-side quotas are external and informative; the server enforces a global per-API-key rate limit via `src/middleware/rateLimit.js` configured with `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`.

For detailed configuration, see the configuration section in [README.md](README.md#configuraci%C3%B3n-m%C3%ADnima-recomendada)
