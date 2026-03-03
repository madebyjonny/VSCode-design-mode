import * as vscode from 'vscode';
import * as path from 'path';
import * as net from 'net';
import { ChildProcess, spawn } from 'child_process';

let panel: vscode.WebviewPanel | null = null;
let serverProcess: ChildProcess | null = null;
let output: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  output = vscode.window.createOutputChannel('Component Preview');

  context.subscriptions.push(
    vscode.commands.registerCommand('componentPreview.toggle', () => toggle(context))
  );
}

async function toggle(context: vscode.ExtensionContext) {
  if (panel) {
    panel.dispose();
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Open a component file first');
    return;
  }

  const filePath = editor.document.uri.fsPath;
  const ext = path.extname(filePath);
  
  // Get workspace folder
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
  const projectRoot = workspaceFolder?.uri.fsPath || path.dirname(filePath);
  
  // Detect framework or style guide mode
  let framework: string;
  let isStyleGuide = false;
  
  if (ext === '.vue') {
    framework = 'vue';
  } else if (ext === '.jsx' || ext === '.tsx') {
    framework = 'react';
  } else if (ext === '.svelte') {
    framework = 'svelte';
  } else if (ext === '.json' && (filePath.includes('token') || filePath.includes('design') || filePath.includes('brand'))) {
    framework = 'styleguide';
    isStyleGuide = true;
  } else {
    vscode.window.showWarningMessage('Unsupported file type. Use .vue, .jsx, .tsx, .svelte, or design-tokens.json');
    return;
  }

  output.clear();
  output.show();
  output.appendLine(`Starting preview for: ${filePath}`);
  output.appendLine(`Framework: ${framework}`);

  // Find available port
  const port = await findPort(5789);
  output.appendLine(`Port: ${port}`);

  // Path to the bundled viewer
  const viewerPath = path.join(context.extensionPath, 'viewer');
  const serverScript = path.join(viewerPath, 'server.js');

  output.appendLine(`Viewer path: ${viewerPath}`);

  // Start the server
  serverProcess = spawn('node', [
    serverScript,
    '--component', filePath,
    '--framework', framework,
    '--port', port.toString(),
    '--projectRoot', projectRoot
  ], {
    cwd: viewerPath,
    shell: true
  });

  serverProcess.stdout?.on('data', (data) => output.append(data.toString()));
  serverProcess.stderr?.on('data', (data) => output.append(data.toString()));
  serverProcess.on('error', (err) => output.appendLine(`Error: ${err.message}`));
  serverProcess.on('exit', (code) => output.appendLine(`Server exited: ${code}`));

  // Wait for server to be ready
  await waitForServer(port, 10000);

  // Create webview with proper security settings
  panel = vscode.window.createWebviewPanel(
    'componentPreview',
    `Preview: ${path.basename(filePath)}`,
    vscode.ViewColumn.Beside,
    { 
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  // Use srcdoc with a meta refresh as a workaround for iframe restrictions
  // Or we can fetch the content and inject it directly
  panel.webview.html = `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';">
  <style>
    body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #1e1e1e; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <iframe src="http://localhost:${port}" allow="*"></iframe>
</body>
</html>`;

  panel.onDidDispose(() => {
    panel = null;
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
      output.appendLine('Server stopped');
    }
  });
}

async function findPort(start: number): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(start, () => {
      server.close(() => resolve(start));
    });
    server.on('error', () => resolve(findPort(start + 1)));
  });
}

async function waitForServer(port: number, timeout: number): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = net.connect(port, 'localhost');
        socket.on('connect', () => { socket.destroy(); resolve(); });
        socket.on('error', reject);
      });
      return;
    } catch {
      await new Promise(r => setTimeout(r, 200));
    }
  }
}

export function deactivate() {
  if (serverProcess) {
    serverProcess.kill();
  }
}
