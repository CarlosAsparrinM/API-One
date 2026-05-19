#!/usr/bin/env node

const http = require('http');

console.log('🧪 Testing Form 1: Auto-Fallback Model\n');

// Test 1: GET /v1/models
console.log('📋 Test 1: GET /v1/models');
console.log('─'.repeat(50));

const modelsReq = http.request('http://localhost:3000/v1/models', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer dev-local-key-1',
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('✅ Response:', JSON.stringify(parsed, null, 2));
      console.log('\n✓ Expected: Only "api-fallback" model\n');
    } catch (e) {
      console.error('❌ Invalid JSON:', e.message);
    }
  });
});

modelsReq.on('error', (e) => {
  console.error('❌ Connection error:', e.message);
  console.log('💡 Make sure server is running: node src/server.js\n');
});

modelsReq.end();

// Test 2: POST /v1/chat/completions with api-fallback
setTimeout(() => {
  console.log('\n📨 Test 2: POST /v1/chat/completions');
  console.log('─'.repeat(50));
  console.log('Request:');
  console.log(JSON.stringify({
    model: 'api-fallback',
    messages: [{role: 'user', content: 'Hola, ¿cómo estás?'}]
  }, null, 2));

  const payload = JSON.stringify({
    model: 'api-fallback',
    messages: [{role: 'user', content: 'Hola, ¿cómo estás?'}],
    temperature: 0.7,
    max_tokens: 100
  });

  const chatReq = http.request('http://localhost:3000/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer dev-local-key-1',
      'Content-Type': 'application/json',
      'Content-Length': payload.length,
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log('\n✅ Response (truncated):', JSON.stringify({
          id: parsed.id,
          model: parsed.model,
          choices: parsed.choices,
          metadata: parsed.metadata
        }, null, 2));
        console.log('\n✓ Key points:');
        console.log(`  - model returned: "${parsed.model}" (should be "api-fallback")`);
        console.log(`  - provider used internally: "${parsed.metadata?.provider}"`);
        console.log(`  - actual model: "${parsed.metadata?.provider}:${parsed.model}"`);
      } catch (e) {
        console.error('❌ Invalid JSON:', e.message);
      }
    });
  });

  chatReq.on('error', (e) => {
    console.error('❌ Connection error:', e.message);
  });

  chatReq.write(payload);
  chatReq.end();
}, 1500);
