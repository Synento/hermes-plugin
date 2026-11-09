# Remaining steps

Nothing in this directory has been submitted to the Hermes catalog. The git
repository for the package is https://github.com/Synento/hermes-plugin. Do
these in order. Stop if a step is not true yet.

1. The license is MIT, copyright Synento, 2026. See `LICENSE`.
2. Create the public repository `Synento/hermes-plugin` from this directory
   only. `node publication/export-public.mjs <dir>` writes a fresh copy. Push
   that copy. Do not add server source, other packages, or secrets.
3. Clone that public repository anonymously, with no credentials, and confirm
   `npm test` and `hermes plugins validate . --install-deps` pass at the
   commit you will pin.
4. Replace `PENDING_PUBLIC_COMMIT_SHA` in
   `publication/plugin-catalog-entry.yaml` with the full 40-character commit.
   Keep `repo: https://github.com/Synento/hermes-plugin`. Keep
   `tier: community`. Keep `requires_hermes: ">=0.21.6"` unless a newer Hermes
   key has been added and you have checked the first stable tag that
   implements it.
5. The static test treats a real pin as a failure until `ALLOW_CATALOG_SUBMIT=1`
   is set for the run that checks the filled-in file. That switch is the
   deliberate last check, not the default.
6. Open one pull request on `NousResearch/hermes-agent` that adds
   `plugin-catalog/synento.yaml` and nothing else. Use
   `publication/pull-request-body.md`, filled in with the validate command,
   the Hermes version, and this disclosure.
7. The native catalog is a separate pull request, one file:
   `optional-mcps/synento/manifest.yaml`, copied from
   `optional-mcp/synento/manifest.yaml`. There is no community tier for that
   catalog. Nous merges it or they do not. Say in the pull request that the
   manifest cannot set `trust`, and quote the post-install text.
8. After either merge, the docs page at `synento.com/docs/guides/mcp` can say
   the listing exists. Until then it must not.

Pushing this directory does not submit either catalog pull request.

Tested Hermes, commands, and what was not tested are in `VALIDATION.md`.
