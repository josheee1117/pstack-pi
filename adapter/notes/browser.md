# Browser and UI driving on Pi

Upstream drives web and Electron UIs with Cursor's `control-ui` skill and uses CDP for traces and in-page eval. On Pi, use an MCP server through pi-mcp-adapter. Check what this session has with `mcp({})`.

## What to use

| Need | Use |
|---|---|
| Click, type, navigate, screenshot, console and network logs | Chrome DevTools MCP (`chrome-devtools-mcp`): `navigate_page`, `click`, `fill`, `take_screenshot`, console and network tools |
| CDP performance trace (perf-issue baseline, runtime-forensics glitch) | Chrome DevTools MCP: `performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight` |
| Eval in the page (runtime-forensics instrumentation) | Chrome DevTools MCP `evaluate_script`, or Playwright MCP `browser_evaluate` |
| Heap snapshot (leaks) | Chrome DevTools MCP `take_heapsnapshot`. Analysis tools need the server started with `--memoryDebugging` |
| Electron, or an already-running Chrome | start the app with `--remote-debugging-port=9222` and point Chrome DevTools MCP at it with `--browserUrl http://127.0.0.1:9222` |
| Firefox or WebKit, route mocking, video | Playwright MCP (`@playwright/mcp`) |
| Pixel diff (visual-parity) | Neither MCP server diffs images. Write a Playwright script: `@playwright/test` `toHaveScreenshot`, or pixelmatch over two captures. That script is the harness the playbook asks for |
| Native desktop windows | pi-computer-use, if installed |

Tools are called through the proxy: `mcp({ tool: "<server>_<tool>", args: { … } })`, or directly when the server sets `directTools`.

## When nothing is installed

Say which server is missing, and point the user to the package docs (docs/install.md, "浏览器"). For a CLI or server surface, bash is enough. A screenshot file or a compile is not a drive of the UI. Mark the step blocked rather than claiming it ran.
