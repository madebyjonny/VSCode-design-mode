// Inspector state
let zoom = 100;
let selectedEl = null;
let selectedClass = null;
let origClasses = '';
let inspectOn = true;
let existingStyles = {};
let modifiedStyles = {};
let designTokens = null;

const $ = id => document.getElementById(id);

// Check for token violations
function checkViolations(styles) {
  if (!designTokens) return [];
  const violations = [];
  
  const checkAgainstTokens = (prop, value, tokenSet, tokenName) => {
    if (!value || !tokenSet) return;
    const tokenValues = Object.values(tokenSet);
    const normalized = value.replace(/\s/g, '');
    if (!tokenValues.some(v => String(v).replace(/\s/g, '') === normalized)) {
      let suggestion = null;
      const numVal = parseFloat(value);
      if (!isNaN(numVal)) {
        let minDiff = Infinity;
        for (const [name, val] of Object.entries(tokenSet)) {
          const diff = Math.abs(parseFloat(val) - numVal);
          if (diff < minDiff) { minDiff = diff; suggestion = { name, value: val }; }
        }
      }
      violations.push({ prop, value, tokenName, suggestion });
    }
  };
  
  if (designTokens.spacing) {
    ['paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginRight','marginBottom','marginLeft','gap'].forEach(p => {
      if (styles[p]) checkAgainstTokens(p, styles[p], designTokens.spacing, 'spacing');
    });
  }
  if (designTokens.typography?.fontSize && styles.fontSize) {
    checkAgainstTokens('fontSize', styles.fontSize, designTokens.typography.fontSize, 'fontSize');
  }
  if (designTokens.borderRadius && styles.borderRadius) {
    checkAgainstTokens('borderRadius', styles.borderRadius, designTokens.borderRadius, 'borderRadius');
  }
  if (designTokens.colors) {
    // Flatten colors for checking
    const flatColors = {};
    for (const [name, val] of Object.entries(designTokens.colors)) {
      if (typeof val === 'string') flatColors[name] = val;
      else for (const [shade, color] of Object.entries(val)) flatColors[`${name}-${shade}`] = color;
    }
    ['color', 'backgroundColor', 'borderColor'].forEach(p => {
      if (styles[p]) checkAgainstTokens(p, styles[p], flatColors, 'colors');
    });
  }
  return violations;
}

function showViolations(violations, applyStyleFn) {
  const container = $('violations');
  const list = $('violations-list');
  if (!container || !list) return;
  
  if (violations.length === 0) { container.style.display = 'none'; return; }
  
  container.style.display = 'block';
  list.innerHTML = violations.map(v => {
    const fix = v.suggestion ? `<span class="violation-fix" data-prop="${v.prop}" data-value="${v.suggestion.value}">→ ${v.suggestion.name}</span>` : '';
    return `<div class="violation"><span class="violation-prop">${v.prop}: ${v.value}</span>${fix}</div>`;
  }).join('');
  
  list.querySelectorAll('.violation-fix').forEach(el => {
    el.onclick = () => {
      applyStyleFn(el.dataset.prop, el.dataset.value);
      const inp = document.querySelector(`[data-prop="${el.dataset.prop}"]`);
      if (inp) {
        if (inp.tagName === 'SELECT') {
          for (let i = 0; i < inp.options.length; i++) {
            if (inp.options[i].dataset.value === el.dataset.value) { inp.selectedIndex = i; break; }
          }
        } else {
          inp.value = el.dataset.value;
        }
        inp.classList.add('has-value');
      }
    };
  });
}

