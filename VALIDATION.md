# Validation

Recorded from a real CLI run. This is not a catalog submission.

- Hermes: `Hermes Agent v0.23.0 (2026.9.24) · stable · local 2bd378ed1b8d
Install directory: /tmp/hermes-src
Install method: git
Python: 3.14.9
OpenAI SDK: 2.54.0
Up to date`
- Command: `hermes plugins validate <plugin directory> --install-deps --json` exited 0
- Isolated home: a fresh `HERMES_HOME`, not the installer's home
- Install: `hermes plugins install file://<public export> --no-enable --no-deps` then `hermes plugins enable synento` exited 0
- Discovery: `hermes plugins list --json` names the plugin
- Missing native server: `hermes mcp test synento` before any native entry exited 3 and did not list tools
- Mock 401 at a loopback URL, no `auth: oauth`, `trust: untrusted`, `connect_timeout: 5`: `hermes mcp test synento` exited 1 after 7 request(s). Output reported a connection failure and did not list tools. With auth unset, that 401 is not presented as a sign-in prompt.
- Authenticated `hermes mcp login` and `hermes mcp test` against api.synento.com were not run. No tool call was made. No media was verified.
- CI does not install Hermes. The live test skips there and this receipt stays as the last local run.
