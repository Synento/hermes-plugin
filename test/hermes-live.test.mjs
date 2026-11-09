import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function hermesBin() {
  if (process.env.HERMES_BIN) return process.env.HERMES_BIN
  const home = join(process.env.HOME ?? '', '.local', 'bin', 'hermes')
  const found = spawnSync('bash', ['-lc', 'command -v hermes || true'], { encoding: 'utf8' })
  const fromPath = String(found.stdout ?? '')
    .trim()
    .split('\n')
    .filter(Boolean)
    .at(-1)
  if (fromPath) return fromPath
  return home
}

function run(bin, args, env, timeoutMs = 120000) {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { env })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
    }, timeoutMs)
    child.stdout?.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr?.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      resolve({ code, signal, stderr, stdout })
    })
  })
}

function git(dir, args) {
  const result = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
}

test('hermes validates, installs the public export, and fails closed without OAuth', async (t) => {
  const bin = hermesBin()
  const version = spawnSync(bin, ['--version'], { encoding: 'utf8' })
  if (version.status !== 0) {
    const detail = version.error?.message || version.stderr || 'not on PATH'
    t.skip(`hermes CLI is not installed (${detail})`)
    return
  }

  const versionText = `${version.stdout ?? ''}${version.stderr ?? ''}`.trim()
  const baseEnv = {
    ...process.env,
    PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}`,
  }

  const validated = await run(
    bin,
    ['plugins', 'validate', root, '--install-deps', '--json'],
    baseEnv
  )
  assert.equal(validated.code, 0, `${validated.stdout}\n${validated.stderr}`)

  const exported = join(tmpdir(), `synento-hermes-export-${process.pid}`)
  rmSync(exported, { force: true, recursive: true })
  const exportedRun = spawnSync(
    'node',
    [join(root, 'publication', 'export-public.mjs'), exported],
    {
      encoding: 'utf8',
    }
  )
  assert.equal(exportedRun.status, 0, exportedRun.stderr)

  git(exported, ['init'])
  git(exported, ['add', '.'])
  git(exported, [
    '-c',
    'user.email=export@example.invalid',
    '-c',
    'user.name=Export',
    'commit',
    '-m',
    'export',
  ])

  const home = join(tmpdir(), `synento-hermes-home-${process.pid}`)
  rmSync(home, { force: true, recursive: true })
  mkdirSync(home, { recursive: true })
  const env = { ...baseEnv, HERMES_HOME: home }
  const installed = await run(
    bin,
    ['plugins', 'install', `file://${exported}`, '--no-enable', '--no-deps'],
    env
  )
  assert.equal(installed.code, 0, `${installed.stdout}\n${installed.stderr}`)

  const enabled = await run(bin, ['plugins', 'enable', 'synento'], env)
  assert.equal(enabled.code, 0, `${enabled.stdout}\n${enabled.stderr}`)

  const listed = await run(bin, ['plugins', 'list', '--json'], env)
  assert.equal(listed.code, 0, `${listed.stdout}\n${listed.stderr}`)
  const jsonStart = listed.stdout.search(/[[{]/)
  assert.ok(jsonStart >= 0, listed.stdout)
  const catalog = JSON.parse(listed.stdout.slice(jsonStart))
  assert.match(JSON.stringify(catalog), /synento/)

  const configPath = join(home, 'config.yaml')
  const beforeProbe = existsSync(configPath) ? readFileSync(configPath, 'utf8') : ''
  let missing = { code: null, stderr: '', stdout: '' }
  if (!beforeProbe.includes('api.synento.com')) {
    missing = await run(bin, ['mcp', 'test', 'synento'], env, 20000)
    assert.notEqual(missing.code, 0, 'a portable install must not count as a signed-in server')
    assert.doesNotMatch(`${missing.stdout}\n${missing.stderr}`, /Tools discovered|Connected/i)
  }

  const mock = await listenUnauthorized()
  t.after(() => mock.close())
  writeNative(home, mock.url)
  const written = readFileSync(configPath, 'utf8')
  assert.equal(written.includes('api.synento.com'), false)
  const probed = await run(bin, ['mcp', 'test', 'synento'], env, 60000)
  const probedText = `${probed.stdout}\n${probed.stderr}`
  assert.equal(probed.code, 1, probedText)
  assert.equal(probed.signal, null, probedText)
  assert.ok(mock.hits > 0, probedText)
  assert.match(probedText, /Connection failed/)
  assert.doesNotMatch(probedText, /Tools discovered/)

  const receipt = [
    '# Validation',
    '',
    'Recorded from a real CLI run. This is not a catalog submission.',
    '',
    `- Hermes: \`${versionText.replaceAll('`', '')}\``,
    `- Command: \`hermes plugins validate <plugin directory> --install-deps --json\` exited ${validated.code}`,
    `- Isolated home: a fresh \`HERMES_HOME\`, not the installer's home`,
    `- Install: \`hermes plugins install file://<public export> --no-enable --no-deps\` then \`hermes plugins enable synento\` exited ${enabled.code}`,
    `- Discovery: \`hermes plugins list --json\` names the plugin`,
    `- Missing native server: \`hermes mcp test synento\` before any native entry exited ${missing.code ?? 'skipped because enable already wrote a server url'} and did not list tools`,
    `- Mock 401 at a loopback URL, no \`auth: oauth\`, \`trust: untrusted\`, \`connect_timeout: 5\`: \`hermes mcp test synento\` exited ${probed.code} after ${mock.hits} request(s). Output reported a connection failure and did not list tools. With auth unset, that 401 is not presented as a sign-in prompt.`,
    '- Authenticated `hermes mcp login` and `hermes mcp test` against api.synento.com were not run. No tool call was made. No media was verified.',
    '- CI does not install Hermes. The live test skips there and this receipt stays as the last local run.',
    '',
  ].join('\n')
  writeFileSync(join(root, 'VALIDATION.md'), receipt)
})

function writeNative(home, url) {
  const config = [
    'mcp_servers:',
    '  synento:',
    `    url: ${url}`,
    '    trust: untrusted',
    '    connect_timeout: 5',
    '',
  ].join('\n')
  writeFileSync(join(home, 'config.yaml'), config)
}

function listenUnauthorized() {
  return new Promise((resolve, reject) => {
    const state = { hits: 0, url: '' }
    const server = createServer((socket) => {
      let buffer = ''
      let answered = false
      socket.on('error', () => {})
      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8')
        if (answered || !buffer.includes('\r\n\r\n')) return
        answered = true
        state.hits += 1
        socket.end(
          'HTTP/1.1 401 Unauthorized\r\ncontent-type: application/json\r\ncontent-length: 24\r\nconnection: close\r\nwww-authenticate: Bearer realm="synento"\r\n\r\n{"error":"unauthorized"}'
        )
      })
    })
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('mock failed to bind'))
        return
      }
      state.url = `http://127.0.0.1:${address.port}/mcp`
      state.close = () =>
        new Promise((done) => {
          server.close(() => done())
        })
      resolve(state)
    })
  })
}
