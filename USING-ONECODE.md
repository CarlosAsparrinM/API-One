# 🚀 Cómo Usar Tu API en OneCode

## 📋 Resumen

Tu API-One ahora funciona con **un único modelo virtual** llamado **`api-fallback`** que internamente:
- Intenta Groq primero
- Si falla → intenta Gemini automáticamente
- Todo transparente sin que OneCode lo sepa

---

## 🎯 Configuración en OneCode

### Paso 1: Abre OneCode

Descargar desde: https://onecode.dev/

### Paso 2: Ve a Configuración de Modelos

```
OneCode → Settings → AI Models
```

### Paso 3: Configura una API Custom

1. Click en **"+ Add Custom API"**
2. Completa los siguientes datos:

| Campo | Valor |
|-------|-------|
| **API Type** | OpenAI Compatible |
| **Provider Name** | API-One (o lo que quieras) |
| **Base URL** | `http://localhost:3000/v1` |
| **API Key** | `dev-local-key-1` |
| **Model** | `api-fallback` |

### Paso 4: Prueba la Conexión

- Click en "Test Connection"
- Si es verde ✅ → Todo funciona
- Si es rojo ❌ → Verifica que el servidor esté corriendo

---

## 💻 Instalación del Servidor

### Opción 1: Rápida (Recomendada)

```bash
# Abre Command Prompt en d:\API-One
./start-and-test.bat
```

### Opción 2: Manual

```bash
# Terminal 1: Inicia el servidor
cd d:\API-One
npm install   # (si es la primera vez)
npm start

# Deberías ver:
# ✓ API listening on port 3000
# ✓ Groq provider initialized (FREE)
# ✓ Gemini provider initialized (FREE tier available)
```

---

## ✅ Verificación

### 1. ¿El servidor está corriendo?

```bash
curl -X GET http://localhost:3000/health
```

**Respuesta esperada:**
```json
{"status": "ok", "timestamp": "..."}
```

### 2. ¿Hay modelos disponibles?

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
      "owned_by": "api-fallback"
    }
  ]
}
```

### 3. ¿Funciona el chat?

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer dev-local-key-1" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "api-fallback",
    "messages": [{"role": "user", "content": "Di hola"}]
  }'
```

---

## 🎮 Usar en OneCode

Una vez configurado:

### 1. Abre un chat

```
OneCode → New Chat
```

### 2. Selecciona tu API

En el selector de modelos, elige:
```
API-One / api-fallback
```

### 3. ¡Empieza a usar!

```
Tú:  "Escribe un hello world en Python"
IA:  ```python
     print("Hello World!")
     ```
```

---

## 🔄 Qué pasa internamente

Cuando escribes en OneCode:

```
OneCode envía a tu API:
├─ Model: "api-fallback"
├─ Messages: [tu pregunta]
└─ Temperature: 0.7

Tu API recibe y:
├─ Intenta Groq (rápido, gratuito)
│  └─ ✓ Éxito → Responde inmediatamente
└─ Si Groq falla:
   └─ Intenta Gemini (más potente, gratuito)
      └─ ✓ Éxito → Responde

OneCode recibe:
├─ Respuesta de IA
├─ Metadata (opcional):
│  ├─ Provider usado: "groq" o "gemini"
│  └─ Latencia: tiempo en ms
└─ ¡Fin! Mostrar respuesta al usuario
```

---

## 📊 Estadísticas (Opcional)

Si quieres ver qué está pasando internamente:

```bash
curl -X GET http://localhost:3000/v1/admin/stats \
  -H "Authorization: Bearer dev-local-key-1"
```

**Respuesta:**
```json
{
  "groq": {
    "totalRequests": 45,
    "successRate": "97.78%",
    "isHealthy": true
  },
  "gemini": {
    "totalRequests": 8,
    "successRate": "87.50%",
    "isHealthy": true
  }
}
```

---

## ⚙️ Configuración Avanzada (Opcional)

### Cambiar prioridad de proveedores

Edita `d:\API-One\.env`:

```env
# De esto:
AI_PROVIDER_PRIORITY=groq,gemini

# A esto (si quieres Gemini primero):
AI_PROVIDER_PRIORITY=gemini,groq
```

Luego reinicia el servidor.

### Cambiar API Key

Edita `d:\API-One\.env`:

```env
# Antes
API_AUTH_KEYS=dev-local-key-1

# Después (más seguro)
API_AUTH_KEYS=tu-clave-super-secreta
```

Actualiza también en OneCode con la nueva clave.

---

## 🐛 Solución de Problemas

### "Connection refused"
```
❌ Error: No puedo conectar a http://localhost:3000

✅ Solución:
   1. Verifica que el servidor está corriendo (npm start)
   2. Verifica que el puerto 3000 está libre
   3. En Windows: netstat -ano | findstr :3000
```

### "Unauthorized"
```
❌ Error: 401 Unauthorized

✅ Solución:
   1. Verifica que la API Key es correcta
   2. En OneCode, configura: dev-local-key-1 (o la que uses en .env)
   3. En la request, agrega: -H "Authorization: Bearer dev-local-key-1"
```

### "Model not found"
```
❌ Error: Model "..." not found

✅ Solución:
   1. En OneCode, selecciona exactamente: "api-fallback"
   2. Si no aparece, ve a Settings y recarga los modelos
   3. Verifica con: curl /v1/models
```

### "All providers failed"
```
❌ Error: 503 Service Unavailable - All providers failed

✅ Soluciones:
   1. Verifica que tienes API keys válidas en .env
   2. Comprueba: curl /v1/admin/stats
   3. Si Groq falla, comprueba: gsk_... en https://console.groq.com
   4. Si Gemini falla, comprueba: AIzaSy... en https://console.cloud.google.com
```

---

## 📚 Documentación Oficial

- **OneCode**: https://onecode.dev/docs
- **Groq API**: https://console.groq.com
- **Gemini API**: https://aistudio.google.com

---

## ✨ Ventajas de usar API-One

| Ventaja | Detalles |
|---------|----------|
| 🆓 **Gratuito** | Capas gratuitas de Groq + Gemini |
| 🔄 **Fallback automático** | Si un proveedor falla → usa otro |
| 📊 **Monitoreo** | Ve estadísticas en tiempo real |
| 🚀 **Rápido** | Groq es muy rápido (prioridad 1) |
| 🧠 **Potente** | Gemini es muy inteligente (fallback) |
| 🎯 **Transparente** | No necesitas elegir proveedores |

---

**¡Listo! Disfruta usando IA sin límites de capa gratuita.** 🚀
