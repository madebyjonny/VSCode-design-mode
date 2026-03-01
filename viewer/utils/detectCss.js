import path from 'path';
import fs from 'fs';

export function detectCssSetup(projectRoot, componentPath) {
  const result = { 
    hasTailwind: false, 
    mainCss: null, 
    componentCss: null,
    hasStyleBlock: false 
  };

  // Check Tailwind
  const tailwindConfig = ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs']
    .map(f => path.join(projectRoot, f)).find(f => fs.existsSync(f));
  if (tailwindConfig) result.hasTailwind = true;

  const pkgPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.dependencies?.tailwindcss || pkg.devDependencies?.tailwindcss) result.hasTailwind = true;
    } catch (e) {}
  }

  // Find main CSS
  const cssLocations = ['src/index.css', 'src/main.css', 'src/styles/main.css', 'src/assets/main.css', 'src/app.css'];
  for (const loc of cssLocations) {
    const fullPath = path.join(projectRoot, loc);
    if (fs.existsSync(fullPath)) {
      result.mainCss = fullPath;
      break;
    }
  }

  // Check component file
  if (fs.existsSync(componentPath)) {
    const content = fs.readFileSync(componentPath, 'utf-8');
    
    // Check for <style> block first (Vue, Svelte)
    if (/<style[^>]*>[\s\S]*<\/style>/i.test(content)) {
      result.hasStyleBlock = true;
      console.log('Component has <style> block');
    }
    
    // Check for CSS imports
    console.log('Scanning component for CSS imports...');
    const cssImportRegex = /import\s+["']([^"']+\.css)["']/g;
    let match;
    while ((match = cssImportRegex.exec(content)) !== null) {
      const importPath = match[1];
      console.log(`  Found: ${importPath}`);
      
      const componentDir = path.dirname(componentPath);
      const resolvedPath = path.resolve(componentDir, importPath);
      
      if (fs.existsSync(resolvedPath)) {
        result.componentCss = resolvedPath;
        console.log(`  ✓ Resolved: ${resolvedPath}`);
        break;
      }
    }
  }

  console.log(`\nTailwind:      ${result.hasTailwind ? 'Yes' : 'No'}`);
  console.log(`Style block:   ${result.hasStyleBlock ? 'Yes' : 'No'}`);
  console.log(`Main CSS:      ${result.mainCss || 'None'}`);
  console.log(`Component CSS: ${result.componentCss || 'None'}\n`);
  
  return result;
}

// Parse CSS file and extract rules for a specific class
export function getClassStyles(cssFile, className) {
  if (!cssFile || !fs.existsSync(cssFile)) return null;
  
  const content = fs.readFileSync(cssFile, 'utf-8');
  return parseStylesForClass(content, className);
}

// Parse styles from a <style> block in component
export function getStyleBlockStyles(componentPath, className) {
  if (!fs.existsSync(componentPath)) return null;
  
  const content = fs.readFileSync(componentPath, 'utf-8');
  const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  
  if (!styleMatch) return null;
  
  return parseStylesForClass(styleMatch[1], className);
}

// Helper to parse CSS content for a class
function parseStylesForClass(cssContent, className) {
  const classRegex = new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`, 's');
  const match = cssContent.match(classRegex);
  
  if (!match) return null;
  
  const styles = {};
  const propsStr = match[1];
  const propRegex = /([a-z-]+)\s*:\s*([^;]+);/gi;
  let propMatch;
  
  while ((propMatch = propRegex.exec(propsStr)) !== null) {
    const prop = propMatch[1].trim();
    const value = propMatch[2].trim();
    // Convert to camelCase
    const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    styles[camelProp] = value;
  }
  
  return styles;
}
