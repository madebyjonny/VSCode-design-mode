import http from 'http';
import { 
  updateCssFile, 
  updateComponentStyle, 
  updateTailwindClasses, 
  addClassToElement 
} from './handlers.js';
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
        
        // Priority: 1) <style> block, 2) component CSS, 3) main CSS
        if (cssSetup.hasStyleBlock) {
          styles = getStyleBlockStyles(componentPath, className);
          console.log(`Getting styles from <style> block for .${className}:`, styles);
        }
        
        if (!styles && cssSetup.componentCss) {
          styles = getClassStyles(cssSetup.componentCss, className);
          console.log(`Getting styles from component CSS for .${className}:`, styles);
        }
        
        if (!styles && cssSetup.mainCss) {
          styles = getClassStyles(cssSetup.mainCss, className);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          styles: styles || {},
          source: cssSetup.hasStyleBlock ? 'style-block' : (cssSetup.componentCss ? 'component-css' : 'main-css')
        }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }
    
    // Parse JSON body for POST requests
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          let result;
          
          switch (req.url) {
            case '/update-css':
              // If component has <style> block, use that. Otherwise use CSS file
              if (cssSetup.hasStyleBlock) {
                result = updateComponentStyle(componentPath, data.className, data.styles);
              } else if (cssSetup.componentCss) {
                result = updateCssFile(cssSetup.componentCss, data.className, data.styles);
              } else {
                throw new Error('No CSS file or <style> block found');
              }
              break;
            case '/update-component-style':
              result = updateComponentStyle(componentPath, data.className, data.styles);
              break;
            case '/update-tailwind':
              result = updateTailwindClasses(componentPath, data.oldClasses, data.newClasses);
              break;
            case '/add-class':
              result = addClassToElement(componentPath, data.tagName, data.newClassName, data.nearbyText);
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
