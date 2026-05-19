# QUICKSTART

## 1. Instalar
```bash
cd d:\API-One
npm install
```

## 2. Configurar `.env`

```env
PORT=3000
LOG_LEVEL=info
API_AUTH_KEYS=dev-local-key-1
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=120
ALLOWED_ORIGINS=*

GROQ_API_KEY=tu_key
GROQ_ENABLED=true

GEMINI_API_KEY=tu_key
GEMINI_ENABLED=true

AI_PROVIDER_PRIORITY=groq,gemini
```

## 3. Ejecutar
```bash
npm start
```

## 4. Probar
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-local-key-1" \
  -d '{"prompt":"Hola"}'
```

## 5. Probar ruta OpenAI compatible
```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-local-key-1" \
  -d '{
    "model":"auto",
    "messages":[{"role":"user","content":"Hola"}]
  }'
```
