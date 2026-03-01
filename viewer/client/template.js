import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function generateHtml(apiPort, cssSetup) {
  const styles = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf-8');
  const inspector = fs.readFileSync(path.join(__dirname, 'inspector.js'), 'utf-8');
  
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
      <button class="tb-btn" id="zoom-out" title="Zoom Out">−</button>
      <span class="tb-val" id="zoom-val">100%</span>
      <button class="tb-btn" id="zoom-in" title="Zoom In">+</button>
      <button class="tb-btn" id="zoom-fit" title="Fit">⊡</button>
    </div>
    <div class="tb-group sep">
      <button class="tb-btn active" id="bg-dark" title="Dark">◼</button>
      <button class="tb-btn" id="bg-light" title="Light">◻</button>
      <button class="tb-btn" id="bg-grid" title="Grid">▦</button>
    </div>
    <div class="tb-group sep">
      <button class="tb-btn active" id="inspect" title="Inspect">🎯</button>
    </div>
    <div class="tb-spacer"></div>
    <div class="tb-group">
      ${cssSetup.hasTailwind ? '<span class="badge tw">TW</span>' : ''}
      ${cssSetup.hasStyleBlock ? '<span class="badge css">&lt;style&gt;</span>' : ''}
      ${!cssSetup.hasStyleBlock && cssSetup.componentCss ? '<span class="badge css">CSS</span>' : ''}
    </div>
    <div class="tb-group sep">
      <button class="tb-btn" id="refresh" title="Refresh">↻</button>
    </div>
    <div class="tb-group">
      <button class="tb-btn" id="toggle-panel" title="Panel">◧</button>
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
      <button class="panel-close" id="panel-close">✕</button>
    </div>
    
    <div id="no-sel" class="no-sel">
      <div class="no-sel-icon">🎯</div>
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
              <button class="save-btn" id="save-style" title="Save to &lt;style&gt;">⟨/⟩</button>
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
              <button data-v="flex-start">⇤</button>
              <button data-v="center">⇔</button>
              <button data-v="flex-end">⇥</button>
              <button data-v="space-between">⇹</button>
            </div>
          </div>
          <div class="row">
            <span class="row-label">Align</span>
            <div class="btn-row" id="align-btns">
              <button data-v="flex-start">⇤</button>
              <button data-v="center">⇔</button>
              <button data-v="flex-end">⇥</button>
              <button data-v="stretch">⇹</button>
            </div>
          </div>
          <p class="info-text">Blue highlight = value from CSS file</p>
        </div>
        
        <!-- Spacing -->
        <div class="panel-section">
          <div class="section-head">Spacing</div>
          <div class="row">
            <span class="row-label">Pad</span>
            <div class="input-grid">
              <input type="text" class="input-sm" data-prop="paddingTop" placeholder="T">
              <input type="text" class="input-sm" data-prop="paddingRight" placeholder="R">
              <input type="text" class="input-sm" data-prop="paddingBottom" placeholder="B">
              <input type="text" class="input-sm" data-prop="paddingLeft" placeholder="L">
            </div>
          </div>
          <div class="row">
            <span class="row-label">Margin</span>
            <div class="input-grid">
              <input type="text" class="input-sm" data-prop="marginTop" placeholder="T">
              <input type="text" class="input-sm" data-prop="marginRight" placeholder="R">
              <input type="text" class="input-sm" data-prop="marginBottom" placeholder="B">
              <input type="text" class="input-sm" data-prop="marginLeft" placeholder="L">
            </div>
          </div>
          <div class="row">
            <span class="row-label">Gap</span>
            <input type="text" class="input" data-prop="gap" placeholder="">
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
            <input type="text" class="input" data-prop="fontSize" placeholder="">
          </div>
          <div class="row">
            <span class="row-label">Weight</span>
            <div class="btn-row" id="font-weight-btns">
              <button data-v="400">4</button>
              <button data-v="500">5</button>
              <button data-v="600">6</button>
              <button data-v="700">7</button>
            </div>
          </div>
          <div class="row">
            <span class="row-label">Color</span>
            <div class="color-row">
              <input type="color" class="color-swatch" id="color-pick" value="#ffffff">
              <input type="text" class="input" data-prop="color" id="color" placeholder="">
              <button class="color-clear" id="color-clear">✕</button>
            </div>
          </div>
        </div>
        
        <!-- Background -->
        <div class="panel-section">
          <div class="section-head">Background</div>
          <div class="row">
            <span class="row-label">Color</span>
            <div class="color-row">
              <input type="color" class="color-swatch" id="bg-pick" value="#000000">
              <input type="text" class="input" data-prop="backgroundColor" id="bg-color" placeholder="">
              <button class="color-clear" id="bg-clear">✕</button>
            </div>
          </div>
        </div>
        
        <!-- Border -->
        <div class="panel-section">
          <div class="section-head">Border</div>
          <div class="row">
            <span class="row-label">Radius</span>
            <input type="text" class="input" data-prop="borderRadius" placeholder="">
          </div>
          <div class="row">
            <span class="row-label">Width</span>
            <input type="text" class="input" data-prop="borderWidth" placeholder="">
          </div>
          <div class="row">
            <span class="row-label">Color</span>
            <div class="color-row">
              <input type="color" class="color-swatch" id="border-pick" value="#000000">
              <input type="text" class="input" data-prop="borderColor" id="border-color" placeholder="">
              <button class="color-clear" id="border-clear">✕</button>
            </div>
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
${inspector}

initInspector('http://localhost:${apiPort}', ${cssSetup.hasTailwind});
</script>
</body>
</html>`;
}
