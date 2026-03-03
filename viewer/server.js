import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';

import { detectCssSetup } from './utils/detectCss.js';
import { getEntryCode } from './utils/entryCode.js';
import { createApiServer } from './api/server.js';
import { generateHtml, generateStyleGuideHtml } from './client/template.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse command line args
const args = process.argv.slice(2);
const getArg = name => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
};

const port = parseInt(getArg('port') || '5789');
const componentPath = getArg('component');
const framework = getArg('framework') || 'vue';
const projectRoot = getArg('projectRoot') || path.dirname(componentPath);

if (!componentPath) {
  console.error('Usage: node server.js --component <path> --framework <vue|react> --port <port>');
  process.exit(1);
}

const absoluteComponentPath = path.resolve(componentPath);
const absoluteProjectRoot = path.resolve(projectRoot);

console.log('\n=== Component Preview Server ===');
console.log(`Framework:  ${framework}`);
console.log(`Component:  ${absoluteComponentPath}`);
console.log(`Project:    ${absoluteProjectRoot}`);
console.log(`Port:       ${port}\n`);

// Check if this is style guide mode (opening a tokens JSON file)
if (framework === 'styleguide') {
  console.log('Mode: Style Guide Viewer\n');
  
  const tokensData = JSON.parse(fs.readFileSync(absoluteComponentPath, 'utf-8'));
  const html = generateStyleGuideHtml(tokensData);
  
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
  });
  
  server.listen(port, () => {
    console.log(`Style Guide: http://localhost:${port}\n`);
  });
  
  process.on('SIGINT', () => { server.close(); process.exit(); });
  process.on('SIGTERM', () => { server.close(); process.exit(); });
} else {
  // Normal component preview mode

// Detect CSS setup
const cssSetup = detectCssSetup(absoluteProjectRoot, absoluteComponentPath);

// Load design tokens if they exist
function loadDesignTokens() {
  const tokenFiles = ['design-tokens.json', 'tokens.json', 'design-system.json'];
  for (const file of tokenFiles) {
    const tokenPath = path.join(absoluteProjectRoot, file);
    if (fs.existsSync(tokenPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
        console.log(`Tokens: ${file}`);
        return data;
      } catch (e) {
        console.log(`Tokens: ${file} (parse error)`);
      }
    }
  }
  return null;
}

const designTokens = loadDesignTokens();

// Create temp directory
const previewDir = path.join(__dirname, '.preview-temp');
if (!fs.existsSync(previewDir)) {
  fs.mkdirSync(previewDir, { recursive: true });
}

// Write entry file
const entryFile = path.join(previewDir, 'entry.js');
fs.writeFileSync(entryFile, getEntryCode(framework, absoluteComponentPath, cssSetup));

// Write HTML file
const apiPort = port + 1;
const htmlFile = path.join(previewDir, 'index.html');
fs.writeFileSync(htmlFile, generateHtml(apiPort, cssSetup, designTokens));

console.log(`Entry: ${entryFile}`);
console.log(`HTML:  ${htmlFile}\n`);

// Start API server
const apiServer = createApiServer(apiPort, cssSetup, absoluteComponentPath);

// Vite plugins
const plugins = [];
if (framework === 'vue') plugins.push(vue());
else if (framework === 'react') plugins.push(react());

// Start Vite server
async function start() {
  const server = await createServer({
    configFile: false,
    root: previewDir,
    plugins,
    server: { 
      port, 
      strictPort: true, 
      host: 'localhost', 
      cors: true 
    },
    resolve: { 
      alias: { '@': path.join(absoluteProjectRoot, 'src') } 
    },
    optimizeDeps: { 
      include: framework === 'vue' ? ['vue'] : ['react', 'react-dom'] 
    },
    logLevel: 'info',
    css: cssSetup.hasTailwind ? { postcss: absoluteProjectRoot } : undefined,
  });

  await server.listen();
  server.printUrls();

  // Note: We don't watch the component file because Vite's HMR handles it.
  // Our fs.watch was causing double-reloads which broke Vue HMR.

  // Cleanup on exit
  const cleanup = () => {
    console.log('\nShutting down...');
    apiServer.close();
    try { 
      fs.rmSync(previewDir, { recursive: true, force: true }); 
    } catch {}
    process.exit();
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
}
