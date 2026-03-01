import '/Users/jonathanhamilton/work/my-react-app/src/app.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import Component from '/Users/jonathanhamilton/work/my-react-app/src/someComponent.tsx';
const root = createRoot(document.getElementById('component-root'));
root.render(React.createElement(Component));
if (import.meta.hot) import.meta.hot.accept();
