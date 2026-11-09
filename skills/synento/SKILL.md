---
name: synento
description: "Set up Synento live video that records itself. Use a restricted server key, an idempotency key on creates, and verify_session on a real recording. Ask before any write. Do not report success until verification passes, and do not treat this plugin as signed in."
---

# Synento

Synento sessions are the recording. Live video, replay, and export read the
same streams. The MCP server is `https://api.synento.com/mcp`.

## Sign-in is not done

This package's `mcp.json` only has the URL. Hermes cannot store OAuth there.
Until a native entry exists, tool calls fail authentication. Say that. Do not
describe a working connection.

The native entry, in Hermes config, has to be named `synento`:

```yaml
mcp_servers:
  synento:
    url: https://api.synento.com/mcp
    auth: oauth
    trust: untrusted
```

A person then runs `hermes mcp login synento` and `hermes mcp test synento`,
and `/reload-mcp` in a running session. Login opens a browser. If this run
cannot show a browser, stop and say sign-in is still required. Do not invent
a token, and do not read a credential file to find one.

The native entry replaces this package's server, including trust. If
`trust: untrusted` is missing from the native entry, say so before any write.
That gate is what asks the user. The skill text is not a substitute.

## Ask before writes

These tools are not read-only. Ask in the chat, wait for a yes, and then call
once:

- `create_project`
- `create_session`
- `create_connection_token`
- `create_server_key`
- `run_media_check`

`create_session` can be refused when the plan allowance is used, and it sends
`session.created` to the project's webhook. Minutes accrue while people are in
the call. `run_media_check` creates a real session, fires that webhook, and
uses a few seconds of allowance. It does not test the app's code. Export is
not a tool here. Do not start an export to "see if it works". Export can bill.

Read tools (`get_account`, `list_projects`, `list_sessions`,
`get_session_manifest`, `verify_session`, `get_guide`) do not need that ask.
If a tool you do not recognise is not marked read-only, treat it as a write.

Where nobody can answer (cron, a quiet one-shot), do not call a write. The
trust gate refuses those calls. Do not retry them in a loop.

## Restricted key

After `get_account`, if the user agrees, `create_server_key` mints an
`rk_live_` key for one project. It is shown once. Put it in the app's
server-side env, in a file that is gitignored:

```bash
SYNENTO_API_KEY=rk_live_…
SYNENTO_API_URL=https://api.synento.com
SYNENTO_PROJECT_ID=…
```

Never put that key in browser code, a commit, a chat log you then commit, or
a client SDK. The browser joins with a short-lived connection token from the
app's server.

That key works on four routes only:

- `POST /v1/sessions`
- `POST /v1/projects/{projectId}/sessions`
- `POST /v1/sessions/{sessionId}/connection`
- `GET /v1/sessions/{sessionId}/manifest`

Other routes, including replay links, webhooks, exports, and billing, need a
normal project key (`sk_live_`). Do not ask the user to paste an owner key
into the agent if a restricted key is enough.

## Idempotency

`create_session` and `create_project` take `idempotency_key`. Reuse the same
key when retrying the same create. Use a new key only when the user wants
another project or session. Without a key, the same arguments create another
row.

On the REST API the same idea is the `Idempotency-Key` header, scoped to the
caller and the route. A failed request is not cached, so a retry with the same
key can still succeed. A success is replayed, status and body included.

## Build and check

1. `get_account`. If there is no suitable project and the user agreed,
   `create_project`.
2. `create_server_key` only after a yes. Write the env as above.
3. `get_guide` for `getting-started` and `guides/sdk`. The server creates
   sessions and connection tokens with `@synento/node`. The browser publishes
   with `@synento/client` and only the connection token.
4. The user runs the app and publishes camera and microphone.
5. `verify_session` on that session id. It passes only when each expected
   participant's tracks hold media (`start_ts` is set). A manifest that merely
   lists a track name is not proof. Empty tracks are omitted.

Do not tell the user the integration works until `verify_session` passes on
the app's own session. If it keeps failing, say what is missing. Usual causes:
no audio track, publishing before `connect()` resolved, or a token for a
different session. `run_media_check` is a Synento-side check. A pass there
does not mean the app works.

Do not fabricate a session id, a manifest, a passing verification, or a
completed login. If a call failed, quote the error and stop.
