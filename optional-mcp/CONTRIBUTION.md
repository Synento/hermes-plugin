# Native MCP catalog

`optional-mcps/` in `NousResearch/hermes-agent` is a reviewed list. There is
no community tier and no self-serve submission. An entry exists when a
maintainer merges its `manifest.yaml`.

`synento/manifest.yaml` in this directory matches the parser in
`hermes_cli/mcp_catalog.py` as of Hermes Agent v0.23.0:

- `manifest_version: 1`
- `transport.type: http` and an `https` URL
- `auth.type: oauth` with no `provider` and no `auth.oauth` block, so Hermes
  uses the server's own OAuth discovery (dynamic registration and PKCE)
- `suggest.keywords`, `suggest.hosts`, and `suggest.examples`
- `connector_slug` is accepted as a lowercase slug. The parser checks the
  pattern only. It does not look the slug up in a registry.
- `post_install` is printed after install

`_build_server_config` writes `url` and `auth: oauth`. It does not write
`trust`. A `trust` field in the manifest would be ignored. It is omitted on
purpose, and the post-install text tells the user to add
`trust: untrusted`.

## Why this exists beside the portable plugin

The portable package can ship a skill and can ask for `trust: untrusted`, but
it cannot start OAuth. This manifest can start OAuth and cannot set trust or
ship the skill. A user who wants both installs the native server for sign-in
and keeps the skill from the portable package. The native entry must repeat
`trust: untrusted`, because it replaces the package server.

## Not submitted

Copy `synento/manifest.yaml` into a fork of `hermes-agent` at
`optional-mcps/synento/manifest.yaml` only after you mean to open the pull
request. One file. Say in the pull request:

- the endpoint returns 401 until OAuth, and the public server card is
  `https://api.synento.com/.well-known/mcp/server-card.json`
- sign-in is the browser flow (`hermes mcp login synento`)
- trust is not part of the manifest schema, so it is a documented follow-up
  edit in `config.yaml`
- write tools spend plan allowance and can fire webhooks

Do not claim the catalog lists Synento until that pull request is merged.
