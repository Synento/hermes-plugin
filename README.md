# Synento for Hermes

Synento is a live video API. A session is its own recording. This package
teaches Hermes that, and points it at the remote MCP server
`https://api.synento.com/mcp`.

It is a portable Agent Plugins v1 directory: `plugin.json`, `mcp.json`, and
`skills/synento/SKILL.md`. It does not ship Python, a desktop plugin, or a
self-updater.

## OAuth is a separate step

Portable `mcp.json` entries accept only `type`, `url`, and `headers`. Checked
against Hermes Agent v0.23.0 (`hermes_cli/agent_plugins.py`, `_REMOTE_FIELDS`).
There is no `auth` field. This package cannot sign you in.

OAuth needs a native server entry with the same name. Hermes then uses that
entry instead of the one from this package, including trust:

```yaml
mcp_servers:
  synento:
    url: https://api.synento.com/mcp
    auth: oauth
    trust: untrusted
```

Then:

```bash
hermes mcp login synento
hermes mcp test synento
```

In a session that is already running, `/reload-mcp` loads the tools.
`hermes mcp login` opens a browser. A cron job or other unattended run cannot
finish that and should stop.

`trust: untrusted` is also set on the package, under
`extensions["com.nousresearch.hermes"].servers.synento`. With that, Hermes asks
before each tool that is not marked read-only, and refuses the call when
nobody can answer. A native `mcp_servers.synento` entry replaces the package
entry, so copy `trust: untrusted` onto the native entry or the gate is gone.

This is not a one-click install.

## What the server can do

The public server card lists the tools. Reads include `get_account`,
`list_projects`, `list_sessions`, `get_session_manifest`, `verify_session`,
and `get_guide`. Writes include `create_project`, `create_session`,
`create_connection_token`, `create_server_key`, and `run_media_check`.

The server can change that list without a new commit of this package. See
[DISCLOSURE.md](DISCLOSURE.md).

The skill tells the agent to mint a restricted `rk_live_` key, to pass an
idempotency key on creates, to ask before writes, and to withhold a success
claim until `verify_session` passes on a session the app actually published.

## Install

The git repository for this package is
[Synento/hermes-plugin](https://github.com/Synento/hermes-plugin).

It is not in the Hermes plugin catalog, so `hermes plugins install synento`
will not find it. After the repository is public, install from git:

```bash
hermes plugins install https://github.com/Synento/hermes-plugin
```

That enables the package. It does not sign you in. Add the native
`mcp_servers.synento` entry above, then run `hermes mcp login synento` and
`hermes mcp test synento`.

## Validate and test

From a Hermes install:

```bash
hermes plugins validate . --install-deps
```

There are no Python dependencies. `--install-deps` is the flag catalog CI uses.
This repository's own tests do not need Hermes:

```bash
npm test
```

`npm test` skips the live install check when the `hermes` command is absent.

## Not listed

Nothing here is in the Hermes plugin catalog or the `optional-mcps` catalog.
The files under `publication/` and `optional-mcp/` are drafts. The catalog
entry names this repository and leaves the commit pin as
`PENDING_PUBLIC_COMMIT_SHA`. Do not send them upstream until the steps in
[publication/REMAINING.md](publication/REMAINING.md) are done.

A native MCP catalog manifest, which can declare OAuth, is in
`optional-mcp/synento/manifest.yaml`. That path is also unsubmitted. The
manifest parser does not write `trust`; the post-install text says to add it.

To copy this directory somewhere else before the first push:

```bash
node publication/export-public.mjs /tmp/synento-hermes-plugin
```

The script writes that directory and a `.tar.gz` next to it. Push the
directory. Do not send the catalog file until it pins a real commit.

## License

MIT. Copyright (c) 2026 Synento. See [LICENSE](LICENSE).

## Layout

| Path | Role |
| --- | --- |
| `plugin.json` | Agent Plugins v1 manifest. Trust for the `synento` server. |
| `mcp.json` | Streamable HTTP URL only. |
| `skills/synento/SKILL.md` | Instructions for the agent. |
| `DISCLOSURE.md` | What a reviewer should know before listing it. |
| `package.json` | `npm test` for this directory only. |
| `.github/workflows/test.yml` | Runs `npm test` on GitHub. |
| `publication/` | Catalog draft, pull-request draft, export script. |
| `optional-mcp/` | Unsubmitted native MCP catalog manifest. |
| `test/` | Static checks and the Hermes install check. |
