# NOT SUBMITTABLE

Draft body for a future pull request to `NousResearch/hermes-agent`. Replace
the angle-bracket placeholders. Delete this heading only when
https://github.com/Synento/hermes-plugin has the commit you will pin. Do not
open the pull request before that.

---

## Plugin catalog: synento

One new file, `plugin-catalog/synento.yaml`.

Synento is a hosted live-video API. Sessions are the recording. This portable
package points Hermes at `https://api.synento.com/mcp` and ships a skill that
tells the agent to use a restricted server key and to check the recording
with `verify_session`.

### Surfaces

- Portable Agent Plugins v1: `plugin.json`, `mcp.json`, `skills/synento/SKILL.md`.
- One `streamable-http` server named `synento`.
- `extensions.com.nousresearch.hermes.servers.synento.trust` is `untrusted`.
- No Python, no desktop plugin, no hooks, no middleware, no `requires_env`.
- `requires_hermes: ">=0.21.6"` because that is the first stable tag whose
  portable loader implements streamable HTTP and server trust. `plugin.json`
  has no floor field.

### OAuth limitation

Portable `mcp.json` cannot set `auth`. Sign-in is a native
`mcp_servers.synento` entry with `url`, `auth: oauth`, and `trust: untrusted`,
then `hermes mcp login synento`, `hermes mcp test synento`, and `/reload-mcp`.
The native entry replaces the package entry. This is not one-click auth.

### Disclosure

- Network: `https://api.synento.com/mcp`, plus the OAuth documents that server
  returns. No other hosts. No telemetry. No self-updater.
- Credentials: none in the tree. The package does not read credential files.
  `create_server_key` returns a restricted key once into the chat.
- Data: account, project, and session metadata, and manifest participant ids
  and track timestamps. Not audio or video bytes.
- Writes: `create_project`, `create_session`, `create_connection_token`,
  `create_server_key`, `run_media_check`. They can use plan allowance and
  fire the project's `session.created` webhook. No Hermes credit table is
  declared, because Synento does not bill in Hermes credits.
- The remote tool list can change without a new pin.

### Validation

```bash
hermes plugins validate <checkout at the pinned sha> --install-deps
```

Hermes version: `<exact hermes --version output>`
Pinned commit: `<40-character sha>`
Result: `<pass or the failure>`

Authenticated tool calls were not part of this validation. `<say what was
actually run>`
