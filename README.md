# Component Preview

Preview Vue/React components directly in VS Code.

## Setup

```bash
# 1. Install extension dependencies
npm install

# 2. Install bundled viewer dependencies (Vue, React, Vite)
cd viewer && npm install && cd ..

# 3. Compile
npm run compile

# 4. Press F5 to test
```

## Usage

1. Open any `.vue`, `.jsx`, or `.tsx` file
2. Click the 👁 eye icon in the editor title bar
3. Component renders in a side panel

## How it works

The extension bundles its own Vite server with Vue and React pre-installed in the `viewer/` folder. When you preview a component:

1. Extension detects framework from file extension
2. Starts the bundled Vite server, pointing it at your component
3. Shows the result in a VS Code webview

Your project's dependencies are not used - this is fully isolated.
