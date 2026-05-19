const fs = require('fs');
const path = require('path');

// Create directory structure
const dirs = [
  'src',
  'src/routes',
  'src/services',
  'src/services/providers',
  'src/middleware',
  'src/utils',
  'src/models',
  'logs'
];

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Move files from temp location to proper structure
const fileMappings = {
  'src_server.js': 'src/server.js',
  'src_utils_logger.js': 'src/utils/logger.js',
  'src_middleware_errorHandler.js': 'src/middleware/errorHandler.js',
  'src_models_ProviderStats.js': 'src/models/ProviderStats.js',
  'src_models_AIRequest.js': 'src/models/AIRequest.js',
  'src_services_providers_baseProvider.js': 'src/services/providers/baseProvider.js',
  'src_services_providers_geminiProvider.js': 'src/services/providers/geminiProvider.js',
  'src_services_providers_groqProvider.js': 'src/services/providers/groqProvider.js',
  'src_services_providerManager.js': 'src/services/providerManager.js',
  'src_routes_aiRouter.js': 'src/routes/aiRouter.js',
  'src_routes_healthRouter.js': 'src/routes/healthRouter.js',
};

Object.entries(fileMappings).forEach(([src, dst]) => {
  const srcPath = path.join(__dirname, src);
  const dstPath = path.join(__dirname, dst);
  if (fs.existsSync(srcPath)) {
    try {
      fs.renameSync(srcPath, dstPath);
      console.log(`✓ Moved ${src} -> ${dst}`);
    } catch (err) {
      console.error(`Failed to move ${src}: ${err.message}`);
    }
  }
});

// Remove old Anthropic provider file if it exists
const anthropicPath = path.join(__dirname, 'src/services/providers/anthropicProvider.js');
if (fs.existsSync(anthropicPath)) {
  try {
    fs.unlinkSync(anthropicPath);
    console.log('✓ Removed Anthropic provider');
  } catch (err) {
    console.error(`Failed to remove Anthropic provider: ${err.message}`);
  }
}

const anthropicTempPath = path.join(__dirname, 'src_services_providers_anthropicProvider.js');
if (fs.existsSync(anthropicTempPath)) {
  try {
    fs.unlinkSync(anthropicTempPath);
    console.log('✓ Cleaned Anthropic temp file');
  } catch (err) {
    console.error(`Failed to remove temp Anthropic file: ${err.message}`);
  }
}

const openaiPath = path.join(__dirname, 'src/services/providers/openaiProvider.js');
if (fs.existsSync(openaiPath)) {
  try {
    fs.unlinkSync(openaiPath);
    console.log('✓ Removed OpenAI provider');
  } catch (err) {
    console.error(`Failed to remove OpenAI provider: ${err.message}`);
  }
}

const openaiTempPath = path.join(__dirname, 'src_services_providers_openaiProvider.js');
if (fs.existsSync(openaiTempPath)) {
  try {
    fs.unlinkSync(openaiTempPath);
    console.log('✓ Cleaned OpenAI temp file');
  } catch (err) {
    console.error(`Failed to remove temp OpenAI file: ${err.message}`);
  }
}

// Create .env from .env.example if it doesn't exist
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✓ Created .env from .env.example');
}

console.log('✓ Project structure initialized successfully');
