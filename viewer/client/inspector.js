// Inspector state
let zoom = 100;
let selectedEl = null;
let selectedClass = null;
let origClasses = '';
let inspectOn = true;
let existingStyles = {};  // Styles from CSS file
let modifiedStyles = {};  // Only styles user has changed

const $ = id => document.getElementById(id);

// Initialize
export function initInspector(apiUrl, hasTailwind) {
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
  $('zoom-fit').onclick = () => setZoom(100);
  
  // Background
  const setBg = m => { 
    canvas.dataset.bg = m; 
    ['dark','light','grid'].forEach(x => $('bg-'+x).classList.toggle('active', x===m)); 
  };
  $('bg-dark').onclick = () => setBg('dark');
  $('bg-light').onclick = () => setBg('light');
  $('bg-grid').onclick = () => setBg('grid');
  
  // Panel & inspect
  $('refresh').onclick = () => location.reload();
  $('toggle-panel').onclick = e => { 
    layout.classList.toggle('panel-open'); 
    e.target.classList.toggle('active'); 
  };
  $('panel-close').onclick = () => { 
    layout.classList.remove('panel-open'); 
    $('toggle-panel').classList.remove('active'); 
  };
  $('inspect').onclick = e => { 
    inspectOn = !inspectOn; 
    e.target.classList.toggle('active', inspectOn); 
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
    $('add-class-section').style.display = selectedClass ? 'none' : 'block';
    $('css-section').style.display = selectedClass ? 'block' : 'none';
    
    // Tailwind
    if (hasTailwind && $('tw-classes')) $('tw-classes').value = classes;
    
    // Fetch EXISTING styles from CSS file (not computed)
    existingStyles = selectedClass ? await fetchExistingStyles(selectedClass) : {};
    console.log('Existing CSS styles:', existingStyles);
    
    // Populate inputs with existing CSS values (not computed)
    populateInputs(existingStyles);
  }
  
  // Populate inputs with CSS file values only
  function populateInputs(styles) {
    // Clear all inputs first
    document.querySelectorAll('[data-prop]').forEach(inp => {
      inp.value = '';
      inp.classList.remove('has-value');
      inp.placeholder = getComputedPlaceholder(inp.dataset.prop);
    });
    
    // Clear button states
    document.querySelectorAll('.btn-row button').forEach(b => b.classList.remove('active'));
    
    // Set values from CSS file
    Object.entries(styles).forEach(([prop, value]) => {
      const inp = document.querySelector(`[data-prop="${prop}"]`);
      if (inp) {
        inp.value = value;
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
    const newCls = $('tw-classes').value.trim();
    
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
    const newCls = $('new-class-name').value.trim();
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
        $('new-class-name').value = '';
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
      $('toggle-panel').classList.add('active');
    }
  });
  
  // Wire up inputs
  document.querySelectorAll('[data-prop]').forEach(inp => {
    inp.addEventListener('input', () => {
      let v = inp.value;
      if (v && /^\d+$/.test(v) && !inp.dataset.prop.includes('olor')) v += 'px';
      applyStyle(inp.dataset.prop, v);
    });
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
  
  // Color pickers
  $('color-pick').oninput = e => { $('color').value = e.target.value; applyStyle('color', e.target.value); };
  $('bg-pick').oninput = e => { $('bg-color').value = e.target.value; applyStyle('backgroundColor', e.target.value); };
  $('border-pick').oninput = e => { $('border-color').value = e.target.value; applyStyle('borderColor', e.target.value); };
  
  // Clear buttons
  $('color-clear').onclick = () => { $('color').value = ''; applyStyle('color', ''); };
  $('bg-clear').onclick = () => { $('bg-color').value = ''; applyStyle('backgroundColor', ''); };
  $('border-clear').onclick = () => { $('border-color').value = ''; applyStyle('borderColor', ''); };
  
  // Save buttons
  if ($('save-css')) $('save-css').onclick = saveToCss;
  if ($('save-style')) $('save-style').onclick = saveToStyle;
  if ($('save-tw')) $('save-tw').onclick = saveTw;
  if ($('add-class-btn')) $('add-class-btn').onclick = addClass;
  
  // Tailwind live preview
  if ($('tw-classes')) {
    $('tw-classes').oninput = () => { 
      if (selectedEl) selectedEl.className = $('tw-classes').value; 
    };
  }
  
  // Error handling
  window.onerror = (msg, src, line, col, err) => {
    root.innerHTML = `<div style="color:#fca5a5;padding:20px;font-family:monospace;font-size:12px;">${err?.stack || msg}</div>`;
  };
}
