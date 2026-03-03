import fs from 'fs';
import path from 'path';

export function detectCssSetup(projectRoot, componentPath) {
  const result = {
    hasTailwind: false,
    hasStyleBlock: false,
    componentCss: null,
    mainCss: null,
  };

  // Check for Tailwind
  const tailwindConfig = ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs']
    .map(f => path.join(projectRoot, f))
    .find(f => fs.existsSync(f));
  
  if (tailwindConfig) {
    result.hasTailwind = true;
    console.log('Tailwind: Detected');
  }

  // Check package.json
  const pkgPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.tailwindcss) result.hasTailwind = true;
    } catch {}
  }

  // Find main CSS
  const cssLocations = [
    'src/index.css', 'src/main.css', 'src/styles/main.css',
    'src/styles/index.css', 'src/assets/main.css', 'src/app.css',
  ];

  for (const loc of cssLocations) {
    const fullPath = path.join(projectRoot, loc);
    if (fs.existsSync(fullPath)) {
      result.mainCss = fullPath;
      console.log(`Main CSS: ${loc}`);
      break;
    }
  }

  // Check component for <style> block and CSS imports
  if (fs.existsSync(componentPath)) {
    const content = fs.readFileSync(componentPath, 'utf-8');
    
    // Check for <style> block
    if (/<style[^>]*>[\s\S]*<\/style>/i.test(content)) {
      result.hasStyleBlock = true;
      console.log('Style: <style> block detected');
    }
    
    // Check for CSS import
    const cssImportMatch = content.match(/import\s+["']([^"']+\.css)["']/);
    if (cssImportMatch) {
      const cssPath = path.resolve(path.dirname(componentPath), cssImportMatch[1]);
      if (fs.existsSync(cssPath)) {
        result.componentCss = cssPath;
        console.log(`Component CSS: ${cssImportMatch[1]}`);
      }
    }
  }

  return result;
}

// Get styles for a class from CSS file
export function getClassStyles(cssFile, className) {
  if (!cssFile || !fs.existsSync(cssFile)) return null;
  
  const content = fs.readFileSync(cssFile, 'utf-8');
  const classMatch = content.match(new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`, 's'));
  
  if (!classMatch) return null;
  
  const styles = {};
  const propRegex = /([a-z-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = propRegex.exec(classMatch[1]))) {
    const prop = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    styles[prop] = m[2].trim();
  }
  
  return styles;
}

// Get styles from component's <style> block
export function getStyleBlockStyles(componentPath, className) {
  if (!fs.existsSync(componentPath)) return null;
  
  const content = fs.readFileSync(componentPath, 'utf-8');
  const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  
  if (!styleMatch) return null;
  
  const styleContent = styleMatch[1];
  const classMatch = styleContent.match(new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`, 's'));
  
  if (!classMatch) return null;
  
  const styles = {};
  const propRegex = /([a-z-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = propRegex.exec(classMatch[1]))) {
    const prop = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    styles[prop] = m[2].trim();
  }
  
  return styles;
}
