import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Flatten nested color tokens (e.g., {primary: {500: '#xxx'}} -> {'primary-500': '#xxx'})
function flattenColors(colors) {
  const flat = {};
  for (const [name, value] of Object.entries(colors)) {
    if (typeof value === 'string') {
      flat[name] = value;
    } else {
      for (const [shade, color] of Object.entries(value)) {
        flat[`${name}-${shade}`] = color;
      }
    }
  }
  return flat;
}

// Helper to create token dropdown or regular input
function tokenInput(prop, placeholder, tokens, tokenKey) {
  if (tokens && tokens[tokenKey]) {
    let opts = '<option value="">—</option>';
    for (const [name, val] of Object.entries(tokens[tokenKey])) {
      opts += `<option value="${name}" data-value="${val}">${name} (${val})</option>`;
    }
    return `<select class="input-sm token-select" data-prop="${prop}">${opts}</select>`;
  }
  return `<input type="text" class="input-sm" data-prop="${prop}" placeholder="${placeholder}">`;
}

function tokenInputFull(prop, tokens, tokenKey) {
  if (tokens && tokens[tokenKey]) {
    let opts = '<option value="">—</option>';
    for (const [name, val] of Object.entries(tokens[tokenKey])) {
      opts += `<option value="${name}" data-value="${val}">${name} (${val})</option>`;
    }
    return `<select class="input token-select" data-prop="${prop}">${opts}</select>`;
  }
  return `<input type="text" class="input" data-prop="${prop}" placeholder="">`;
}

function colorInput(prop, pickerId, inputId, clearId, tokens) {
  const hasColorTokens = tokens && tokens.colors;
  if (hasColorTokens) {
    const flatColors = flattenColors(tokens.colors);
    let opts = '<option value="">—</option>';
    for (const [name, val] of Object.entries(flatColors)) {
      opts += `<option value="${name}" data-value="${val}" style="background:${val}">${name}</option>`;
    }
    return `<select class="input token-select color-token-select" data-prop="${prop}" id="${inputId}">${opts}</select>`;
  }
  return `<div class="color-row">
    <input type="color" class="color-swatch" id="${pickerId}" value="#ffffff">
    <input type="text" class="input" data-prop="${prop}" id="${inputId}" placeholder="">
    <button class="color-clear" id="${clearId}">✕</button>
  </div>`;
}

function fontSizeInput(tokens) {
  if (tokens && tokens.typography && tokens.typography.fontSize) {
    let opts = '<option value="">—</option>';
    for (const [name, val] of Object.entries(tokens.typography.fontSize)) {
      opts += `<option value="${name}" data-value="${val}">${name} (${val})</option>`;
    }
    return `<select class="input token-select" data-prop="fontSize">${opts}</select>`;
  }
  return '<input type="text" class="input" data-prop="fontSize" placeholder="">';
}

function borderRadiusInput(tokens) {
  if (tokens && tokens.borderRadius) {
    let opts = '<option value="">—</option>';
    for (const [name, val] of Object.entries(tokens.borderRadius)) {
      opts += `<option value="${name}" data-value="${val}">${name} (${val})</option>`;
    }
    return `<select class="input token-select" data-prop="borderRadius">${opts}</select>`;
  }
  return '<input type="text" class="input" data-prop="borderRadius" placeholder="">';
}

// Lucide icon SVGs
const icons = {
  zoomOut: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
  zoomIn: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
  zoomFit: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1"/></svg>',
  dark: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  light: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  grid: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  target: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  refresh: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
  panel: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
  close: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  crosshair: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>',
};

