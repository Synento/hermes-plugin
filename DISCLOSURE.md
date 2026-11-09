# Disclosure

What to know before installing or listing this package. Catalog rule 13 asks
for this in the plugin README and in the entry pull request. This file is the
long form. The README points here.

## Network

An enabled package tells Hermes to connect to `https://api.synento.com/mcp`
over Streamable HTTP. Sign-in, when configured natively, follows the OAuth
discovery documents that server returns. Those documents are on
`api.synento.com`. The package itself makes no other network calls. It does
not phone home, and it does not download updates.

## Credentials

This package reads no credential file. It does not read `.env`, Hermes
`auth.json`, a browser profile, or a keychain. `mcp.json` has no headers and
no tokens. `plugin.json` declares no `requires_env`.

OAuth tokens, once a person runs `hermes mcp login synento`, are stored by
Hermes under its own MCP token directory. This package never sees them.

`create_server_key` returns a restricted `rk_live_` secret once, into the
chat. The skill says to write it to a gitignored server env file and not to
commit it. The secret is the app's credential, not a Hermes credential.

## Data

Read tools can return the organisation, project ids, session ids, plan usage,
and a session manifest. The manifest names participant ids and which of
`cam`, `mic`, and `screen` actually hold media, with timestamps. It does not
return audio or video bytes.

Write tools can create projects and sessions, mint a short-lived browser
connection token, and mint a restricted server key. `create_session` and
`run_media_check` dispatch the project's `session.created` webhook to
whatever URL that project already registered.

## Writes and cost

Hermes has no Synento price table to declare, so this package sets no
`costs` or `spend_limit`. Inventing a credit number would be wrong. Synento
bills on its own plan:

- Creating a session is refused when the plan's session allowance is used.
  People in the call consume participant-minutes.
- `run_media_check` opens a real session named `synento-media-check`, sends a
  short synthetic call, fires the same webhook, and uses a few seconds of
  allowance. It does not run the app's code.
- `create_connection_token` with `mode: "replay"` is refused once the replay
  allowance is used. Replay of a recording counts replayed participant-minutes.
- MP4 export is not an MCP tool. Export can bill. Do not add it from this
  skill.

`trust: untrusted` makes Hermes ask before tools that are not
`readOnlyHint: true`. On the public server card those write tools are
`create_project`, `create_session`, `create_connection_token`,
`create_server_key`, and `run_media_check`. Where nobody can answer, the call
is refused and does not run.

A native `mcp_servers.synento` block replaces this package's server config,
trust included. The native block has to repeat `trust: untrusted`.

## The remote tool list can change

The pinned files fix the URL and the skill text. They do not pin the server's
tools. Synento can add, remove, or retune a tool without a new commit here.
A catalog review of this package is not a review of a later server change.
Read-only hints on the server are what Hermes uses for the trust gate. If a
future tool omits `readOnlyHint`, Hermes treats it as a write and asks.

## What this package does not do

- No self-updater and no remote `plugin.js`.
- No shell commands, no background process, no telemetry.
- No patch of Hermes internals, no approval bypass, no read of another tool's
  login.
- No claim that enabling the package signed the user in.
