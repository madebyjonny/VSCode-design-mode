export function getEntryCode(framework, componentPath, cssSetup) {
  const escapedPath = componentPath.replace(/\\/g, '/');
  let cssImport = cssSetup.mainCss ? `import '${cssSetup.mainCss.replace(/\\/g, '/')}';\n` : '';
  
  if (framework === 'vue') {
    return `${cssImport}
import { createApp } from 'vue';
import Component from '${escapedPath}';
const app = createApp(Component);
app.mount('#component-root');
if (import.meta.hot) import.meta.hot.accept();
`;
  } else if (framework === 'react') {
    return `${cssImport}
import React from 'react';
import { createRoot } from 'react-dom/client';
import Component from '${escapedPath}';
const root = createRoot(document.getElementById('component-root'));
root.render(React.createElement(Component));
if (import.meta.hot) import.meta.hot.accept();
`;
  }
  return `console.error('Unknown framework');`;
}
