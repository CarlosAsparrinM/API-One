# 🎯 Form 1: Auto-Fallback Implementation

## ✅ Cambios Realizados

### 1. **Endpoint `/v1/models` - ACTUALIZADO**

**Antes:**
```json
{
  "object": "list",
  "data": [
    {"id": "auto", ...},
    {"id": "groq:llama-3.1-8b-instant", ...},
    {"id": "groq:mixtral-8x7b-32768", ...},
    {"id": "gemini:gemini-2.0-flash", ...},
    ...más modelos
  ]
}
```

**Ahora (FORM 1):**
```json
{
  "object": "list",
  "data": [
    {
      "id": "api-fallback",
      "object": "model",
      "owned_by": "api-fallback",
      "description": "Automatic fallback across configured AI providers (Groq → Gemini)"
    }
  ]
}
```

**Beneficio:** El cliente (OneCode/VSCode) ve **UN SOLO MODELO** - sin opciones de elección. 🎁

---

### 2. **Endpoint `/v1/chat/completions` - ACTUALIZADO**

**Cambio clave:**

```javascript
// ANTES:
const { model = 'auto', messages, ... } = req.body;
const result = await manager.executeWithFallback('chat', {
  model,  // ← Pasaba el modelo del cliente tal cual
  ...
});

// AHORA (FORM 1):
const { model = 'api-fallback', messages, ... } = req.body;
const internalModel = 'auto';  // ← SIEMPRE usa 'auto' internamente
const result = await manager.executeWithFallback('chat', {
  model: internalModel,  // ← Ignora el modelo del cliente
  ...
});
```

**Beneficio:** 
- El cliente envía `"model": "api-fallback"` (o lo que sea)
- Internamente SIEMPRE usa `"auto"` (que activa fallback automático)
- **Transparencia total**: el usuario no ve detalles de proveedores

---

## 🔄 Flujo Completo (Form 1)

```
┌─ OneCode/VSCode ──────────────────┐
│                                   │
│  Configuración:                   │
│  Base URL: https://tu-api.com/v1  │
│  API Key: dev-local-key-1         │
│  Model: api-fallback              │
│                                   │
└────────────────┬──────────────────┘
                 │
                 ├─→ GET /v1/models
                 │   ├─→ Retorna: ["api-fallback"]
                 │   └─→ OneCode ve un solo modelo
                 │
                 └─→ POST /v1/chat/completions
                     {
                       "model": "api-fallback",
                       "messages": [...]
                     }
                     │
                     ├─→ Tu API recibe
                     │   "model": "api-fallback"
                     │
                     ├─→ Internamente usa:
                     │   "model": "auto"
                     │
                     ├─→ Intenta Groq
                     │   ├─ ✓ Éxito? → Retorna
                     │   └─ ✗ Falla? → Sigue
                     │
                     ├─→ Intenta Gemini
                     │   ├─ ✓ Éxito? → Retorna
                     │   └─ ✗ Falla? → Error 503
                     │
                     └─→ Retorna a OneCode:
                         {
                           "model": "api-fallback",
                           "choices": [...],
                           "metadata": {
                             "provider": "groq",
                             "fallback_trace": [...]
                           }
                         }
                         
OneCode/VSCode recibe respuesta
└─→ No sabe qué pasó internamente
└─→ Solo sabe que funcionó ✓
```

---

## 🚀 Cómo Probar

### Opción 1: Script automático (Recomendado)
```bash
# Abre Windows PowerShell/CMD en: d:\API-One
./start-and-test.bat
```

Este script:
1. Inicia el servidor
2. Ejecuta tests automáticos
3. Muestra resultados

### Opción 2: Manual

```bash
# Terminal 1: Inicia servidor
cd d:\API-One
node src/server.js

# Terminal 2: Ejecuta tests
node test-form1.js
```

---

## ✅ Validaciones

### Test 1: `/v1/models` debe retornar SOLO `api-fallback`

```bash
curl -X GET http://localhost:3000/v1/models \
  -H "Authorization: Bearer dev-local-key-1"
```

**Respuesta esperada:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "api-fallback",
      "object": "model",
      "owned_by": "api-fallback",
      "description": "Automatic fallback across configured AI providers (Groq → Gemini)"
    }
  ]
}
```

---

### Test 2: `/v1/chat/completions` con `api-fallback`

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer dev-local-key-1" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "api-fallback",
    "messages": [{"role": "user", "content": "Hola"}]
  }'
```

**Respuesta esperada:**
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "model": "api-fallback",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Hola! ¿Cómo estás?"
    }
  }],
  "metadata": {
    "provider": "groq",                    ← ¡Aquí ves que usó Groq!
    "request_latency_ms": 450,
    "fallback_trace": [{
      "provider": "groq",
      "model": "mixtral-8x7b-32768",
      "status": "success",
      "latencyMs": 450
    }]
  }
}
```

---

## 📊 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/routes/openaiRouter.js` | `/v1/models`: Retorna solo `api-fallback`<br>`/v1/chat/completions`: Usa `internalModel = 'auto'` siempre |

---

## 🎯 Comportamiento Final

| Evento | Antes (Multiple Models) | Ahora (Form 1) |
|--------|--------------------------|----------------|
| OneCode ve modelos | 5+ opciones | 1 única: `api-fallback` |
| Usuario configura modelo | Debe elegir | No elige (ya está) |
| Transparencia | Baja (ve detalles) | Alta (no ve detalles) |
| Fallback automático | Depende de lo que elija | Siempre activo |
| Cambio de proveedor | Manual | Automático |

---

## 💡 Notas Importantes

1. **El cliente SIEMPRE recibe modelo "api-fallback"** en la respuesta
2. **Internamente la API SIEMPRE usa "auto"** (sin importar qué envíe el cliente)
3. **El fallback es COMPLETAMENTE TRANSPARENTE** - el usuario no lo ve
4. **La prioridad sigue siendo**: `AI_PROVIDER_PRIORITY=groq,gemini` (en `.env`)
5. **Metadata está disponible** si quieres ver qué proveedor se usó realmente

---

## 🔧 Para Cambiar Prioridad

Si quieres que intente Gemini primero, edita `.env`:

```env
# Antes
AI_PROVIDER_PRIORITY=groq,gemini

# Ahora
AI_PROVIDER_PRIORITY=gemini,groq
```

Reinicia el servidor y listo. 🚀

---

## ¿Qué Sigue?

✅ **Form 1 implementada**: Auto-fallback transparente para OneCode/VSCode
📋 **Siguiente paso**: Conectar OneCode/VSCode con esta API

Para usarla:
1. Asegúrate que el servidor está corriendo
2. En OneCode/VSCode, configura:
   - **Base URL**: `http://localhost:3000/v1` (o tu dominio)
   - **API Key**: `dev-local-key-1` (o la que definas en `.env`)
   - **Model**: `api-fallback`
3. ¡Listo! Ya está usando tu API con fallback automático

---

**Implementado con ❤️ por API-One**
