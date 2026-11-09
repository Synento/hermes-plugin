import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const allow = JSON.parse(readFileSync(join(here, 'public-files.json'), 'utf8')).files

const secretPrefixes = ['rk_live_', 'sat_', 'sk_live_', 'whsec_']

function looksSecret(text) {
  return secretPrefixes.some((prefix) => new RegExp(`${prefix}[A-Za-z0-9]{16}`).test(text))
}

function scan(rel, text) {
  if (looksSecret(text)) {
    throw new Error(`${rel} is not public-safe: secret-like token`)
  }
}

const dest = resolve(process.argv[2] ?? join(tmpdir(), 'synento-hermes-plugin-public'))
if (dest === root || dest.startsWith(`${root}/`)) {
  throw new Error('refusing to export onto the plugin directory')
}
rmSync(dest, { force: true, recursive: true })
mkdirSync(dest, { recursive: true })

for (const rel of allow) {
  const text = readFileSync(join(root, rel), 'utf8')
  scan(rel, text)
  const out = join(dest, rel)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, text)
}

const catalog = readFileSync(join(dest, 'publication/plugin-catalog-entry.yaml'), 'utf8')
if (!catalog.includes('NOT SUBMITTABLE')) {
  throw new Error('catalog draft lost its not-submittable banner')
}
if (!catalog.includes('repo: https://github.com/Synento/hermes-plugin')) {
  throw new Error('catalog draft does not name https://github.com/Synento/hermes-plugin')
}
const sha = catalog.match(/^sha:\s*(\S+)\s*$/m)?.[1]
if (sha !== 'PENDING_PUBLIC_COMMIT_SHA') {
  throw new Error('catalog draft looks pinned; refuse to export it as a submission')
}

const archive = `${dest}.tar.gz`
rmSync(archive, { force: true })
execFileSync('tar', ['-C', dirname(dest), '-czf', archive, basename(dest)], { stdio: 'inherit' })
process.stdout.write(`${dest}\n${archive}\n`)

function basename(path) {
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}
