# Optional MCP servers for FutureIndustries creators

**You do not need MCP to use this pack.** The free path is: local AI + this folder + browser.

MCP (Model Context Protocol) lets some AI tools *drive other apps* (browser, docs, engines).
Install only if your AI client supports MCP (Grok Build, Claude Code, Cursor, etc.).

## Free / high-value for browser games (Arcade path)

### 1. Playwright MCP — give the AI eyes
Lets the agent open your game, click, and screenshot.

- Package: `@playwright/mcp`
- Why: closes the "AI can't see the game" gap during BUILD-CHECK

Example Grok `~/.grok/config.toml` (or client equivalent):

```toml
[mcp_servers.playwright]
command = "npx"
args = ["-y", "@playwright/mcp@latest"]
enabled = true
```

Then: serve `web/` (or open the file), ask the agent to navigate and confirm the loop.

### 2. Context7 — fresh library docs
Pulls up-to-date docs so the AI invents fewer wrong APIs.

- Docs: https://context7.com/
- Optional free tier / API key depending on provider plan

```toml
[mcp_servers.context7]
url = "https://mcp.context7.com/mcp"
enabled = true
# headers = { "CONTEXT7_API_KEY" = "your-key-if-required" }
```

## Advanced (not required; usually Dev Studio)

These need installs and/or paid accounts. FI documents them on the site springboard page.
**Never put API keys inside the build pack zip or commit them to git.**

| Tool | What it does | Needs |
|------|----------------|-------|
| Meshy MCP | Text/image → 3D models | Meshy API key + credits |
| Blender MCP | AI controls Blender | Blender app + uvx blender-mcp |
| Godot MCP | AI drives Godot editor/run | Godot 4 + MCP package |
| Figma MCP | Design → structure for UI | Figma + desktop/remote MCP |
| Scenario MCP | Style-locked image/3D gen | Scenario account |
| ElevenLabs MCP | Voice / SFX / music | API key (paid at scale) |

See also: `AGENTS-MCP-SNIPPET.toml.example` and `tools/env.example`.

## Security
- Prefer official or well-known MCP servers.
- Disable auto-approve for delete/overwrite tools.
- Keys live in environment variables or MCP client config — never in `web/` or Arcade zips.
