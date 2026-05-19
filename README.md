# API Fallback (Solo capas gratuitas)

API en Node.js/Express con fallback automático entre proveedores gratuitos:
- **Groq**
- **Google Gemini**

Compatible con clientes tipo OpenAI:
- `POST /v1/chat/completions`
- `GET /v1/models`

## Configuración

1. Instala dependencias:
```bash
npm install
```

2. Configura `.env` (usa al menos una key):
```env
API_AUTH_KEYS=dev-local-key-1
GROQ_API_KEY=tu_key
GEMINI_API_KEY=tu_key
AI_PROVIDER_PRIORITY=groq,gemini
```

## Endpoints

- `POST /v1/chat/completions` (OpenAI compatible)
- `GET /v1/models` (OpenAI compatible)
- `POST /api/chat`
- `POST /api/completion`
- `POST /api/embedding`
- `GET /api/providers`
- `GET /api/stats`
- `GET /health`

Todos los endpoints de `/api` y `/v1` requieren:
```http
Authorization: Bearer <tu_api_key>
```

## Ejemplo OpenAI-compatible

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-local-key-1" \
  -d '{
    "model": "auto",
    "messages": [{"role":"user","content":"Escribe una función en JavaScript para invertir un string"}]
  }'
```

## Fallback

Orden por defecto:
1. Groq
2. Gemini

Si el primero falla, se intenta el siguiente automáticamente.
