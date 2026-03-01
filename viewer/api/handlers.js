import fs from 'fs';
import path from 'path';

// Update CSS file with only the changed properties
export function updateCssFile(cssFile, className, styles) {
  console.log(`\nUpdating CSS for .${className}`);
  console.log(`File: ${cssFile}`);
  
  if (!cssFile) {
    throw new Error('No CSS file found');
  }
  
  if (!fs.existsSync(cssFile)) {
    throw new Error(`CSS file not found: ${cssFile}`);
  }
  
  let content = fs.readFileSync(cssFile, 'utf-8');
  
  // Build CSS props string
  const cssProps = Object.entries(styles)
    .filter(([_, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `  ${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`)
    .join('\n');
  
  if (!cssProps) {
    throw new Error('No styles to save');
  }
  
  console.log(`Properties:\n${cssProps}`);
  
  const newRule = `.${className} {\n${cssProps}\n}`;
  const classRegex = new RegExp(`\\.${className}\\s*\\{[^}]*\\}`, 's');
  
  if (classRegex.test(content)) {
    console.log('Replacing existing rule...');
    content = content.replace(classRegex, newRule);
  } else {
    console.log('Appending new rule...');
    content += `\n\n${newRule}`;
  }
  
  fs.writeFileSync(cssFile, content);
  console.log('✓ Saved\n');
  
  return { success: true, file: cssFile };
}

// Update component <style> block
export function updateComponentStyle(componentPath, className, styles) {
  console.log(`\nUpdating <style> for .${className}`);
  
  let content = fs.readFileSync(componentPath, 'utf-8');
  const ext = path.extname(componentPath);
  
  const cssProps = Object.entries(styles)
    .filter(([_, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `  ${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`)
    .join('\n');
  
  if (!cssProps) {
    throw new Error('No styles to save');
  }
  
  const newRule = `.${className} {\n${cssProps}\n}`;
  
  // Find existing <style> block
  const styleRegex = /<style([^>]*)>([\s\S]*?)<\/style>/i;
  const styleMatch = content.match(styleRegex);
  
  if (styleMatch) {
    let styleContent = styleMatch[2];
    const styleAttrs = styleMatch[1];
    const classRegex = new RegExp(`(\\.${className}\\s*\\{)[^}]*(\\})`, 's');
    
    if (classRegex.test(styleContent)) {
      console.log('Replacing existing rule in <style>...');
      // Replace just the content between { and }
      styleContent = styleContent.replace(classRegex, `$1\n${cssProps}\n$2`);
    } else {
      console.log('Appending new rule to <style>...');
      // Append the new rule, preserving existing content
      const trimmed = styleContent.trimEnd();
      styleContent = trimmed + (trimmed ? '\n\n' : '\n') + newRule + '\n';
    }
    
    // Replace the entire style block, preserving attributes like "scoped"
    content = content.replace(styleRegex, `<style${styleAttrs}>${styleContent}</style>`);
  } else {
    // Create new <style> block
    console.log(`Creating new <style> block for ${ext} file...`);
    
    if (ext === '.vue') {
      // For Vue, add after </template> or </script>
      if (content.includes('</script>')) {
        content = content.replace(/(.*<\/script>)/s, `$1\n\n<style scoped>\n${newRule}\n</style>`);
      } else if (content.includes('</template>')) {
        content = content.replace(/(.*<\/template>)/s, `$1\n\n<style scoped>\n${newRule}\n</style>`);
      } else {
        content += `\n\n<style scoped>\n${newRule}\n</style>`;
      }
    } else if (ext === '.svelte') {
      content += `\n\n<style>\n${newRule}\n</style>`;
    } else {
      throw new Error('Cannot add <style> to this file type. Use imported CSS file instead.');
    }
  }
  
  fs.writeFileSync(componentPath, content);
  console.log('✓ Saved\n');
  
  return { success: true };
}

// Update Tailwind classes
export function updateTailwindClasses(componentPath, oldClasses, newClasses) {
  let content = fs.readFileSync(componentPath, 'utf-8');
  
  if (oldClasses && content.includes(oldClasses)) {
    content = content.replace(oldClasses, newClasses);
    fs.writeFileSync(componentPath, content);
    console.log(`Updated classes: "${oldClasses}" -> "${newClasses}"`);
    return { success: true };
  }
  throw new Error('Could not find classes in component');
}

// Add class to element - careful not to corrupt Vue/React templates
export function addClassToElement(componentPath, tagName, newClassName, nearbyText) {
  let content = fs.readFileSync(componentPath, 'utf-8');
  const ext = path.extname(componentPath);
  
  console.log(`\nAdding class .${newClassName} to <${tagName}>`);
  console.log(`File: ${componentPath}`);
  
  // For Vue, we need to be very careful with the template
  if (ext === '.vue') {
    // Match the tag with optional attributes, being careful with Vue syntax
    // Look for tags that either have no class or have class=""
    const patterns = [
      // Tag with existing class="..." - append to it
      new RegExp(`(<${tagName}\\s+[^>]*class=")([^"]*)(")`, 'i'),
      // Tag with existing class='...' - append to it  
      new RegExp(`(<${tagName}\\s+[^>]*class=')([^']*)(')`,'i'),
      // Tag with no class attribute - add one
      new RegExp(`(<${tagName})(\\s[^>]*)?>`, 'i'),
    ];
    
    let modified = false;
    
    // Try to append to existing class first
    if (patterns[0].test(content)) {
      content = content.replace(patterns[0], (match, before, classes, after) => {
        modified = true;
        const newClasses = classes ? `${classes} ${newClassName}` : newClassName;
        return `${before}${newClasses}${after}`;
      });
    } else if (patterns[1].test(content)) {
      content = content.replace(patterns[1], (match, before, classes, after) => {
        modified = true;
        const newClasses = classes ? `${classes} ${newClassName}` : newClassName;
        return `${before}${newClasses}${after}`;
      });
    }
    
    // If no existing class, add new class attribute
    if (!modified) {
      const noClassPattern = new RegExp(`<${tagName}((?![^>]*\\bclass=)[^>]*)>`, 'i');
      if (noClassPattern.test(content)) {
        content = content.replace(noClassPattern, (match, attrs) => {
          modified = true;
          return `<${tagName} class="${newClassName}"${attrs}>`;
        });
      }
    }
    
    if (modified) {
      fs.writeFileSync(componentPath, content);
      console.log('✓ Class added\n');
      return { success: true };
    }
  } else {
    // For React/other files
    const classPattern = new RegExp(`(<${tagName}\\s+[^>]*className=")([^"]*)(")`, 'i');
    const noClassPattern = new RegExp(`<${tagName}((?![^>]*\\bclassName=)[^>]*)>`, 'i');
    
    if (classPattern.test(content)) {
      content = content.replace(classPattern, (match, before, classes, after) => {
        const newClasses = classes ? `${classes} ${newClassName}` : newClassName;
        return `${before}${newClasses}${after}`;
      });
      fs.writeFileSync(componentPath, content);
      console.log('✓ Class added\n');
      return { success: true };
    } else if (noClassPattern.test(content)) {
      content = content.replace(noClassPattern, (match, attrs) => {
        return `<${tagName} className="${newClassName}"${attrs}>`;
      });
      fs.writeFileSync(componentPath, content);
      console.log('✓ Class added\n');
      return { success: true };
    }
  }
  
  throw new Error(`Could not find <${tagName}> element to add class`);
}
