# API-ONE — Referencia y Casos de Uso

API-ONE es un enrutador de múltiples proveedores de IA que expone una API compatible con OpenAI. Envía solicitudes a los proveedores configurados siguiendo una prioridad, y cambia automáticamente a un proveedor alternativo si el primero falla o está limitado.

**Autenticación:** Las rutas montadas bajo `/v1` requieren el encabezado `Authorization: Bearer <api_key>`.

Las rutas públicas (por ejemplo `/health` y `/stats`) no requieren autenticación.

```
Authorization: Bearer <api_key>
```

## Resumen rápido

- Endpoint base (modo local): `http://localhost:3000`
- Endpoints principales:
  - `POST /v1/chat/completions` — chat/completions (OpenAI compatible)
  - `POST /v1/embeddings` — generar embeddings
  - `GET /v1/models` — listar modelos disponibles
  - `GET /health` — health check
  - `GET /stats` — estadísticas de uso

## Características principales

- Soporte para múltiples proveedores (algunos proveedores ofrecen niveles gratuitos) con fallback automático.
- Interfaz compatible con clientes de OpenAI.
- Memoria de conversación configurable, en memoria.
- Generación de embeddings y búsqueda semántica (cuando esté configurado).

## Instalación y puesta en marcha

1. Instalar dependencias:

```bash
npm install
```

2. Copiar ejemplo de configuración y editar claves:

```bash
cp .env.example .env
# Rellena las claves para los proveedores que vayas a usar
```

3. Iniciar servidor:

```bash
npm start
```

El servidor quedará escuchando en `http://localhost:3000` por defecto.

## Configuración mínima recomendada

Ejemplo mínimo (un proveedor):

```env
API_AUTH_KEYS=dev-local-key-1
GEMINI_API_KEY=your_key
```

Ejemplo recomendado (todos los proveedores):

```env
API_AUTH_KEYS=dev-local-key-1
SAMBANOVA_API_KEY=your_key
CEREBRAS_API_KEY=your_key
GROQ_API_KEY=your_key
GEMINI_API_KEY=your_key
AI_PROVIDER_PRIORITY=sambanova,cerebras,groq,gemini
```

Perfil recomendado para memoria de conversación:

```env
CONTEXT_ENABLED=true
CONTEXT_STORE=memory
CONTEXT_AUTO_CREATE_CONVERSATION=false

CONTEXT_RECENT_MESSAGES=8
CONTEXT_TOP_K_RELEVANT=6
CONTEXT_MIN_SIMILARITY=0.28

CONTEXT_MAX_PROMPT_TOKENS=8000

CONTEXT_SUMMARY_TRIGGER_TOKENS=10000
CONTEXT_SUMMARY_KEEP_RECENT=10
CONTEXT_SUMMARY_MAX_CHARS=12000

CONTEXT_EMBEDDING_MODEL=auto
CONTEXT_EMBED_ON_WRITE=true
CONTEXT_EMBED_ROLES=user,assistant
CONTEXT_EMBED_MAX_CHARS=8000
```

Este perfil usa `CONTEXT_MAX_PROMPT_TOKENS=8000` como techo, no como consumo fijo. Si la conversación es corta, el contexto real será menor; si crece mucho, el sistema recorta o resume antes de enviar la solicitud al proveedor.

## Endpoints (detallado)

### POST /v1/chat/completions

Endpoint compatible con el estándar OpenAI para chat/completions. Este endpoint enruta la petición al proveedor configurado y devuelve un objeto con `choices`, `usage` y `metadata` que indica el proveedor usado y el `fallback_trace`.

Ejemplo de request (JSON — conservar tal cual para pruebas):
```json
{
  "model": "api-fallback",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant"
    },
    {
      "role": "user",
      "content": "What is machine learning?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2000,
  "top_p": 0.95,
  "conversation_id": "chat-123"
}
```

La respuesta incluye un bloque `metadata` similar al siguiente (ejemplo):
```json
{
  "metadata": {
    "provider": "sambanova",
    "request_latency_ms": 342,
    "fallback_trace": [
      {
        "provider": "sambanova",
        "status": "success",
        "latency_ms": 342
      }
    ]
  }
}
```

 
### GET /v1/models

