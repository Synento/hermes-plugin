import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function json(rel) {
  return JSON.parse(read(rel))
}

const publicFiles = json('publication/public-files.json').files

const secretPrefixes = ['rk_live_', 'sat_', 'sk_live_', 'whsec_']

function looksSecret(text) {
  return secretPrefixes.some((prefix) => new RegExp(`${prefix}[A-Za-z0-9]{16}`).test(text))
}

test('portable plugin.json matches the v1 fields Hermes accepts', () => {
  const plugin = json('plugin.json')
  assert.equal(plugin.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json')
  assert.equal(plugin.name, 'synento')
  assert.match(plugin.name, /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/)
  assert.equal(plugin.version, '1.0.0')
  assert.equal(plugin.homepage, 'https://synento.com/agents')
  assert.equal(plugin.license, 'MIT')
  assert.equal(plugin.repository, 'https://github.com/Synento/hermes-plugin')
  assert.equal(plugin.extensions['com.nousresearch.hermes'].servers.synento.trust, 'untrusted')
  assert.equal(plugin.requires_hermes, undefined)
  const allowed = new Set([
    '$schema',
    'author',
    'description',
    'extensions',
    'homepage',
    'keywords',
    'license',
    'name',
    'repository',
    'version',
  ])
  for (const key of Object.keys(plugin)) assert.ok(allowed.has(key), key)
})

test('portable mcp.json is type and url only', () => {
  const mcp = json('mcp.json')
  assert.equal(mcp.$schema, 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json')
  assert.deepEqual(Object.keys(mcp).sort(), ['$schema', 'mcpServers'])
  const server = mcp.mcpServers.synento
  assert.deepEqual(Object.keys(server).sort(), ['type', 'url'])
  assert.equal(server.type, 'streamable-http')
  assert.equal(server.url, 'https://api.synento.com/mcp')
  assert.equal(server.headers, undefined)
  assert.equal(server.auth, undefined)
})

test('skill frontmatter matches the directory name', () => {
  const text = read('skills/synento/SKILL.md')
  const fence = text.split('---')
  assert.equal(fence.length >= 3, true)
  const body = fence[1]
  const name = body.match(/^name:\s*(\S+)\s*$/m)?.[1]
  const description = body.match(/^description:\s*"([\s\S]*?)"\s*$/m)?.[1]
  assert.equal(name, 'synento')
  assert.match(name, /^(?!.*--)[a-z0-9]+(?:-[a-z0-9]+)*$/)
  assert.equal(typeof description, 'string')
  assert.ok(description.length >= 1 && description.length <= 1024)
  assert.match(description, /verify_session/)
  assert.match(text, /rk_live_/)
  assert.match(text, /Idempotency-Key/)
  assert.match(text, /Ask before writes/)
  assert.doesNotMatch(text, /one-click/i)
})

test('catalog draft cannot be submitted as written', () => {
  const text = read('publication/plugin-catalog-entry.yaml')
  assert.match(text, /NOT SUBMITTABLE/)
  assert.match(text, /tier:\s*community/)
  assert.match(text, /requires_hermes:\s*">=0\.21\.6"/)
  assert.match(text, /repo: https:\/\/github\.com\/Synento\/hermes-plugin/)
  assert.doesNotMatch(text, /OWNER_NOT_CHOSEN/)
  const sha = text.match(/^sha:\s*(\S+)\s*$/m)?.[1]
  assert.equal(sha, 'PENDING_PUBLIC_COMMIT_SHA')
  assert.equal(/^[0-9a-f]{40}$/.test(sha), false)
  if (process.env.ALLOW_CATALOG_SUBMIT === '1') {
    assert.fail('ALLOW_CATALOG_SUBMIT is not used on the placeholder draft')
  }
})

test('native manifest sets oauth and does not pretend to set trust', () => {
  const text = read('optional-mcp/synento/manifest.yaml')
  assert.match(text, /^manifest_version:\s*1\s*$/m)
  assert.match(text, /^name:\s*synento\s*$/m)
  assert.match(text, /type:\s*http/)
  assert.match(text, /url:\s*https:\/\/api\.synento\.com\/mcp/)
  assert.match(text, /type:\s*oauth/)
  assert.match(text, /connector_slug:\s*synento/)
  assert.match(text, /trust: untrusted/)
  assert.doesNotMatch(text, /^trust:/m)
  assert.doesNotMatch(text, /auth:\s*\n\s+type:\s*oauth[\s\S]*provider:/m)
})

test('public files exist and carry no live secret', () => {
  for (const rel of publicFiles) {
    assert.equal(looksSecret(read(rel)), false, `${rel} contains a secret-like token`)
  }
})

test('export allowlist matches the plugin directory', () => {
  for (const rel of publicFiles) {
    assert.equal(existsSync(join(root, rel)), true, rel)
  }
  const extras = []
  function walk(dir, prefix) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        if (entry.name === 'dist-public' || entry.name === 'node_modules') continue
        walk(join(dir, entry.name), rel)
      } else if (!publicFiles.includes(rel)) {
        extras.push(rel)
      }
    }
  }
  walk(root, '')
  assert.deepEqual(extras, [])
})

test('license is MIT for Synento in 2026', () => {
  const text = read('LICENSE')
  assert.match(text, /Copyright \(c\) 2026 Synento/)
  assert.match(text, /Permission is hereby granted/)
})
