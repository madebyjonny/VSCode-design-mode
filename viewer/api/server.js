import http from 'http';
import fs from 'fs';
import path from 'path';
import { getClassStyles, getStyleBlockStyles } from '../utils/detectCss.js';

export function createApiServer(port, cssSetup, componentPath) {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    // Get existing styles for a class
    if (req.method === 'GET' && req.url.startsWith('/get-styles')) {
      const url = new URL(req.url, `http://localhost:${port}`);
      const className = url.searchParams.get('class');
      
      try {
        let styles = null;
        
        if (cssSetup.hasStyleBlock) {
          styles = getStyleBlockStyles(componentPath, className);
        }
        if (!styles && cssSetup.componentCss) {
          styles = getClassStyles(cssSetup.componentCss, className);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ styles: styles || {} }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }
    
    // POST handlers
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          let result;
          
          switch (req.url) {
            case '/update-css':
              result = updateCss(cssSetup, componentPath, data.className, data.styles);
              break;
            case '/add-class':
              result = addClassToElement(componentPath, data.tagName, data.newClassName);
              break;
            default:
              res.writeHead(404);
              res.end(JSON.stringify({ error: 'Not found' }));
              return;
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (e) {
          console.error('API Error:', e.message);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
    
    res.writeHead(404);
    res.end('Not found');
  });
  
  server.listen(port, () => {
    console.log(`API server: http://localhost:${port}`);
  });
  
  return server;
}

function updateCss(cssSetup, componentPath, className, styles) {
  const cssProps = Object.entries(styles)
    .filter(([_, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `  ${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`)
    .join('\n');
  
  if (!cssProps) throw new Error('No styles to save');
  
  const newRule = `.${className} {\n${cssProps}\n}`;
  
  // Try style block first
  if (cssSetup.hasStyleBlock) {
    let content = fs.readFileSync(componentPath, 'utf-8');
    const styleMatch = content.match(/<style([^>]*)>([\s\S]*?)<\/style>/i);
    
    if (styleMatch) {
      let styleContent = styleMatch[2];
      const classRegex = new RegExp(`\\.${className}\\s*\\{[^}]*\\}`, 's');
      
      if (classRegex.test(styleContent)) {
        styleContent = styleContent.replace(classRegex, newRule);
      } else {
        styleContent = styleContent.trim() + '\n\n' + newRule + '\n';
      }
      
      content = content.replace(/<style([^>]*)>[\s\S]*?<\/style>/i, `<style${styleMatch[1]}>${styleContent}</style>`);
      fs.writeFileSync(componentPath, content);
      return { success: true };
    }
  }
  
  // Try CSS file
  if (cssSetup.componentCss) {
    let content = fs.readFileSync(cssSetup.componentCss, 'utf-8');
    const classRegex = new RegExp(`\\.${className}\\s*\\{[^}]*\\}`, 's');
    
    if (classRegex.test(content)) {
      content = content.replace(classRegex, newRule);
    } else {
      content += '\n\n' + newRule;
    }
    
    fs.writeFileSync(cssSetup.componentCss, content);
    return { success: true };
  }
  
  throw new Error('No CSS file or <style> block found');
}

function addClassToElement(componentPath, tagName, newClassName) {
  let content = fs.readFileSync(componentPath, 'utf-8');
  const ext = path.extname(componentPath);
  
  // Pattern to find tag and add class
  const classAttr = ext === '.jsx' || ext === '.tsx' ? 'className' : 'class';
  const pattern = new RegExp(`(<${tagName})(\\s)`, 'i');
  
  if (pattern.test(content)) {
    content = content.replace(pattern, `$1 ${classAttr}="${newClassName}"$2`);
    fs.writeFileSync(componentPath, content);
    return { success: true };
  }
  
  throw new Error(`Could not find <${tagName}> element`);
}