Lista los modelos disponibles (normalmente `api-fallback`).

Ejemplo de respuesta:
```json
{
  "object": "list",
  "data": [
    {
      "id": "api-fallback",
      "object": "model",
      "created": 1684929600,
      "owned_by": "api-fallback",
      "description": "Automatic fallback across configured AI providers"
    }
  ]
}
```

### POST /v1/embeddings

Genera embeddings para texto. Request de ejemplo:
```json
{
  "model": "api-fallback",
  "input": "The quick brown fox jumps over the lazy dog",
  "encoding_format": "float"
}
```

Respuesta de ejemplo (mantener formato técnico sin traducir):
```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "embedding": [0.123, -0.456, 0.789, ...],
      "index": 0
    }
  ],
  "model": "api-fallback",
  "usage": {
    "prompt_tokens": 8,
    "total_tokens": 8
  }
}
```

### Conversation Memory

Cuando `CONTEXT_ENABLED=true` la API puede guardar mensajes por `conversation_id`. Endpoints útiles:

- `GET /v1/conversations/:conversation_id/messages` — recuperar mensajes de una conversación (paginado).
- `GET /v1/conversations/:conversation_id/summary` — obtener un resumen automático.

Cómo funciona en la práctica:

1. El cliente envía `conversation_id` en el body o en el header `x-conversation-id`.
2. La API guarda solo mensajes `user` y `assistant`; los `system` no se persisten.
3. Si `CONTEXT_EMBED_ON_WRITE=true`, cada mensaje elegible también genera un embedding para búsquedas semánticas.
4. En cada request, el sistema toma los mensajes recientes, añade los relevantes por similitud y, si existe, agrega el resumen previo.
5. Si el contexto supera `CONTEXT_MAX_PROMPT_TOKENS`, recorta la historia más antigua antes de llamar al proveedor.
6. Cuando la conversación crece demasiado, el sistema genera un resumen y archiva mensajes antiguos para mantener el contexto manejable.

Importante: con `CONTEXT_STORE=memory`, todo eso vive en RAM. Si reinicias el servidor, se pierde el historial.

Ejemplo de respuesta de mensajes:
```json
{
  "conversation_id": "chat-123",
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "What is AI?",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total_messages": 1,
  "summary": null
}
```

## Endpoints de sistema

### GET /stats

Devuelve estadísticas de uso y uso por proveedor. Ejemplo:
```json
{
  "uptime_ms": 3600000,
  "total_requests": 1250,
  "successful_requests": 1248,
  "failed_requests": 2,
  "provider_usage": {
    "sambanova": 800,
    "cerebras": 300,
    "groq": 120,
    "gemini": 30
  },
  "total_tokens": {
    "prompt": 45000,
    "completion": 35000,
    "total": 80000
  },
  "errors": [
    {
      "timestamp": "2024-01-15T10:25:00Z",
      "provider": "sambanova",
      "error": "Rate limit exceeded"
    }
  ]
}
```

### GET /health

Health check general. Ejemplo de respuesta:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "providers": {
    "sambanova": "ok",
    "cerebras": "ok",
    "groq": "ok",
    "gemini": "ok"
  },
  "uptime_ms": 3600000
}
```

## Manejo de errores

Algunas respuestas de error típicas (mantener formato técnico):

### 400 Bad Request
```json
{
  "error": {
    "message": "messages must be a non-empty array",
    "type": "invalid_request_error",
    "code": 400
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "message": "Unauthorized",
    "type": "invalid_api_key",
    "code": 401
  }
}
```

### 429 Too Many Requests
```json
{
  "error": {
    "message": "Rate limit exceeded",
    "type": "rate_limit_error",
    "code": 429,
    "retry_after_seconds": 60
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "message": "All providers failed",
    "type": "provider_error",
    "code": 500,
    "fallback_trace": [
      {
        "provider": "sambanova",
        "status": "failed",
        "error": "Connection timeout"
      },
      {
        "provider": "cerebras",
        "status": "failed",
        "error": "Rate limited"
      }
    ]
  }
}
```

## Casos de uso (ejemplos prácticos)

Estos ejemplos muestran patrones de uso comunes; mantengo los bloques de código sin traducir.

### 1. Preguntas rápidas (Q&A)

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer dev-local-key-1" \
  -d '{
    "model": "api-fallback",
    "messages": [
      {"role": "user", "content": "What are the top 3 cloud providers?"}
    ],
    "max_tokens": 300
  }'
```