export function generateHtml(apiPort, cssSetup, tokens) {
  const styles = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf-8');
  const inspector = fs.readFileSync(path.join(__dirname, 'inspector.js'), 'utf-8');
  
  const hasTokens = tokens !== null && Object.keys(tokens).length > 0;
  const hasColorTokens = !!(hasTokens && tokens.colors);
  const tokensJson = JSON.stringify(tokens || {});
  
  // Spacing inputs
  const padT = tokenInput('paddingTop', 'T', tokens, 'spacing');
  const padR = tokenInput('paddingRight', 'R', tokens, 'spacing');
  const padB = tokenInput('paddingBottom', 'B', tokens, 'spacing');
  const padL = tokenInput('paddingLeft', 'L', tokens, 'spacing');
  const marT = tokenInput('marginTop', 'T', tokens, 'spacing');
  const marR = tokenInput('marginRight', 'R', tokens, 'spacing');
  const marB = tokenInput('marginBottom', 'B', tokens, 'spacing');
  const marL = tokenInput('marginLeft', 'L', tokens, 'spacing');
  const gapInput = tokenInputFull('gap', tokens, 'spacing');
  const fontSizeIn = fontSizeInput(tokens);
  const borderRadIn = borderRadiusInput(tokens);
  
  // Color inputs
  const textColorInput = colorInput('color', 'color-pick', 'color', 'color-clear', tokens);
  const bgColorInput = colorInput('backgroundColor', 'bg-pick', 'bg-color', 'bg-clear', tokens);
  const borderColorInput = colorInput('borderColor', 'border-pick', 'border-color', 'border-clear', tokens);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>${styles}</style>
</head>
<body>
<div class="layout" id="layout">
  <div class="toolbar">
    <div class="tb-group sep">
      <button class="tb-btn" id="zoom-out" title="Zoom Out">${icons.zoomOut}</button>
      <span class="tb-val" id="zoom-val">100%</span>
      <button class="tb-btn" id="zoom-in" title="Zoom In">${icons.zoomIn}</button>
      <button class="tb-btn" id="zoom-fit" title="Fit">${icons.zoomFit}</button>
    </div>
    <div class="tb-group sep">
      <button class="tb-btn active" id="bg-dark" title="Dark">${icons.dark}</button>
      <button class="tb-btn" id="bg-light" title="Light">${icons.light}</button>
      <button class="tb-btn" id="bg-grid" title="Grid">${icons.grid}</button>
    </div>
    <div class="tb-group sep">
      <button class="tb-btn active" id="inspect" title="Inspect">${icons.target}</button>
    </div>
    <div class="tb-spacer"></div>
    <div class="tb-group">
      ${cssSetup.hasTailwind ? '<span class="badge tw">TW</span>' : ''}
      ${cssSetup.hasStyleBlock ? '<span class="badge css">&lt;style&gt;</span>' : ''}
      ${!cssSetup.hasStyleBlock && cssSetup.componentCss ? '<span class="badge css">CSS</span>' : ''}
      ${hasTokens ? '<span class="badge tokens">Tokens</span>' : ''}
    </div>
    <div class="tb-group sep">
      <button class="tb-btn" id="refresh" title="Refresh">${icons.refresh}</button>
    </div>
    <div class="tb-group">
      <button class="tb-btn" id="toggle-panel" title="Panel">${icons.panel}</button>
    </div>
    <div class="status" id="status">
      <span class="status-dot"></span>
      <span id="status-txt">Ready</span>
    </div>
  </div>
  
  <div class="canvas-wrap">
    <div class="canvas" id="canvas" data-bg="dark">
      <div id="component-root"></div>
    </div>
    <div class="highlight" id="highlight"><span class="highlight-label" id="hl-label"></span></div>
  </div>
  
  <div class="panel" id="panel">
    <div class="panel-head">
      <div>
        <div class="panel-title">Inspector <span class="el-tag" id="el-tag">—</span></div>
        <div class="el-class" id="el-class"></div>
      </div>
      <button class="panel-close" id="panel-close">${icons.close}</button>
    </div>
    
    ${hasTokens ? '<div id="violations" class="violations" style="display:none;"><div class="violations-title">⚠️ Token Violations</div><div id="violations-list"></div></div>' : ''}
    
    <div id="no-sel" class="no-sel">
      <div class="no-sel-icon">${icons.crosshair}</div>
      <div class="no-sel-text">Click an element to inspect</div>
    </div>
    
    <div id="controls" style="display:none;">
      <!-- Add Class Section -->
      <div class="panel-section" id="add-class-section" style="display:none;">
        <div class="section-head">Add Class</div>
        <div class="add-class-row">
          <input type="text" class="input" id="new-class-name" placeholder="Enter class name...">
          <button class="save-btn" id="add-class-btn" style="width:100%;margin-top:6px;">Add Class</button>
        </div>
      </div>
      
      ${cssSetup.hasTailwind ? `
      <!-- Tailwind -->
      <div class="panel-section">
        <div class="section-head">Tailwind <button class="save-btn" id="save-tw">Save</button></div>
        <textarea class="tw-area" id="tw-classes" placeholder="Tailwind classes..."></textarea>
      </div>
      ` : ''}
      
      <!-- CSS Controls -->
      <div id="css-section">
        <div class="panel-section">
          <div class="section-head">
            Layout
            <div class="save-row">
              <button class="save-btn" id="save-style" title="Save to &lt;style&gt;">Style</button>
              <button class="save-btn" id="save-css" title="Save to CSS file" disabled>Save</button>
            </div>
          </div>
          <div class="row">
            <span class="row-label">Display</span>
            <div class="btn-row" id="display-btns">
              <button data-v="block">Blk</button>
              <button data-v="flex">Flx</button>
              <button data-v="grid">Grd</button>
              <button data-v="inline">Inl</button>
            </div>
          </div>
          <div class="row">
            <span class="row-label">Flex Dir</span>
            <div class="btn-row" id="flex-dir-btns">
              <button data-v="row">Row</button>
              <button data-v="column">Col</button>
            </div>
          </div>
          <div class="row">
            <span class="row-label">Justify</span>
            <div class="btn-row" id="justify-btns">
              <button data-v="flex-start">Start</button>
              <button data-v="center">Center</button>
              <button data-v="flex-end">End</button>
              <button data-v="space-between">Between</button>
            </div>
          </div>
          <div class="row">
            <span class="row-label">Align</span>
            <div class="btn-row" id="align-btns">
              <button data-v="flex-start">Start</button>
              <button data-v="center">Center</button>
              <button data-v="flex-end">End</button>
              <button data-v="stretch">Stretch</button>
            </div>
          </div>
          <p class="info-text">${hasTokens ? 'Token mode: values restricted to design tokens' : 'Blue highlight = value from CSS file'}</p>
        </div>
        
        <!-- Spacing -->
        <div class="panel-section">
          <div class="section-head">Spacing</div>
          <div class="row">
            <span class="row-label">Pad</span>
            <div class="input-grid">${padT}${padR}${padB}${padL}</div>
          </div>
          <div class="row">
            <span class="row-label">Margin</span>
            <div class="input-grid">${marT}${marR}${marB}${marL}</div>
          </div>
          <div class="row">
            <span class="row-label">Gap</span>
            ${gapInput}
          </div>
        </div>
        
        <!-- Size -->
        <div class="panel-section">
          <div class="section-head">Size</div>
          <div class="row">
            <span class="row-label">Width</span>
            <input type="text" class="input" data-prop="width" placeholder="">
          </div>
          <div class="row">
            <span class="row-label">Height</span>
            <input type="text" class="input" data-prop="height" placeholder="">
          </div>
        </div>
        
        <!-- Typography -->
        <div class="panel-section">
          <div class="section-head">Type</div>
          <div class="row">
            <span class="row-label">Size</span>
            ${fontSizeIn}
          </div>
          <div class="row">
            <span class="row-label">Weight</span>
            <div class="btn-row" id="font-weight-btns">
              <button data-v="400">400</button>
              <button data-v="500">500</button>
              <button data-v="600">600</button>
              <button data-v="700">700</button>
            </div>
          </div>
          <div class="row">
            <span class="row-label">Color</span>
            ${textColorInput}
          </div>
        </div>
        
        <!-- Background -->
        <div class="panel-section">
          <div class="section-head">Background</div>
          <div class="row">
            <span class="row-label">Color</span>
            ${bgColorInput}
          </div>
        </div>
        
        <!-- Border -->
        <div class="panel-section">
          <div class="section-head">Border</div>
          <div class="row">
            <span class="row-label">Radius</span>
            ${borderRadIn}
          </div>
          <div class="row">
            <span class="row-label">Width</span>
            <input type="text" class="input" data-prop="borderWidth" placeholder="">
          </div>
          <div class="row">
            <span class="row-label">Color</span>
            ${borderColorInput}
          </div>
          <div class="row">
            <span class="row-label">Style</span>
            <div class="btn-row" id="border-style-btns">
              <button data-v="none">None</button>
              <button data-v="solid">Solid</button>
              <button data-v="dashed">Dash</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<script type="module" src="./entry.js"></script>
<script type="module">
const DESIGN_TOKENS = ${tokensJson};
const HAS_COLOR_TOKENS = ${hasColorTokens};
${inspector}

initInspector('http://localhost:${apiPort}', ${cssSetup.hasTailwind}, DESIGN_TOKENS, HAS_COLOR_TOKENS);
</script>
</body>
</html>`;
}

// Style guide viewer for design-tokens.json
export function generateStyleGuideHtml(tokens) {
  const name = tokens.name || 'Design Tokens';
  
  let colorsHtml = '';
  if (tokens.colors) {
    colorsHtml = '<div class="section"><h2>Colors</h2><div class="grid">';
    for (const [colorName, value] of Object.entries(tokens.colors)) {
      if (typeof value === 'string') {
        colorsHtml += `<div class="item" onclick="copyValue('${value}')"><div class="swatch" style="background:${value}"></div><div class="name">${colorName}</div><div class="value">${value}</div></div>`;
      } else {
        for (const [tint, color] of Object.entries(value)) {
          colorsHtml += `<div class="item" onclick="copyValue('${color}')"><div class="swatch" style="background:${color}"></div><div class="name">${colorName}-${tint}</div><div class="value">${color}</div></div>`;
        }
      }
    }
    colorsHtml += '</div></div>';
  }
  
  let spacingHtml = '';
  if (tokens.spacing) {
    spacingHtml = '<div class="section"><h2>Spacing</h2><div class="grid">';
    for (const [spaceName, value] of Object.entries(tokens.spacing)) {
      const size = Math.min(parseInt(value) || 8, 60);
      spacingHtml += `<div class="item" onclick="copyValue('${value}')"><div class="spacing-box" style="width:${size}px;height:${size}px"></div><div class="name">${spaceName}</div><div class="value">${value}</div></div>`;
    }
    spacingHtml += '</div></div>';
  }
  
  let fontSizeHtml = '';
  if (tokens.typography && tokens.typography.fontSize) {
    fontSizeHtml = '<div class="section"><h2>Font Sizes</h2><div class="grid">';
    for (const [sizeName, value] of Object.entries(tokens.typography.fontSize)) {
      fontSizeHtml += `<div class="item" onclick="copyValue('${value}')"><div class="type-preview" style="font-size:${value}">Aa</div><div class="name">${sizeName}</div><div class="value">${value}</div></div>`;
    }
    fontSizeHtml += '</div></div>';
  }
  
  let radiusHtml = '';
  if (tokens.borderRadius) {
    radiusHtml = '<div class="section"><h2>Border Radius</h2><div class="grid">';
    for (const [radiusName, value] of Object.entries(tokens.borderRadius)) {
      radiusHtml += `<div class="item" onclick="copyValue('${value}')"><div class="radius-preview" style="border-radius:${value}"></div><div class="name">${radiusName}</div><div class="value">${value}</div></div>`;
    }
    radiusHtml += '</div></div>';
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${name} - Style Guide</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font: 14px system-ui, sans-serif; background: #09090b; color: #fafafa; padding: 32px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    .subtitle { color: #a1a1aa; margin-bottom: 40px; }
    .section { margin-bottom: 48px; }
    .section h2 { font-size: 18px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #27272a; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
    .item { background: #18181b; border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.15s; border: 1px solid transparent; }
    .item:hover { transform: translateY(-2px); background: #27272a; border-color: #3b82f6; }
    .swatch { width: 100%; height: 60px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #27272a; }
    .spacing-box { background: #3b82f6; border-radius: 4px; margin-bottom: 12px; }
    .type-preview { margin-bottom: 12px; min-height: 48px; display: flex; align-items: center; color: #fafafa; }
    .radius-preview { width: 50px; height: 50px; background: #3b82f6; margin-bottom: 12px; }
    .name { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
    .value { font-size: 11px; color: #a1a1aa; font-family: monospace; }
    .toast { position: fixed; bottom: 24px; right: 24px; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; opacity: 0; transform: translateY(10px); transition: all 0.2s; }
    .toast.show { opacity: 1; transform: translateY(0); }
  </style>
</head>
<body>
  <div class="container">
    <h1>${name}</h1>
    <p class="subtitle">Click any item to copy its value</p>
    ${colorsHtml}
    ${spacingHtml}
    ${fontSizeHtml}
    ${radiusHtml}
  </div>
  <div class="toast" id="toast">Copied!</div>
  <script>
    function copyValue(val) {
      // Use textarea fallback for VS Code webview compatibility
      const textarea = document.createElement('textarea');
      textarea.value = val;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      const toast = document.getElementById('toast');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1500);
    }
  </script>
</body>
</html>`;
}
