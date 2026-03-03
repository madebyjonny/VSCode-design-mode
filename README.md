# Component Preview

_i have only tested this recently with react, so vue could be broken right now _

currently 100% vibe coded, will be planning on going through this and making it production ready, but feel free to use this at your own risk 
Preview Vue/React components directly in VS Code.

<img width="1835" height="1109" alt="Screenshot 2026-03-03 at 01 01 19" src="https://github.com/user-attachments/assets/28e0e0a3-07d1-447e-9dd6-00f06e34c3b8" />
<img width="1835" height="1109" alt="Screenshot 2026-03-03 at 01 01 39" src="https://github.com/user-attachments/assets/6b5cbd0a-a234-472a-ad1b-09584ad2988a" />

## Features 

- Preview and work on components individually
- should support imported css file, tailwind (untested), and <style> in vue
- design system mode, you can supply a design-token.json file (example in the repo) which means the design panel will be restricted to those tokens and not freeform
- by default the design panel is free form and you can manually put your own values in.
- design-tokens.json file can be previewed to, and you can copy values direcly from there. 

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
