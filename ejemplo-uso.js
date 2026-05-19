// ejemplo-uso.js
// Ejemplo de cómo usar la API-One desde otra aplicación

const axios = require('axios');

const API_URL = 'http://localhost:3000';

// ============================================
// CLASE WRAPPER PARA FACILITAR USO
// ============================================

class AIClient {
  constructor(baseURL = API_URL) {
    this.baseURL = baseURL;
    this.client = axios.create({ baseURL });
  }

  // Chat con soporte para fallback automático
  async chat(prompt, options = {}) {
    try {
      const response = await this.client.post('/api/chat', {
        prompt,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2000,
        ...options
      });
      return response.data.data;
    } catch (error) {
      throw new Error(`Chat error: ${error.message}`);
    }
  }

  // Chat con mensajes (conversación)
  async chatMessages(messages, options = {}) {
    try {
      const response = await this.client.post('/api/chat', {
        messages,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2000,
        ...options
      });
      return response.data.data;
    } catch (error) {
      throw new Error(`Chat error: ${error.message}`);
    }
  }

  // Completion (texto continuado)
  async complete(prompt, options = {}) {
    try {
      const response = await this.client.post('/api/completion', {
        prompt,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 1000,
        ...options
      });
      return response.data.data;
    } catch (error) {
      throw new Error(`Completion error: ${error.message}`);
    }
  }

  // Embedding (vectorización de texto)
  async embed(text) {
    try {
      const response = await this.client.post('/api/embedding', { text });
      return response.data.data;
    } catch (error) {
      throw new Error(`Embedding error: ${error.message}`);
    }
  }

  // Ver estadísticas
  async getStats() {
    try {
      const response = await this.client.get('/api/stats');
      return response.data.data;
    } catch (error) {
      throw new Error(`Stats error: ${error.message}`);
    }
  }

  // Ver proveedores disponibles
  async getProviders() {
    try {
      const response = await this.client.get('/api/providers');
      return response.data.data;
    } catch (error) {
      throw new Error(`Providers error: ${error.message}`);
    }
  }

  // Health check
  async health() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }
}

// ============================================
// EJEMPLOS DE USO
// ============================================

async function ejemplos() {
  const ai = new AIClient();

  try {
    // 1. Chat simple
    console.log('1️⃣  Chat simple...');
    const chatResponse = await ai.chat('¿Cuál es la capital de España?');
    console.log('Respuesta:', chatResponse.response);
    console.log('Proveedor usado:', chatResponse.provider);
    console.log('Tokens:', chatResponse.tokensUsed);
    console.log('');

    // 2. Chat con conversación
    console.log('2️⃣  Conversación...');
    const messages = [
      { role: 'user', content: 'Hola' },
      { role: 'assistant', content: '¡Hola! ¿Cómo estás?' },
      { role: 'user', content: '¿Me puedes explicar qué es Node.js?' }
    ];
    const conversationResponse = await ai.chatMessages(messages);
    console.log('Respuesta:', conversationResponse.response);
    console.log('');

    // 3. Completion
    console.log('3️⃣  Completion...');
    const completionResponse = await ai.complete(
      'La inteligencia artificial es',
      { maxTokens: 500 }
    );
    console.log('Respuesta:', completionResponse.response);
    console.log('');

    // 4. Embedding
    console.log('4️⃣  Embedding...');
    const embeddingResponse = await ai.embed('Texto para vectorizar');
    console.log('Vector generado (primeros 10 valores):');
    console.log(embeddingResponse.embedding.slice(0, 10));
    console.log('Dimensión del embedding:', embeddingResponse.embedding.length);
    console.log('');

    // 5. Ver estadísticas
    console.log('5️⃣  Estadísticas de proveedores...');
    const stats = await ai.getStats();
    console.log('Estadísticas:', JSON.stringify(stats, null, 2));
    console.log('');

    // 6. Ver proveedores
    console.log('6️⃣  Proveedores disponibles...');
    const providers = await ai.getProviders();
    console.log('Proveedores:', JSON.stringify(providers, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// ============================================
// CASOS DE USO REAL
// ============================================

// Caso 1: Agente de código
async function agenteDeCodigo() {
  const ai = new AIClient();
  
  const prompt = `
    Escribe una función JavaScript que:
    - Acepte un array de números
    - Retorne la suma de los pares
    - Y el conteo de los impares
    
    Explica el código.
  `;
  
  const result = await ai.chat(prompt, {
    maxTokens: 1500,
    temperature: 0.5
  });
  
  console.log('🤖 Respuesta del agente:');
  console.log(result.response);
}

// Caso 2: Análisis de texto
async function analisaTexto() {
  const ai = new AIClient();
  
  const texto = `
    La inteligencia artificial ha revolucionado la tecnología.
    Ahora las máquinas pueden aprender y tomar decisiones.
  `;
  
  const messages = [
    { role: 'user', content: `Analiza este texto: ${texto}` },
    { role: 'user', content: 'Resume los puntos principales en 2 oraciones' }
  ];
  
  const result = await ai.chatMessages(messages);
  console.log('📝 Análisis:');
  console.log(result.response);
}

// Caso 3: Búsqueda semántica con embeddings
async function busquedaSematica() {
  const ai = new AIClient();
  
  // Vectorizar múltiples textos
  const textos = [
    'El gato es un animal doméstico',
    'Los perros son leales a sus dueños',
    'La programación es una habilidad técnica',
    'JavaScript se usa en desarrollo web'
  ];
  
  console.log('📊 Generando embeddings...');
  const embeddings = [];
  
  for (const texto of textos) {
    const result = await ai.embed(texto);
    embeddings.push({
      texto,
      embedding: result.embedding
    });
  }
  
  console.log('✓ Embeddings generados:', embeddings.length);
  
  // Aquí podrías hacer búsqueda de similitud
  // usando similitud del coseno entre vectores
}

// Caso 4: Monitor de salud
async function monitorSalud() {
  const ai = new AIClient();
  
  setInterval(async () => {
    try {
      const health = await ai.health();
      const stats = await ai.getStats();
      
      console.log(`
      ⏱️  ${new Date().toLocaleTimeString()}
      Health: ${health.status}
      Proveedores: ${health.providers.healthy}/${health.providers.total}
      `);
      
      // Log de estadísticas
      Object.entries(stats).forEach(([provider, stat]) => {
        console.log(`  ${provider}: ${stat.totalRequests} requests, ${stat.successRate}% éxito`);
      });
    } catch (error) {
      console.error('Error en monitoreo:', error.message);
    }
  }, 30000); // Cada 30 segundos
}

// ============================================
// USAR LOS EJEMPLOS
// ============================================

// Ejecuta el ejemplo que prefieras:
// await ejemplos();
// await agenteDeCodigo();
// await analisaTexto();
// await busquedaSematica();
// await monitorSalud();

// Exportar para usar desde otros módulos
module.exports = { AIClient, ejemplos };
