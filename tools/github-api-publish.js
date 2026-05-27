'use strict';

const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');

const root = path.resolve(__dirname, '..');
const owner = process.env.BLOG_GITHUB_OWNER || 'WFCrush';
const repo = process.env.BLOG_GITHUB_REPO || 'boke-plus';

function run(command, args, input) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: root, shell: false });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk) => { output += chunk.toString('utf8'); });
    child.on('close', (code) => resolve({ ok: code === 0, code, output }));
    if (input) child.stdin.end(input);
  });
}

async function githubToken() {
  const result = await run('git', ['credential', 'fill'], 'protocol=https\nhost=github.com\n\n');
  const token = (result.output.match(/^password=(.+)$/m) || [])[1];
  if (!token) throw new Error('没有从 Git 凭据管理器读取到 GitHub token');
  return token.trim();
}

async function githubRequest(token, pathname, options = {}) {
  const res = await fetch(`https://api.github.com${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'boke-api-publish',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function trackedFiles() {
  const result = await run('git', ['-c', 'core.quotepath=false', 'ls-files', '-z']);
  if (!result.ok) throw new Error(result.output || '读取 Git 跟踪文件失败');
  return result.output.split('\0').filter(Boolean);
}

async function latestCommitMessage() {
  const result = await run('git', ['log', '-1', '--pretty=%B']);
  return result.ok && result.output.trim() ? result.output.trim() : `update blog ${new Date().toISOString()}`;
}

async function main() {
  const token = await githubToken();
  const ref = await githubRequest(token, `/repos/${owner}/${repo}/git/ref/heads/main`);
  const files = await trackedFiles();
  const tree = [];

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const bytes = await fs.readFile(path.join(root, file));
    const blob = await githubRequest(token, `/repos/${owner}/${repo}/git/blobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: bytes.toString('base64'),
        encoding: 'base64',
      }),
    });
    tree.push({
      path: file.replace(/\\/g, '/'),
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    });
    if ((i + 1) % 10 === 0 || i + 1 === files.length) {
      console.error(`GitHub API 已上传 ${i + 1} / ${files.length} 个文件`);
    }
  }

  const treeObject = await githubRequest(token, `/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tree }),
  });
  const commit = await githubRequest(token, `/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: await latestCommitMessage(),
      tree: treeObject.sha,
      parents: [ref.object.sha],
    }),
  });
  await githubRequest(token, `/repos/${owner}/${repo}/git/refs/heads/main`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sha: commit.sha,
      force: false,
    }),
  });

  console.log(`API_PUSH_SHA=${commit.sha}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
