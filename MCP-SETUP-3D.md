# Enable Unity MCP + Blender MCP for Twisted Speed

Rev-2 **3D gameplay already ships in `web/`** without these tools.  
Use this checklist when you want AI-driven Blender modeling + Unity level building.

## Current blocker (2026-07-26)

On this machine at rev-2 time:

- No `Unity.exe` / Unity Hub install found  
- No `blender.exe` found  
- No `uv` / `uvx` on PATH  
- Grok `config.toml` had only `chrome-devtools` MCP  

## One-time setup

### A. Blender MCP

1. Install Blender 4.x  
2. Install uv: `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`  
3. Follow https://github.com/ahujasid/blender-mcp — install addon, **Start MCP Server** in Blender  
4. Add to `%USERPROFILE%\.grok\config.toml`:

```toml
[mcp_servers.blender]
command = "uvx"
args = ["blender-mcp"]
enabled = true
```

5. Restart Grok with Blender running  

### B. Unity MCP

1. Install Unity Hub + Editor  
2. Create project under `unity/TwistedSpeed`  
3. Install Unity MCP (official AI Assistant MCP **or** community Unity-MCP)  
4. Start bridge; add relay to Grok config (path varies by Unity version)  
5. Restart Grok with the project open  

### C. After MCP works — ask the agent

1. *Blender:* “Create glTF brawler, rival, rocket, mine, spike trap; export to `assets/models/`.”  
2. *Unity:* “Build city→mountain Night Run track; import glTF; wire vehicle controller + 13-night meta.”  
3. Keep `web/` as Arcade fallback or export WebGL.

## Until then

Play and iterate on: **`web/index.html`** / http://127.0.0.1:8765/
