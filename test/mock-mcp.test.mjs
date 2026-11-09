import assert from 'node:assert/strict'
import { test } from 'node:test'
import { classify } from './mcp-responses.mjs'

test('a 401 with no token is an OAuth start, not a signed-in session', () => {
  const result = classify(401, '{"error":"unauthorized"}', 'Bearer realm="synento"')
  assert.equal(result.kind, 'oauth_required')
  assert.equal(result.authenticated, false)
  assert.equal(result.mediaVerified, false)
})

test('a revoked token is a re-auth, and still not proof of media', () => {
  const result = classify(401, '{"error":"invalid_token","error_description":"revoked"}')
  assert.equal(result.kind, 'reauth_required')
  assert.equal(result.authenticated, false)
  assert.equal(result.mediaVerified, false)
})

test('insufficient_scope is a consent stop', () => {
  const result = classify(403, '{"error":"insufficient_scope"}')
  assert.equal(result.kind, 'consent_required')
  assert.equal(result.authenticated, false)
  assert.equal(result.mediaVerified, false)
})