// Initialize
export function initInspector(apiUrl, hasTailwind, tokens, hasColorTokens) {
  designTokens = tokens && Object.keys(tokens).length > 0 ? tokens : null;
  
  const layout = $('layout');
  const canvas = $('canvas');
  const root = $('component-root');
  const hl = $('highlight');
  const hlLabel = $('hl-label');
  
  // Zoom
  const setZoom = v => { 
    zoom = Math.max(25, Math.min(400, v)); 
    root.style.transform = `scale(${zoom/100})`; 
    $('zoom-val').textContent = zoom+'%'; 
  };
  $('zoom-in').onclick = () => setZoom(zoom + 25);
  $('zoom-out').onclick = () => setZoom(zoom - 25);
  if ($('zoom-fit')) $('zoom-fit').onclick = () => setZoom(100);
  
  // Background
  const setBg = m => { 
    canvas.dataset.bg = m; 
    ['dark','light','grid'].forEach(x => {
      const el = $('bg-'+x);
      if (el) el.classList.toggle('active', x===m);
    }); 
  };
  if ($('bg-dark')) $('bg-dark').onclick = () => setBg('dark');
  if ($('bg-light')) $('bg-light').onclick = () => setBg('light');
  if ($('bg-grid')) $('bg-grid').onclick = () => setBg('grid');
  
  // Panel & inspect
  if ($('refresh')) $('refresh').onclick = () => location.reload();
  if ($('toggle-panel')) $('toggle-panel').onclick = e => { 
    layout.classList.toggle('panel-open'); 
    const btn = e.target.closest('.tb-btn') || e.target;
    btn.classList.toggle('active'); 
  };
  if ($('panel-close')) $('panel-close').onclick = () => { 
    layout.classList.remove('panel-open'); 
    const btn = $('toggle-panel');
    if (btn) btn.classList.remove('active'); 
  };
  if ($('inspect')) $('inspect').onclick = e => { 
    inspectOn = !inspectOn; 
    const btn = e.target.closest('.tb-btn') || e.target;
    btn.classList.toggle('active', inspectOn); 
    if (!inspectOn) hl.style.display = 'none'; 
  };
  
  // Highlight
  const updateHl = el => {
    if (!el || !inspectOn) { hl.style.display = 'none'; return; }
    const r = el.getBoundingClientRect();
    Object.assign(hl.style, { display: 'block', left: r.left+'px', top: r.top+'px', width: r.width+'px', height: r.height+'px' });
    const cls = el.className && typeof el.className === 'string' ? '.'+el.className.split(' ').filter(c=>c).slice(0,2).join('.') : '';
    hlLabel.textContent = el.tagName.toLowerCase() + cls;
  };
  
  // Fetch existing styles from CSS file
  async function fetchExistingStyles(className) {
    try {
      const res = await fetch(`${apiUrl}/get-styles?class=${className}`);
      const data = await res.json();
      return data.styles || {};
    } catch {
      return {};
    }
  }
  
  // Select element
  async function selectEl(el) {
    selectedEl = el;
    modifiedStyles = {};
    
    if (!el) {
      $('el-tag').textContent = '—';
      $('el-class').textContent = '';
      $('no-sel').style.display = 'block';
      $('controls').style.display = 'none';
      return;
    }
    
    const tag = el.tagName.toLowerCase();
    const classes = (el.className && typeof el.className === 'string') ? el.className.trim() : '';
    selectedClass = classes.split(' ')[0] || null;
    origClasses = classes;
    
    $('el-tag').textContent = tag;
    $('el-class').textContent = classes ? '.' + classes.replace(/\s+/g, ' .') : '(no class)';
    $('no-sel').style.display = 'none';
    $('controls').style.display = 'block';
    
    // Show add class section if no class
    if ($('add-class-section')) $('add-class-section').style.display = selectedClass ? 'none' : 'block';
    if ($('css-section')) $('css-section').style.display = selectedClass ? 'block' : 'none';
    
    // Tailwind
    if (hasTailwind && $('tw-classes')) $('tw-classes').value = classes;
    
    // Fetch EXISTING styles from CSS file (not computed)
    existingStyles = selectedClass ? await fetchExistingStyles(selectedClass) : {};
    console.log('Existing CSS styles:', existingStyles);
    
    // Populate inputs with existing CSS values (not computed)
    populateInputs(existingStyles);
    
    // Check for token violations
    if (designTokens) {
      const violations = checkViolations(existingStyles);
      showViolations(violations, applyStyle);
    }
  }
  
  // Populate inputs with CSS file values only
  function populateInputs(styles) {
    // Clear all inputs first
    document.querySelectorAll('[data-prop]').forEach(inp => {
      if (inp.tagName === 'SELECT') {
        inp.selectedIndex = 0;
      } else {
        inp.value = '';
        inp.placeholder = getComputedPlaceholder(inp.dataset.prop);
      }
      inp.classList.remove('has-value');
    });
    
    // Clear button states
    document.querySelectorAll('.btn-row button').forEach(b => b.classList.remove('active'));
    
    // Set values from CSS file
    Object.entries(styles).forEach(([prop, value]) => {
      const inp = document.querySelector(`[data-prop="${prop}"]`);
      if (inp) {
        if (inp.tagName === 'SELECT') {
          // Find option with matching data-value
          for (let i = 0; i < inp.options.length; i++) {
            if (inp.options[i].dataset.value === value) {
              inp.selectedIndex = i;
              break;
            }
          }
        } else {
          inp.value = value;
        }
        inp.classList.add('has-value');
      }
      
      // Handle button groups
      const btnGroup = document.querySelector(`#${prop}-btns`);
      if (btnGroup) {
        const btn = btnGroup.querySelector(`[data-v="${value}"]`);
        if (btn) btn.classList.add('active');
      }
    });
  }
  
  // Get computed value as placeholder
  function getComputedPlaceholder(prop) {
    if (!selectedEl) return '';
    const cs = getComputedStyle(selectedEl);
    const val = cs[prop];
    // Simplify for display
    if (val && val.startsWith('rgb')) {
      return val;
    }
    if (val && val.endsWith('px')) {
      const num = parseFloat(val);
      return Number.isInteger(num) ? num + 'px' : Math.round(num) + 'px';
    }
    return val || '';
  }
  
  // Apply style live (preview only)
  function applyStyle(prop, value) {
    if (!selectedEl) return;
    selectedEl.style[prop] = value;
    modifiedStyles[prop] = value;
    
    // Mark input as having a value
    const inp = document.querySelector(`[data-prop="${prop}"]`);
    if (inp) inp.classList.toggle('has-value', !!value);
    
    updateSaveButton();
    
    // Re-check violations
    if (designTokens) {
      const allStyles = { ...existingStyles, ...modifiedStyles };
      const violations = checkViolations(allStyles);
      showViolations(violations, applyStyle);
    }
  }
  
  // Update save button state
  function updateSaveButton() {
    const hasChanges = Object.keys(modifiedStyles).length > 0;
    const saveBtn = $('save-css');
    if (saveBtn) {
      saveBtn.disabled = !hasChanges || !selectedClass;
      saveBtn.textContent = hasChanges ? `Save (${Object.keys(modifiedStyles).length})` : 'Save';
    }
  }
  
  // Status
  const setStatus = (type, txt) => { 
    $('status').className = 'status ' + type; 
    $('status-txt').textContent = txt; 
  };
  
  // Save ONLY modified styles to CSS file
  async function saveToCss() {
    if (!selectedClass || !Object.keys(modifiedStyles).length) return;
    
    setStatus('saving', 'Saving...');
    
    // Merge existing with modified
    const stylesToSave = { ...existingStyles, ...modifiedStyles };
    
    try {
      const res = await fetch(`${apiUrl}/update-css`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ className: selectedClass, styles: stylesToSave })
      });
      
      if (res.ok) {
        setStatus('', 'Saved!');
        existingStyles = stylesToSave;
        modifiedStyles = {};
        updateSaveButton();
        setTimeout(() => setStatus('', 'Ready'), 1500);
      } else {
        const e = await res.json();
        setStatus('error', e.error);
      }
    } catch {
      setStatus('error', 'Save failed');
    }
  }
  
  // Save to component <style>
  async function saveToStyle() {
    if (!selectedClass || !Object.keys(modifiedStyles).length) return;
    
    setStatus('saving', 'Saving...');
    const stylesToSave = { ...existingStyles, ...modifiedStyles };
    
    try {
      const res = await fetch(`${apiUrl}/update-component-style`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ className: selectedClass, styles: stylesToSave })
      });
      
      if (res.ok) {
        setStatus('', 'Saved!');
        existingStyles = stylesToSave;
        modifiedStyles = {};
        updateSaveButton();
        setTimeout(() => setStatus('', 'Ready'), 1500);
      } else {
        const e = await res.json();
        setStatus('error', e.error);
      }
    } catch {
      setStatus('error', 'Save failed');
    }
  }
  
  // Save Tailwind
  async function saveTw() {
    if (!selectedEl) return;
    const twInput = $('tw-classes');
    if (!twInput) return;
    const newCls = twInput.value.trim();
    
    setStatus('saving', 'Saving...');
    try {
      const res = await fetch(`${apiUrl}/update-tailwind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldClasses: origClasses, newClasses: newCls })
      });
      
      if (res.ok) {
        setStatus('', 'Saved!');
        selectedEl.className = newCls;
        origClasses = newCls;
        setTimeout(() => setStatus('', 'Ready'), 1500);
      } else {
        const e = await res.json();
        setStatus('error', e.error);
      }
    } catch {
      setStatus('error', 'Save failed');
    }
  }
  
  // Add class
  async function addClass() {
    if (!selectedEl) return;
    const nameInput = $('new-class-name');
    if (!nameInput) return;
    const newCls = nameInput.value.trim();
    if (!newCls) return;
    
    setStatus('saving', 'Adding...');
    try {
      const res = await fetch(`${apiUrl}/add-class`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tagName: selectedEl.tagName.toLowerCase(), 
          newClassName: newCls 
        })
      });
      
      if (res.ok) {
        selectedEl.classList.add(newCls);
        setStatus('', 'Added!');
        nameInput.value = '';
        selectEl(selectedEl);
        setTimeout(() => setStatus('', 'Ready'), 1500);
      } else {
        const e = await res.json();
        setStatus('error', e.error);
      }
    } catch {
      setStatus('error', 'Failed');
    }
  }
  
  // Events
  root.addEventListener('mousemove', e => {
    if (!inspectOn) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && root.contains(el) && el !== root) updateHl(el);
  });
  
  root.addEventListener('mouseleave', () => { 
    if (!selectedEl) hl.style.display = 'none'; 
  });
  
  root.addEventListener('click', e => {
    if (!inspectOn) return;
    e.preventDefault(); 
    e.stopPropagation();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && root.contains(el) && el !== root) { 
      selectEl(el); 
      updateHl(el);
      layout.classList.add('panel-open');
      const toggleBtn = $('toggle-panel');
      if (toggleBtn) toggleBtn.classList.add('active');
    }
  });
  
  // Wire up inputs - handle both regular inputs and token selects
  document.querySelectorAll('[data-prop]').forEach(inp => {
    if (inp.tagName === 'SELECT') {
      inp.addEventListener('change', () => {
        const opt = inp.options[inp.selectedIndex];
        const value = opt && opt.dataset.value ? opt.dataset.value : '';
        applyStyle(inp.dataset.prop, value);
      });
    } else {
      inp.addEventListener('input', () => {
        let v = inp.value;
        if (v && /^\d+$/.test(v) && !inp.dataset.prop.includes('olor')) v += 'px';
        applyStyle(inp.dataset.prop, v);
      });
    }
  });
  
  // Button groups
  document.querySelectorAll('.btn-row button[data-v]').forEach(btn => {
    btn.onclick = () => {
      const prop = btn.closest('.btn-row').id.replace('-btns', '');
      const propMap = {
        'display': 'display',
        'flex-dir': 'flexDirection',
        'justify': 'justifyContent',
        'align': 'alignItems',
        'font-weight': 'fontWeight',
        'border-style': 'borderStyle'
      };
      const cssProp = propMap[prop] || prop;
      applyStyle(cssProp, btn.dataset.v);
      btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });
  
  // Color pickers (only exist when not using color tokens)
  const colorPick = $('color-pick');
  const bgPick = $('bg-pick');
  const borderPick = $('border-pick');
  
  if (colorPick) colorPick.oninput = e => { $('color').value = e.target.value; applyStyle('color', e.target.value); };
  if (bgPick) bgPick.oninput = e => { $('bg-color').value = e.target.value; applyStyle('backgroundColor', e.target.value); };
  if (borderPick) borderPick.oninput = e => { $('border-color').value = e.target.value; applyStyle('borderColor', e.target.value); };
  
  // Clear buttons
  const colorClear = $('color-clear');
  const bgClear = $('bg-clear');
  const borderClear = $('border-clear');
  
  if (colorClear) colorClear.onclick = () => { $('color').value = ''; applyStyle('color', ''); };
  if (bgClear) bgClear.onclick = () => { $('bg-color').value = ''; applyStyle('backgroundColor', ''); };
  if (borderClear) borderClear.onclick = () => { $('border-color').value = ''; applyStyle('borderColor', ''); };
  
  // Save buttons
  if ($('save-css')) $('save-css').onclick = saveToCss;
  if ($('save-style')) $('save-style').onclick = saveToStyle;
  if ($('save-tw')) $('save-tw').onclick = saveTw;
  if ($('add-class-btn')) $('add-class-btn').onclick = addClass;
  
  // Tailwind live preview
  const twClasses = $('tw-classes');
  if (twClasses) {
    twClasses.oninput = () => { 
      if (selectedEl) selectedEl.className = twClasses.value; 
    };
  }
  
  // Error handling
  window.onerror = (msg, src, line, col, err) => {
    root.innerHTML = `<div style="color:#fca5a5;padding:20px;font-family:monospace;font-size:12px;">${err?.stack || msg}</div>`;
  };
}
