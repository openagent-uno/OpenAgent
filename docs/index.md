---
layout: home

hero:
  name: OpenAgent
  text: Model-agnostic persistent agents with memory, MCP tools, and multi-channel reach
  tagline: Run the same agent with Claude, GLM, Ollama, LM Studio, vLLM, or any OpenAI-compatible model, then pair it with the Agent, CLI, and Desktop App as separate installs.
  image:
    src: /brand/openagent-logo.png
    alt: OpenAgent
  actions:
    - theme: brand
      text: View Downloads
      link: /downloads
    - theme: alt
      text: Read Documentation
      link: /guide/
    - theme: alt
      text: View GitHub
      link: https://github.com/geroale/OpenAgent

features:
  - title: Persistent by default
    details: Keep context, memory, and schedules alive beyond a single chat window. OpenAgent is built for long-running agent behavior, not one-off prompts.
  - title: Model-agnostic by design
    details: Claude CLI/API, Z.ai GLM, Ollama, LM Studio, vLLM, and any OpenAI-compatible endpoint all get the same MCP tools, memory model, and channels.
  - title: Multi-channel delivery
    details: Expose the same agent through Telegram, Discord, WhatsApp, desktop, and CLI with consistent commands, stop controls, and status updates.
  - title: Obsidian-native memory
    details: Notes stay as plain markdown with wikilinks and frontmatter, so the vault is inspectable, portable, and easy to open in Obsidian.
  - title: Operations-ready runtime
    details: Native service setup, cron scheduler, dream mode maintenance, and auto-update support make the agent suitable for always-on deployments.
  - title: Desktop control surface
    details: Use the Electron app for chat, memory browsing, graph exploration, model configuration, MCP management, and release-based distribution.
---

<div class="brand-section">

## What OpenAgent is for

OpenAgent turns an LLM into a system you can actually keep running. It combines model execution, tool access, message channels, scheduling, and long-term memory behind one framework so the same agent can answer, act, remember, and follow up over time. It is model agnostic by design: the provider can change, but the operating surface stays the same.

## Three independent apps

OpenAgent ships as three separate downloads that work together but do not bundle into a single installer.

<div class="brand-grid">
  <div class="brand-card">
    <h3>Agent Server</h3>
    <p>The persistent runtime in <code>openagent/</code>. Install it where the agent should live, configure channels and memory there, and let its installer and auto-update flow keep it running.</p>
  </div>
  <div class="brand-card">
    <h3>CLI Client</h3>
    <p>A separate terminal client for connecting to any running OpenAgent Gateway. Use it when you want fast operational access without the desktop UI.</p>
  </div>
  <div class="brand-card">
    <h3>Desktop App</h3>
    <p>The Electron control surface for chat, memory, MCP configuration, and graph exploration. It connects to a running Agent Server over WebSocket and is downloaded independently.</p>
  </div>
</div>

<div class="brand-inline-links">
  <a href="/OpenAgent/downloads">Downloads for Agent, CLI, and App</a>
  <a href="/OpenAgent/guide/apps">Apps and distribution guide</a>
  <a href="/OpenAgent/guide/">Guides and configuration</a>
  <a href="https://github.com/geroale/OpenAgent/releases">GitHub releases</a>
</div>

</div>

<div class="brand-section">

## Architecture at a glance

- **Gateway** exposes WebSocket and REST on one port for desktop, CLI, and bridge clients.
- **Models** stay swappable while the tool surface remains consistent.
- **MCP layer** provides the working capabilities: filesystem, editor, web, browser, messaging, scheduler, and memory.
- **Channels** connect the runtime to Telegram, Discord, WhatsApp, and the desktop app.
- **Vault + scheduler** give the agent continuity between conversations and across time.

</div>
