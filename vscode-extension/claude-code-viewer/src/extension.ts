import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const openCmd = vscode.commands.registerCommand('claudeCode.open', () => {
    const panel = vscode.window.createWebviewPanel(
      'claudeCodeViewer',
      'Claude Code Viewer',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    const iframeSrc = 'http://localhost:3000';

    panel.webview.html = getWebviewContent(iframeSrc);
  });

  const startCmd = vscode.commands.registerCommand('claudeCode.startServer', () => {
    const terminal = vscode.window.createTerminal({ name: 'Claude Code Dev' });
    // Change cwd to workspace root if available
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const rootPath = workspaceFolders[0].uri.fsPath;
      // Use PowerShell-friendly command on Windows
      const cmd = process.platform === 'win32' ? `cd /d "${rootPath}"; npm run dev` : `cd "${rootPath}" && npm run dev`;
      terminal.sendText(cmd);
    } else {
      terminal.sendText('npm run dev');
    }
    terminal.show();
  });

  context.subscriptions.push(openCmd, startCmd);
}

export function deactivate() {}

function getWebviewContent(iframeSrc: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      html, body, iframe { height: 100%; margin: 0; padding: 0; border: 0; }
      iframe { width: 100%; border: none; }
    </style>
  </head>
  <body>
    <iframe src="${iframeSrc}" sandbox="allow-scripts allow-forms allow-same-origin allow-popups"></iframe>
  </body>
</html>`;
}
