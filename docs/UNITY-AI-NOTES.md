# Unity AI — how it helps Twisted Speed (2026)

Research for dual-ship recovery. **Primary runtime for feel/content right now: web (three.js).**

## What Unity AI is (unity.com/features/ai)

| Piece | Role |
|-------|------|
| **Assistant** (Editor) | Ask / Agent / Plan modes — docs Q&A, multi-step Editor tasks, vision on scene shots |
| **AI Gateway + MCP** | Hook external agents (incl. skills) into Unity with permissions |
| **Generators** | Textures/sprites/etc. (credit/points based) |
| **Inference Engine** (ex-Sentis) | Runtime ONNX models on device — NPCs, vision, not art pipeline |

Muse is being folded into this stack; use **Unity 6.x + AI package** from the Editor AI button.

## Why Unity felt rough before (ours)

- Editor/MCP dependency and Safe Mode / import thrash  
- Dual-building features without a single primary  
- Facing/art not as iterated as web Night Circuit  
- Web is hot-reload + agent-native TS; Unity is heavier per token  

## Better way to use Unity (when we return)

1. **Do not** dual-implement weapons/specials in C# while web still owns the loop.  
2. Use Unity as **desktop presentation + polish port** of proven web systems.  
3. In Editor: install **AI Assistant** → **Plan mode** for Map1 bake, vehicle prefab setup, URP lighting — not freeform “build the whole game.”  
4. Shared **GLB + JSON stats** remain SoT; C# reads tables.  
5. MCP/Gateway only when Editor is open and project is stable (not Safe Mode).  
6. Personal tier may be **trial/credits** limited — don’t depend on cloud AI for every compile.

## When to switch primary to Unity

- Desktop ship path is the product people play first, **and**  
- Web loop is fun (Gate B), specials work, facing locked — then port.

Until then: **web primary**, Unity secondary.