Recomendado para preguntas factuales y búsquedas rápidas.

### 2. Resumen de texto

```bash
ARTICLE="Long article text here..."

curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer dev-local-key-1" \
  -d "{
    \"model\": \"api-fallback\",
    \"messages\": [
      {
        \"role\": \"system\",
        \"content\": \"You are a summarization expert. Provide a concise summary in 3-5 bullet points.\"
      },
      {
        \"role\": \"user\",
        \"content\": \"Summarize this: $ARTICLE\"
      }
    ],
    \"max_tokens\": 200
  }"
```

### 3. Traducción

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer dev-local-key-1" \
  -d '{
    "model": "api-fallback",
    "messages": [
      {
        "role": "system",
        "content": "You are a professional translator. Translate to Spanish, preserving tone and meaning."
      },
      {
        "role": "user",
        "content": "The quick brown fox jumps over the lazy dog"
      }
    ]
  }'
```

### 4. Brainstorming e ideación

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer dev-local-key-1" \
  -d '{
    "model": "api-fallback",
    "messages": [
      {
        "role": "system",
        "content": "You are a creative brainstorming expert. Generate unique, actionable ideas."
      },
      {
        "role": "user",
        "content": "Generate 5 startup ideas for the fitness industry using AI"
      }
    ],
    "temperature": 0.9,
    "max_tokens": 800
  }'
```

### 5. Generación de contenido

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer dev-local-key-1" \
  -d '{
    "model": "api-fallback",
    "messages": [
      {
        "role": "system",
        "content": "You are a professional copywriter. Write engaging, SEO-friendly content."
      },
      {
        "role": "user",
        "content": "Write a 300-word blog post about machine learning for beginners"
      }
    ],
    "max_tokens": 500
  }'
```

### 6. Mejora de redacción y gramática

```bash
TEXT="Your text here that needs improvement..."

curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer dev-local-key-1" \
  -d "{
    \"model\": \"api-fallback\",
    \"messages\": [
      {
        \"role\": \"system\",
        \"content\": \"You are a professional editor. Improve grammar, clarity, and tone. Return only the improved text.\"
      },
      {
        \"role\": \"user\",
        \"content\": \"Edit this: $TEXT\"
      }
    ]
  }"
```

## Ejemplos rápidos (curl)

Ejemplo simple de Q&A:
```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-local-key-1" \
  -d '{
    "model": "api-fallback",
    "messages": [
      {"role": "user", "content": "What is photosynthesis?"}
    ],
    "max_tokens": 500
  }'
```

## Cadena de proveedores y uso en metadata

La cadena de proveedores configurada por defecto intenta los proveedores en el orden definido por `AI_PROVIDER_PRIORITY`. La respuesta incluye `metadata.provider` y `metadata.fallback_trace` que muestran qué proveedores se probaron y con qué resultado.

## Límites por proveedor (informativo)

Los valores siguientes son orientativos sobre límites que los proveedores pueden imponer. El servidor aplica un límite global por API key (middleware `src/middleware/rateLimit.js`) controlado por las variables de entorno `RATE_LIMIT_WINDOW_MS` y `RATE_LIMIT_MAX_REQUESTS`.

| Proveedor | Requests/min | Tokens/min |
|-----------|--------------|------------|
| SambaNova | ∞ | ∞ |
| Cerebras  | ∞ | ∞ |
| Groq      | 3,000 | 60,000 |
| Gemini    | 1,000 | 32,000 |

## Documentación adicional

- Referencia técnica completa: [Endpoints (detallado)](#endpoints-detallado)
- Ejemplos y casos de uso: [Casos de uso (ejemplos prácticos)](#casos-de-uso-ejemplos-practicos)
- Arquitectura: [ARCHITECTURE.md](ARCHITECTURE.md)

## Licencia

MIT

---

Si quieres, puedo:

- Ejecutar una prueba rápida arrancando el servidor y haciendo una petición de ejemplo.
- Generar comandos PowerShell para crear claves seguras.
- Actualizar el `package.json` con un script `start` si falta.

