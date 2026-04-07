# Claude Code Viewer (VS Code extension)

This extension opens a WebView that loads `http://localhost:3000` (the UIGen dev server) so you can run the Claude Code session inside VS Code.

Commands:
- `Claude Code: Open Viewer` — open the WebView showing the running app.
- `Claude Code: Start Dev Server` — open a terminal and run `npm run dev` in the workspace root.

Quick start:

1. From the workspace root run `npm install` and `npm run setup` (if you haven't already).
2. Run the extension in Extension Development Host (F5) or build and install it as a VSIX.
3. In the extension host window, run `Claude Code: Start Dev Server` then `Claude Code: Open Viewer`.
