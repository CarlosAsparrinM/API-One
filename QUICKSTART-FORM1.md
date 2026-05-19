# ⚡ QuickStart: Form 1 (Auto-Fallback)

## 3 Pasos para Empezar

### Paso 1️⃣: Inicia el Servidor (30 segundos)

```bash
# Abre Command Prompt o PowerShell en d:\API-One
npm start
```

Verifica que ves:
```
✓ API listening on port 3000
✓ Groq provider initialized (FREE)
✓ Gemini provider initialized (FREE tier available)
```

---

### Paso 2️⃣: Verifica que Funciona (20 segundos)

Abre otra terminal y ejecuta:

```bash
# Ver modelos disponibles
curl -X GET http://localhost:3000/v1/models \
  -H "Authorization: Bearer dev-local-key-1"
```

Deberías ver:
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

✅ **Si ves esto, funciona perfectamente**

---

### Paso 3️⃣: Configura en OneCode (2 minutos)

#### 3a. Descarga OneCode
- Ve a: https://onecode.dev/
- Descarga e instala

#### 3b. Abre OneCode y ve a Settings

```
OneCode → Settings → AI Models → Add Custom API
```

#### 3c. Llena los datos

| Campo | Valor |
|-------|-------|
| API Type | OpenAI Compatible |
| Provider Name | API-One |
| Base URL | `http://localhost:3000/v1` |
| API Key | `dev-local-key-1` |
| Model | `api-fallback` |

#### 3d. Test Connection

- Click en "Test Connection"
- Debe mostrarse ✅ verde
- Si es rojo, verifica que el servidor sigue corriendo

---

## ✨ ¡Listo! Úsalo

### En OneCode:

1. Abre un nuevo Chat
2. Selecciona modelo: `api-fallback`
3. Escribe tu pregunta:

```
Tú: Escribe un programa Python que calcule el factorial
IA: 
def factorial(n):
    if n < 2:
        return 1
    return n * factorial(n - 1)

print(factorial(5))  # Output: 120
```

---

## 🧪 Prueba Completa (Bonus)

Si quieres probar el fallback automático:

```bash
# Terminal 1: Servidor
npm start

# Terminal 2: Test automático
node test-form1.js
```

Verás:
- ✓ Test 1: Solo modelo "api-fallback"
- ✓ Test 2: Chat funciona con fallback
- ✓ Metadata muestra qué proveedor se usó

---

## 📊 Monitoreo (Opcional)

Ver estadísticas de uso:

```bash
curl -X GET http://localhost:3000/v1/admin/stats \
  -H "Authorization: Bearer dev-local-key-1"
```

Respuesta:
```json
{
  "groq": {
    "totalRequests": 15,
    "successRate": "100%",
    "isHealthy": true
  },
  "gemini": {
    "totalRequests": 2,
    "successRate": "100%",
    "isHealthy": true
  }
}
```

---

## ⚙️ Configuración Avanzada (Opcional)

### Cambiar API Key

Edita `d:\API-One\.env`:

```env
# Cambiar esto
API_AUTH_KEYS=dev-local-key-1

# Por tu clave segura
API_AUTH_KEYS=mi-clave-super-secreta
```

Actualiza también en OneCode.

### Cambiar Prioridad de Proveedores

Edita `d:\API-One\.env`:

```env
# Gemini primero (en lugar de Groq)
AI_PROVIDER_PRIORITY=gemini,groq
```

Reinicia el servidor.

---

## 🐛 Si algo no funciona

### Error: "Connection refused"
```
Solución: Verifica que npm start está corriendo en otra terminal
```

### Error: "Unauthorized 401"
```
Solución: API Key incorrecta. Usa: dev-local-key-1
```

### Error: "Model not found"
```
Solución: En OneCode, asegúrate de escribir exacto: "api-fallback"
```

### Error: "All providers failed"
```
Solución: Verifica que tienes API keys válidas en .env
- GROQ_API_KEY válida
- GEMINI_API_KEY válida
```

---

## 📚 Documentación Completa

Si necesitas más detalles:

- **FORM1-IMPLEMENTATION.md** ← Explicación técnica
- **USING-ONECODE.md** ← Guía completa de OneCode
- **FORM1-RESUMEN-FINAL.md** ← Todo junto en detalle

---

## 🎯 Resumen

| Acción | Tiempo |
|--------|--------|
| Inicia servidor | 30s |
| Verifica que funciona | 20s |
| Configura en OneCode | 2min |
| **Total** | **~3min** |

---

## 💡 Lo Que Hace Internamente

```
Tu request → Intenta Groq → Falla? → Intenta Gemini → Éxito ✓
```

Todo automático, transparente, sin intervención del usuario.

---

**¡Disfruta tu IA sin límites!** 🚀
