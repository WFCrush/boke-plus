const crypto = require('crypto');
const { execFile, spawn } = require('child_process');
const fs = require('fs/promises');
const fss = require('fs');
const path = require('path');

const express = require('express');
const matter = require('gray-matter');
const multer = require('multer');
const mammoth = require('mammoth');
const slugify = require('slugify');

const root = path.resolve(__dirname, '..');
const postsDir = path.join(root, 'source', '_posts');
const uploadsDir = path.join(root, 'source', 'uploads');
const secureDir = path.join(root, 'source', 'secure');
const contactFile = path.join(root, 'source', 'contact', 'contact.json');
const dataDir = path.join(root, 'source', '_data');
const columnsFile = path.join(dataDir, 'admin-columns.json');
const columnsPageFile = path.join(root, 'source', 'columns', 'index.md');
const adminTmpDir = path.join(root, '.admin-tmp');
const activityFile = path.join(adminTmpDir, 'activity.log');
const publicDir = path.join(__dirname, 'public');
const hexoConfig = path.join(root, '_config.yml');
const publishDir = path.join(root, 'public');
const port = Number(process.env.ADMIN_PORT || 5050);
const passwordFile = path.join(root, '.admin-password');
const githubOwner = process.env.BLOG_GITHUB_OWNER || 'WFCrush';
const githubRepo = process.env.BLOG_GITHUB_REPO || 'boke-plus';
const publicSiteUrl = (process.env.BLOG_PUBLIC_URL || 'https://wf.5yu.org/').replace(/\/?$/, '/');
let password = process.env.ADMIN_PASSWORD || 'admin123';
const sessions = new Map();
const jobs = new Map();

const app = express();

app.use(express.json({ limit: '2mb' }));
app.use(express.static(publicDir));

const upload = multer({
  dest: adminTmpDir,
  limits: { fileSize: 80 * 1024 * 1024 },
});

function safeName(value, fallback = 'post') {
  const raw = String(value || '').trim();
  const chineseSafe = raw
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^\.+|\.+$/g, '');
  if (chineseSafe) return chineseSafe;
  const base = slugify(raw, { lower: true, strict: true, locale: 'zh' });
  return base || fallback;
}

async function uniquePostFile(base) {
  let file = `${base}.md`;
  let index = 2;
  while (true) {
    try {
      await fs.access(path.join(postsDir, file));
      file = `${base}-${index}.md`;
      index += 1;
    } catch (_) {
      return file;
    }
  }
}

function todayString() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

async function getSiteRoot() {
  try {
    const config = await fs.readFile(hexoConfig, 'utf8');
    const match = config.match(/^root:\s*(.+?)\s*$/m);
    const configured = match ? match[1].replace(/^['"]|['"]$/g, '').trim() : '/';
    const withLeading = configured.startsWith('/') ? configured : `/${configured}`;
    return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
  } catch (_) {
    return '/';
  }
}

function assertLocal(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || '';
  if (ip.includes('127.0.0.1') || ip.includes('::1') || ip === '::ffff:127.0.0.1') {
    next();
    return;
  }
  res.status(403).json({ error: '后台只允许本机访问' });
}

function auth(req, res, next) {
  const token = req.header('x-admin-token');
  if (token && sessions.has(token)) {
    next();
    return;
  }
  res.status(401).json({ error: '请先登录' });
}

async function ensureDirs() {
  await fs.mkdir(postsDir, { recursive: true });
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.mkdir(secureDir, { recursive: true });
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(adminTmpDir, { recursive: true });
  await fs.mkdir(path.dirname(contactFile), { recursive: true });
}

async function readPost(file) {
  const fullPath = path.join(postsDir, file);
  const raw = await fs.readFile(fullPath, 'utf8');
  const parsed = matter(raw);
  return {
    file,
    title: parsed.data.title || file.replace(/\.md$/i, ''),
    date: parsed.data.date || '',
    categories: parsed.data.categories || [],
    tags: parsed.data.tags || [],
    description: parsed.data.description || parsed.data.excerpt || '',
    cover: parsed.data.cover || parsed.data.banner_img || '',
    series: parsed.data.series || '',
    sticky: parsed.data.sticky || 0,
    content: parsed.content.trimStart(),
  };
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function postMarkdown(input) {
  const data = {
    title: input.title || '未命名文章',
    date: input.date || todayString(),
    categories: normalizeList(input.categories),
    tags: normalizeList(input.tags),
  };
  ['description', 'cover', 'series'].forEach((key) => {
    const value = String(input[key] || '').trim();
    if (value) data[key] = value;
  });
  const stickyValue = Number(input.sticky);
  if (Number.isFinite(stickyValue) && stickyValue > 0) {
    data.sticky = stickyValue;
  }
  return matter.stringify(String(input.content || '').trimStart(), data);
}

async function readJsonFile(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

async function writeJsonFile(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function appendActivity(action, detail = {}) {
  try {
    await fs.mkdir(path.dirname(activityFile), { recursive: true });
    const item = {
      time: new Date().toISOString(),
      action,
      detail,
    };
    await fs.appendFile(activityFile, `${JSON.stringify(item)}\n`, 'utf8');
  } catch (_) {
    // Logging must never block the real admin action.
  }
}

async function readActivity(limit = 80) {
  try {
    const raw = await fs.readFile(activityFile, 'utf8');
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-limit)
      .reverse()
      .map((line) => JSON.parse(line));
  } catch (_) {
    return [];
  }
}

async function readAllPosts() {
  await ensureDirs();
  const files = (await fs.readdir(postsDir)).filter((file) => file.endsWith('.md'));
  return Promise.all(files.map(readPost));
}

function encodedPath(parts) {
  return parts.map((part) => encodeURIComponent(part)).join('/');
}

async function listResources() {
  await ensureDirs();
  const rootPath = await getSiteRoot();
  const siteRoot = rootPath.replace(/\/$/, '');
  const resources = [];
  const addFile = async (kind, fullPath, publicPath, extra = {}) => {
    const stat = await fs.stat(fullPath);
    const name = path.basename(fullPath);
    const ext = path.extname(name.replace(/\.locked$/i, '')).toLowerCase();
    const isImage = /\.(png|jpe?g|gif|webp)$/i.test(name);
    const url = `${siteRoot}/${publicPath.split('/').map(encodeURIComponent).join('/')}`;
    resources.push({
      kind,
      name,
      ext,
      size: stat.size,
      updatedAt: stat.mtime.toISOString(),
      url,
      markdown: isImage ? `![${name}](${url})` : `[${name}](${url})`,
      ...extra,
    });
  };

  try {
    const uploads = await fs.readdir(uploadsDir);
    for (const name of uploads) {
      const fullPath = path.join(uploadsDir, name);
      if ((await fs.stat(fullPath)).isFile()) {
        await addFile('public', fullPath, `uploads/${name}`, { access: '公开' });
      }
    }
  } catch (_) {}

  const secureFilesDir = path.join(secureDir, 'files');
  try {
    const protectedFiles = await fs.readdir(secureFilesDir);
    for (const name of protectedFiles) {
      const fullPath = path.join(secureFilesDir, name);
      if (!(await fs.stat(fullPath)).isFile()) continue;
      const originalGuess = name.replace(/\.locked$/i, '');
      const base = name.replace(/\.[^.]+\.locked$/i, '');
      const manifest = path.join(secureDir, 'previews', base, 'manifest.json');
      const hasPreview = fss.existsSync(manifest);
      const previewPath = hasPreview ? `&preview=previews/${encodeURIComponent(base)}/manifest.json` : '';
      const openUrl = `${siteRoot}/secure/?file=files/${encodeURIComponent(name)}&name=${encodeURIComponent(originalGuess)}${previewPath}`;
      await addFile('protected', fullPath, `secure/files/${name}`, {
        access: hasPreview ? '密码 + 预览' : '密码',
        openUrl,
        markdown: `[${originalGuess}](${openUrl})`,
        preview: hasPreview,
      });
    }
  } catch (_) {}

  resources.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return resources;
}

function sanitizeColumn(input, index = 0) {
  const name = String(input.name || '').trim();
  return {
    id: String(input.id || safeName(name, `column-${Date.now()}-${index}`)).trim(),
    name,
    slug: safeName(input.slug || name, `column-${Date.now()}-${index}`),
    description: String(input.description || '').trim(),
    cover: String(input.cover || '').trim(),
    order: Number.isFinite(Number(input.order)) ? Number(input.order) : index + 1,
    visible: input.visible !== false,
  };
}

async function readColumns() {
  const saved = await readJsonFile(columnsFile, []);
  const columns = Array.isArray(saved) ? saved.map(sanitizeColumn).filter((item) => item.name) : [];
  const posts = await readAllPosts();
  const counts = new Map();
  posts.forEach((post) => {
    normalizeList(post.categories).forEach((category) => counts.set(category, (counts.get(category) || 0) + 1));
  });
  columns.forEach((column) => { column.postCount = counts.get(column.name) || 0; });
  Array.from(counts.keys()).forEach((name) => {
    if (!columns.some((column) => column.name === name)) {
      columns.push({
        id: safeName(name, `column-${columns.length + 1}`),
        name,
        slug: safeName(name, `column-${columns.length + 1}`),
        description: '',
        cover: '',
        order: columns.length + 1,
        visible: true,
        postCount: counts.get(name) || 0,
      });
    }
  });
  columns.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || a.name.localeCompare(b.name, 'zh'));
  return columns;
}

async function writeColumns(columns) {
  const cleaned = (Array.isArray(columns) ? columns : [])
    .map(sanitizeColumn)
    .filter((item) => item.name)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || a.name.localeCompare(b.name, 'zh'));
  await writeJsonFile(columnsFile, cleaned);
  await fs.mkdir(path.dirname(columnsPageFile), { recursive: true });
  const body = cleaned
    .filter((column) => column.visible)
    .map((column) => [
      `## ${column.name}`,
      column.description || '这个专栏还没有填写简介。',
      '',
      `[查看文章](/categories/${encodeURIComponent(column.name)}/)`,
    ].join('\n'))
    .join('\n\n---\n\n');
  await fs.writeFile(columnsPageFile, `---\ntitle: 专栏\nlayout: page\n---\n\n# 专栏\n\n${body || '暂未创建专栏。'}\n`, 'utf8');
  return cleaned;
}

function formatYamlValue(value) {
  const s = String(value == null ? '' : value);
  if (s === '') return "''";
  if (/[:#'"&*!|>{}\[\],\n]/.test(s) || /^\s|\s$/.test(s) || /^(true|false|yes|no|null|~)$/i.test(s)) {
    return `'${s.replace(/'/g, "''")}'`;
  }
  return s;
}

function replaceTopLevelField(text, key, newValue) {
  const re = new RegExp(`^(${key}:[ \\t]*).*$`, 'm');
  if (!re.test(text)) return text;
  return text.replace(re, `$1${formatYamlValue(newValue)}`);
}

function findSectionRange(text, sectionName) {
  const startRe = new RegExp(`^${sectionName}:[ \\t]*\\r?\\n`, 'm');
  const startMatch = startRe.exec(text);
  if (!startMatch) return null;
  const startIdx = startMatch.index;
  const afterHeader = startMatch.index + startMatch[0].length;
  const rest = text.slice(afterHeader);
  const nextSectionRe = /^[a-zA-Z_][\w\-]*:/m;
  const nextMatch = nextSectionRe.exec(rest);
  const endIdx = nextMatch ? afterHeader + nextMatch.index : text.length;
  return { startIdx, headerEnd: afterHeader, endIdx };
}

function replaceFieldUnderSection(text, sectionName, fieldName, newValue) {
  const range = findSectionRange(text, sectionName);
  if (!range) return text;
  const sectionText = text.slice(range.headerEnd, range.endIdx);
  const fieldRe = new RegExp(`^([ \\t]+${fieldName}:[ \\t]*).*$`, 'm');
  if (!fieldRe.test(sectionText)) return text;
  const newSectionText = sectionText.replace(fieldRe, `$1${formatYamlValue(newValue)}`);
  return text.slice(0, range.headerEnd) + newSectionText + text.slice(range.endIdx);
}

function readFieldUnderSection(text, sectionName, fieldName) {
  const range = findSectionRange(text, sectionName);
  if (!range) return '';
  const sectionText = text.slice(range.headerEnd, range.endIdx);
  const fieldRe = new RegExp(`^[ \\t]+${fieldName}:[ \\t]*(.+?)\\s*$`, 'm');
  const m = sectionText.match(fieldRe);
  if (!m) return '';
  return m[1].replace(/^['"]|['"]$/g, '').trim();
}

function readSloganList(text) {
  const range = findSectionRange(text, 'index');
  if (!range) return [];
  const sectionText = text.slice(range.headerEnd, range.endIdx);
  const textBlockRe = /^[ \t]+text:[ \t]*\r?\n((?:[ \t]+-[ \t]+.+\r?\n?)+)/m;
  const m = sectionText.match(textBlockRe);
  if (!m) return [];
  return m[1]
    .split(/\r?\n/)
    .map((line) => {
      const itemMatch = line.match(/^[ \t]+-[ \t]+(.+?)\s*$/);
      if (!itemMatch) return null;
      return itemMatch[1].replace(/^['"]|['"]$/g, '').trim();
    })
    .filter(Boolean);
}

function replaceSloganList(text, slogans) {
  const range = findSectionRange(text, 'index');
  if (!range) return text;
  const sectionText = text.slice(range.headerEnd, range.endIdx);
  const textBlockRe = /^([ \t]+text:[ \t]*\r?\n)((?:[ \t]+-[ \t]+.+\r?\n?)+)/m;
  const m = sectionText.match(textBlockRe);
  if (!m) return text;
  const indent = (m[1].match(/^([ \t]+)/) || ['', '  '])[1];
  const itemIndent = `${indent}  `;
  const list = (slogans.length ? slogans : ['']).map((s) => `${itemIndent}- ${formatYamlValue(s)}`).join('\n');
  const newSectionText = sectionText.replace(textBlockRe, `$1${list}\n`);
  return text.slice(0, range.headerEnd) + newSectionText + text.slice(range.endIdx);
}

function run(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, { cwd: root, shell: true }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        code: error ? error.code : 0,
        output: [stdout, stderr].filter(Boolean).join('\n').trim(),
      });
    });
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeJob() {
  const id = crypto.randomBytes(12).toString('hex');
  const job = { id, status: 'running', logs: [], startedAt: new Date().toISOString(), siteOk: false };
  jobs.set(id, job);
  return job;
}

function addLog(job, message) {
  const line = `[${new Date().toLocaleTimeString()}] ${message}`;
  job.logs.push(line);
  if (job.logs.length > 600) job.logs.shift();
}

function runStreaming(job, command, args, options = {}) {
  return new Promise((resolve) => {
    addLog(job, `> ${[command, ...args].join(' ')}`);
    const isCmd = process.platform === 'win32' && command.toLowerCase().endsWith('.cmd');
    const actualCommand = isCmd ? 'cmd.exe' : command;
    const actualArgs = isCmd ? ['/d', '/s', '/c', command, ...args] : args;
    const child = spawn(actualCommand, actualArgs, {
      cwd: root,
      shell: false,
      env: { ...process.env, ...options.env },
    });
    let output = '';
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      output += text;
      text.split(/\r?\n/).filter(Boolean).forEach((line) => addLog(job, line));
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      output += text;
      text.split(/\r?\n/).filter(Boolean).forEach((line) => addLog(job, line));
    });
    child.on('close', (code) => {
      resolve({ ok: code === 0, code, output });
    });
  });
}

async function getCredentialToken() {
  const result = await run('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
  });
  const match = result.output.match(/^password=(.+)$/m);
  return match ? match[1].trim() : '';
}

function runWithInput(command, args, input) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: root, shell: true });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk) => { output += chunk.toString('utf8'); });
    child.on('close', (code) => resolve({ ok: code === 0, code, output }));
    child.stdin.end(input);
  });
}

function execPlain(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, { cwd: root, shell: false }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        code: error ? error.code : 0,
        output: [stdout, stderr].filter(Boolean).join('\n').trim(),
      });
    });
  });
}

async function githubRequest(pathname, options = {}) {
  const tokenResult = await runWithInput('git', ['credential', 'fill'], 'protocol=https\nhost=github.com\n\n');
  const token = (tokenResult.output.match(/^password=(.+)$/m) || [])[1];
  if (!token) throw new Error('没有找到 GitHub 登录凭据');
  const res = await fetch(`https://api.github.com${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'boke-admin',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function latestPagesRun() {
  const data = await githubRequest(`/repos/${githubOwner}/${githubRepo}/actions/workflows/pages.yml/runs?per_page=1`);
  return data.workflow_runs && data.workflow_runs[0];
}

async function pushWithGithubApi(job) {
  addLog(job, '普通 git push 不可用，改用 GitHub API 发布...');
  const apiPush = await runStreaming(job, 'node', ['tools/github-api-publish.js']);
  if (!apiPush.ok) throw new Error('GitHub API 发布失败');
  const match = apiPush.output.match(/API_PUSH_SHA=([0-9a-f]{40})/);
  if (!match) throw new Error('GitHub API 发布成功但没有返回提交号');
  return match[1];
}

async function checkPublicSite() {
  const res = await fetch(publicSiteUrl, { cache: 'no-store' });
  return res.ok;
}

async function latestPostExpectation() {
  try {
    const files = (await fs.readdir(postsDir)).filter((file) => file.endsWith('.md'));
    const posts = await Promise.all(files.map(readPost));
    posts.sort((a, b) => {
      const aTime = new Date(a.date || 0).getTime() || 0;
      const bTime = new Date(b.date || 0).getTime() || 0;
      return bTime - aTime;
    });
    const latest = posts[0];
    return latest ? latest.title : '';
  } catch (_) {
    return '';
  }
}

async function publicSiteContains(text) {
  if (!text) return true;
  const res = await fetch(`${publicSiteUrl}?v=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return false;
  const html = await res.text();
  return html.includes(text);
}

async function waitForDeployment(job, expectedSha) {
  addLog(job, '正在监测 GitHub Pages 自动部署...');
  let lastId = '';
  for (let i = 0; i < 60; i += 1) {
    const runInfo = await latestPagesRun();
    if (runInfo) {
      lastId = runInfo.id;
      job.actionsUrl = runInfo.html_url;
      const shortSha = String(runInfo.head_sha || '').slice(0, 7);
      addLog(job, `GitHub Actions: ${runInfo.status}${runInfo.conclusion ? ` / ${runInfo.conclusion}` : ''} (${shortSha})`);
      if (expectedSha && runInfo.head_sha !== expectedSha) {
        addLog(job, '等待当前提交触发新的部署...');
      } else if (runInfo.status === 'completed') {
        if (runInfo.conclusion !== 'success') throw new Error(`GitHub Actions 部署失败：${runInfo.html_url}`);
        break;
      }
    }
    await wait(5000);
  }

  const expectedTitle = await latestPostExpectation();
  addLog(job, expectedTitle ? `正在检测公开博客是否出现文章：${expectedTitle}` : '正在检测公开博客是否可访问...');
  for (let i = 0; i < 18; i += 1) {
    if ((await checkPublicSite()) && (await publicSiteContains(expectedTitle))) {
      job.siteOk = true;
      addLog(job, `公开博客已经可以访问：${publicSiteUrl}`);
      return;
    }
    addLog(job, '公开博客暂未刷新，继续等待...');
    await wait(5000);
  }
  throw new Error(`部署任务 ${lastId || ''} 已结束，但公开页面暂未检测到更新`);
}

async function runPublishJob(job) {
  try {
    const build = await runStreaming(job, 'npm.cmd', ['run', 'build']);
    if (!build.ok) throw new Error('本地构建失败');

    await runStreaming(job, 'git', ['config', 'http.postBuffer', '524288000']);
    await runStreaming(job, 'git', ['config', 'http.lowSpeedLimit', '0']);
    await runStreaming(job, 'git', ['config', 'http.lowSpeedTime', '999999']);
    await runStreaming(job, 'git', ['add', '.']);
    const status = await runStreaming(job, 'git', ['status', '--porcelain']);
    let shouldPush = false;
    if (!status.output.trim()) {
      addLog(job, '没有新的本地改动需要提交。');
    } else {
      const message = `update blog ${new Date().toLocaleString('zh-CN', { hour12: false })}`;
      const commit = await runStreaming(job, 'git', ['commit', '-m', message]);
      if (!commit.ok) throw new Error('提交失败');
      shouldPush = true;
    }

    const ahead = await runStreaming(job, 'git', ['status', '--short', '--branch']);
    if (ahead.output.includes('[ahead ')) shouldPush = true;
    let expectedSha = '';
    if (shouldPush) {
      let push = await runStreaming(job, 'git', ['push']);
      if (!push.ok) {
        addLog(job, '推送失败，10 秒后自动重试一次...');
        await wait(10000);
        push = await runStreaming(job, 'git', ['push']);
      }
      if (!push.ok) {
        expectedSha = await pushWithGithubApi(job);
      }
    }

    if (shouldPush && !expectedSha) {
      const head = await runStreaming(job, 'git', ['rev-parse', 'HEAD']);
      expectedSha = head.output.trim().split(/\r?\n/).pop();
    }
    await waitForDeployment(job, expectedSha);
    job.status = 'success';
    addLog(job, '发布完成，其他人刷新公开博客即可看到。');
    await appendActivity('publish_success', { jobId: job.id });
  } catch (error) {
    job.status = 'failed';
    addLog(job, `发布失败：${error.message}`);
    await appendActivity('publish_failed', { jobId: job.id, error: error.message });
  }
  job.finishedAt = new Date().toISOString();
}

async function encryptFile(inputPath, outputPath, passwordText) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(passwordText, salt, 210000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const source = await fs.readFile(inputPath);
  const encrypted = Buffer.concat([cipher.update(source), cipher.final()]);
  const tag = cipher.getAuthTag();
  await fs.writeFile(outputPath, JSON.stringify({
    v: 1,
    alg: 'AES-GCM',
    kdf: 'PBKDF2',
    hash: 'SHA-256',
    iterations: 210000,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64'),
  }));
}

async function makePreview(inputPath, ext, base, originalName) {
  const previewRoot = path.join(secureDir, 'previews', base);
  await fs.mkdir(previewRoot, { recursive: true });
  if (['.pdf', '.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    const result = await execPlain('python', ['tools/make-preview.py', inputPath, previewRoot, `仅供预览 ${new Date().getFullYear()}`, ext]);
    if (!result.ok) throw new Error(`预览生成失败：${result.output}`);
    const data = JSON.parse(result.output.trim().split(/\r?\n/).pop());
    return {
      type: 'images',
      title: originalName,
      pages: data.pages.map((page) => `previews/${encodeURIComponent(base)}/${encodeURIComponent(page)}`),
    };
  }
  if (ext === '.docx') {
    const converted = await mammoth.convertToHtml({ path: inputPath });
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>body{font-family:Microsoft YaHei,Segoe UI,sans-serif;line-height:1.8;max-width:860px;margin:0 auto;padding:24px;color:#1d2733}.wm{position:fixed;inset:0;pointer-events:none;background:repeating-linear-gradient(-25deg,rgba(0,0,0,.045) 0,rgba(0,0,0,.045) 1px,transparent 1px,transparent 140px);z-index:999}</style></head><body><div class="wm"></div><h1>${originalName}</h1>${converted.value}</body></html>`;
    await fs.writeFile(path.join(previewRoot, 'preview.html'), html, 'utf8');
    return {
      type: 'html',
      title: originalName,
      html: `previews/${encodeURIComponent(base)}/preview.html`,
    };
  }
  return null;
}

app.use(assertLocal);

app.post('/api/login', async (req, res) => {
  if (req.body.password !== password) {
    await appendActivity('login_failed', { reason: 'password' });
    res.status(401).json({ error: '密码不正确' });
    return;
  }
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, Date.now());
  await appendActivity('login_success');
  res.json({ token });
});

app.get('/api/dashboard', auth, async (_req, res) => {
  await ensureDirs();
  const posts = await readAllPosts();
  const resources = await listResources();
  const categories = new Set();
  const tags = new Set();
  posts.forEach((post) => {
    normalizeList(post.categories).forEach((item) => categories.add(item));
    normalizeList(post.tags).forEach((item) => tags.add(item));
  });
  const latest = posts
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 5)
    .map(({ content, ...post }) => post);
  const gitStatus = await run('git', ['status', '--short', '--branch']);
  const lastCommit = await run('git', ['log', '-1', '--pretty=%h %s']);
  let latestRun = null;
  try {
    latestRun = await latestPagesRun();
  } catch (_) {}
  res.json({
    siteUrl: publicSiteUrl,
    github: { owner: githubOwner, repo: githubRepo },
    counts: {
      posts: posts.length,
      sticky: posts.filter((post) => Number(post.sticky) > 0).length,
      categories: categories.size,
      tags: tags.size,
      resources: resources.length,
      protectedResources: resources.filter((item) => item.kind === 'protected').length,
    },
    latest,
    git: {
      status: gitStatus.output || '',
      lastCommit: lastCommit.output || '',
    },
    latestRun,
    activity: await readActivity(12),
  });
});

app.get('/api/activity', auth, async (req, res) => {
  res.json(await readActivity(Number(req.query.limit) || 120));
});

app.put('/api/password', auth, async (req, res) => {
  const oldPassword = String(req.body.oldPassword || '');
  const newPassword = String(req.body.newPassword || '').trim();
  if (oldPassword !== password) {
    await appendActivity('password_change_failed', { reason: 'old_password' });
    res.status(403).json({ error: '原密码不正确' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: '新密码至少 8 位' });
    return;
  }
  await fs.writeFile(passwordFile, `${newPassword}\n`, 'utf8');
  password = newPassword;
  sessions.clear();
  await appendActivity('password_changed');
  res.json({ ok: true });
});

app.get('/api/resources', auth, async (_req, res) => {
  res.json(await listResources());
});

app.delete('/api/resources', auth, async (req, res) => {
  const kind = String(req.body.kind || '');
  const name = path.basename(String(req.body.name || ''));
  if (!name || name !== String(req.body.name || '')) {
    res.status(400).json({ error: '文件名不合法' });
    return;
  }
  if (kind === 'public') {
    await fs.rm(path.join(uploadsDir, name), { force: true });
    await appendActivity('resource_deleted', { kind, name });
    res.json({ ok: true });
    return;
  }
  if (kind === 'protected') {
    await fs.rm(path.join(secureDir, 'files', name), { force: true });
    const base = name.replace(/\.[^.]+\.locked$/i, '');
    if (base && base !== name) {
      await fs.rm(path.join(secureDir, 'previews', base), { recursive: true, force: true });
    }
    await appendActivity('resource_deleted', { kind, name });
    res.json({ ok: true });
    return;
  }
  res.status(400).json({ error: '资源类型不合法' });
});

app.get('/api/columns', auth, async (_req, res) => {
  res.json(await readColumns());
});

app.put('/api/columns', auth, async (req, res) => {
  const columns = await writeColumns(req.body.columns || []);
  await appendActivity('columns_saved', { count: columns.length });
  res.json(columns);
});

app.get('/api/posts', auth, async (_req, res) => {
  await ensureDirs();
  const posts = await readAllPosts();
  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  res.json(posts.map(({ content, ...post }) => post));
});

app.get('/api/posts/:file', auth, async (req, res) => {
  res.json(await readPost(req.params.file));
});

app.get('/api/contact', auth, async (_req, res) => {
  await ensureDirs();
  try {
    res.json(JSON.parse(await fs.readFile(contactFile, 'utf8')));
  } catch (_) {
    res.json({ qq: '', wechat: '', wechatQr: '', note: '' });
  }
});

app.put('/api/contact', auth, async (req, res) => {
  await ensureDirs();
  const contact = {
    qq: String(req.body.qq || '').trim(),
    wechat: String(req.body.wechat || '').trim(),
    wechatQr: String(req.body.wechatQr || '').trim(),
    note: String(req.body.note || '').trim(),
  };
  await fs.writeFile(contactFile, `${JSON.stringify(contact, null, 2)}\n`, 'utf8');
  await appendActivity('contact_saved');
  res.json(contact);
});

app.get('/api/site-config', auth, async (_req, res) => {
  try {
    const main = await fs.readFile(hexoConfig, 'utf8');
    const fluidPath = path.join(root, '_config.fluid.yml');
    const fluid = await fs.readFile(fluidPath, 'utf8');
    const matchTop = (text, key) => {
      const m = text.match(new RegExp(`^${key}:[ \\t]*(.+?)\\s*$`, 'm'));
      return m ? m[1].replace(/^['"]|['"]$/g, '').trim() : '';
    };
    res.json({
      title: matchTop(main, 'title'),
      subtitle: matchTop(main, 'subtitle'),
      description: matchTop(main, 'description'),
      author: matchTop(main, 'author'),
      siteUrl: publicSiteUrl,
      navbarTitle: readFieldUnderSection(fluid, 'navbar', 'blog_title'),
      aboutName: readFieldUnderSection(fluid, 'about', 'name'),
      aboutIntro: readFieldUnderSection(fluid, 'about', 'intro'),
      slogans: readSloganList(fluid),
    });
  } catch (error) {
    res.status(500).json({ error: `读取站点配置失败：${error.message}` });
  }
});

app.put('/api/site-config', auth, async (req, res) => {
  try {
    const fluidPath = path.join(root, '_config.fluid.yml');
    let main = await fs.readFile(hexoConfig, 'utf8');
    let fluid = await fs.readFile(fluidPath, 'utf8');
    const body = req.body || {};
    const setIf = (value, fn) => {
      if (typeof value === 'string') fn(value.trim());
    };
    setIf(body.title, (v) => {
      main = replaceTopLevelField(main, 'title', v);
      // 同步导航栏标题，避免被旧值覆盖（核心 bug 修复点）
      fluid = replaceFieldUnderSection(fluid, 'navbar', 'blog_title', v);
    });
    setIf(body.subtitle, (v) => { main = replaceTopLevelField(main, 'subtitle', v); });
    setIf(body.description, (v) => { main = replaceTopLevelField(main, 'description', v); });
    setIf(body.author, (v) => { main = replaceTopLevelField(main, 'author', v); });
    setIf(body.navbarTitle, (v) => { fluid = replaceFieldUnderSection(fluid, 'navbar', 'blog_title', v); });
    setIf(body.aboutName, (v) => { fluid = replaceFieldUnderSection(fluid, 'about', 'name', v); });
    setIf(body.aboutIntro, (v) => { fluid = replaceFieldUnderSection(fluid, 'about', 'intro', v); });
    if (Array.isArray(body.slogans)) {
      const cleaned = body.slogans.map((s) => String(s || '').trim()).filter(Boolean);
      fluid = replaceSloganList(fluid, cleaned);
    }
    await fs.writeFile(hexoConfig, main, 'utf8');
    await fs.writeFile(fluidPath, fluid, 'utf8');
    await appendActivity('site_config_saved', {
      title: typeof body.title === 'string' ? body.title.trim() : undefined,
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: `保存站点配置失败：${error.message}` });
  }
});

// 标签和分类汇总（用于自动补全）
app.get('/api/taxonomy', auth, async (_req, res) => {
  await ensureDirs();
  try {
    const files = (await fs.readdir(postsDir)).filter((file) => file.endsWith('.md'));
    const posts = await Promise.all(files.map(readPost));
    const categories = new Set();
    const tags = new Set();
    posts.forEach((post) => {
      (post.categories || []).forEach((c) => categories.add(String(c)));
      (post.tags || []).forEach((t) => tags.add(String(t)));
    });
    res.json({ categories: Array.from(categories), tags: Array.from(tags) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 草稿自动保存（仅本地文件，不会发布）
app.put('/api/draft', auth, async (req, res) => {
  await ensureDirs();
  try {
    const draftDir = path.join(root, '.admin-tmp');
    await fs.mkdir(draftDir, { recursive: true });
    const draftFile = path.join(draftDir, 'autosave.json');
    await fs.writeFile(draftFile, JSON.stringify({
      ...req.body,
      savedAt: new Date().toISOString(),
    }, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/draft', auth, async (_req, res) => {
  try {
    const draftFile = path.join(root, '.admin-tmp', 'autosave.json');
    const raw = await fs.readFile(draftFile, 'utf8');
    res.json(JSON.parse(raw));
  } catch (_) {
    res.json(null);
  }
});

app.post('/api/posts', auth, async (req, res) => {
  await ensureDirs();
  const title = req.body.title || '未命名文章';
  const file = await uniquePostFile(safeName(req.body.slug || title, `post-${Date.now()}`));
  const fullPath = path.join(postsDir, file);
  try {
    await fs.access(fullPath);
    res.status(409).json({ error: '同名文章已经存在' });
    return;
  } catch (_) {
    await fs.writeFile(fullPath, postMarkdown({ ...req.body, title }), 'utf8');
    await appendActivity('post_created', { file, title });
    res.json(await readPost(file));
  }
});

app.put('/api/posts/:file', auth, async (req, res) => {
  await ensureDirs();
  const file = req.params.file;
  if (!file.endsWith('.md') || file.includes('/') || file.includes('\\')) {
    res.status(400).json({ error: '文件名不合法' });
    return;
  }
  await fs.writeFile(path.join(postsDir, file), postMarkdown(req.body), 'utf8');
  await appendActivity('post_saved', { file, title: req.body.title || file });
  res.json(await readPost(file));
});

app.delete('/api/posts/:file', auth, async (req, res) => {
  const file = req.params.file;
  if (!file.endsWith('.md') || file.includes('/') || file.includes('\\')) {
    res.status(400).json({ error: '文件名不合法' });
    return;
  }
  await fs.rm(path.join(postsDir, file), { force: true });
  await appendActivity('post_deleted', { file });
  res.json({ ok: true });
});

app.post('/api/upload', auth, upload.single('file'), async (req, res) => {
  await ensureDirs();
  if (!req.file) {
    res.status(400).json({ error: '请选择文件' });
    return;
  }
  const ext = path.extname(req.file.originalname).toLowerCase();
  const allowed = new Set(['.pdf', '.docx', '.doc', '.pptx', '.xlsx', '.zip', '.png', '.jpg', '.jpeg', '.gif', '.webp']);
  if (!allowed.has(ext)) {
    await fs.rm(req.file.path, { force: true });
    res.status(400).json({ error: '暂不支持这个文件类型' });
    return;
  }
  const name = `${Date.now()}-${safeName(path.basename(req.file.originalname, ext), 'file')}${ext}`;
  const target = path.join(uploadsDir, name);
  await fs.rename(req.file.path, target);
  const rootPath = await getSiteRoot();
  const publicUrl = `${rootPath.replace(/\/$/, '')}/uploads/${encodeURIComponent(name)}`;
  await appendActivity('resource_uploaded', { kind: 'public', name, size: req.file.size });
  res.json({
    name,
    url: publicUrl,
    markdown: ext.match(/\.(png|jpe?g|gif|webp)$/) ? `![${name}](${publicUrl})` : `[${name}](${publicUrl})`,
  });
});

app.post('/api/upload-protected', auth, upload.single('file'), async (req, res) => {
  await ensureDirs();
  if (!req.file) {
    res.status(400).json({ error: '请选择文件' });
    return;
  }
  const filePassword = String(req.body.password || '').trim();
  if (!filePassword) {
    await fs.rm(req.file.path, { force: true });
    res.status(400).json({ error: '请设置文件打开密码' });
    return;
  }
  const ext = path.extname(req.file.originalname).toLowerCase();
  const allowed = new Set(['.pdf', '.docx', '.doc', '.pptx', '.xlsx', '.zip', '.png', '.jpg', '.jpeg', '.webp']);
  if (!allowed.has(ext)) {
    await fs.rm(req.file.path, { force: true });
    res.status(400).json({ error: '安全上传支持 PDF、Word、PPT、Excel、ZIP 和图片' });
    return;
  }
  const base = `${Date.now()}-${safeName(path.basename(req.file.originalname, ext), 'file')}`;
  const encryptedName = `${base}${ext}.locked`;
  const targetDir = path.join(secureDir, 'files');
  await fs.mkdir(targetDir, { recursive: true });
  const preview = await makePreview(req.file.path, ext, base, req.file.originalname);
  await encryptFile(req.file.path, path.join(targetDir, encryptedName), filePassword);
  await fs.rm(req.file.path, { force: true });
  if (preview) {
    await fs.writeFile(path.join(secureDir, 'previews', base, 'manifest.json'), JSON.stringify(preview, null, 2), 'utf8');
  }
  const rootPath = await getSiteRoot();
  const filePath = `files/${encodeURIComponent(encryptedName)}`;
  const previewPath = preview ? `&preview=previews/${encodeURIComponent(base)}/manifest.json` : '';
  const openUrl = `${rootPath.replace(/\/$/, '')}/secure/?file=${filePath}&name=${encodeURIComponent(req.file.originalname)}${previewPath}`;
  await appendActivity('resource_uploaded', { kind: 'protected', name: req.file.originalname, encryptedName });
  res.json({
    name: req.file.originalname,
    url: openUrl,
    markdown: `[${req.file.originalname}](${openUrl})`,
  });
});

app.post('/api/build', auth, async (_req, res) => {
  res.json(await run('npm.cmd', ['run', 'build']));
});

app.post('/api/import-md', auth, upload.single('file'), async (req, res) => {
  await ensureDirs();
  if (!req.file) {
    res.status(400).json({ error: '请选择 Markdown 文件' });
    return;
  }
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (ext !== '.md' && ext !== '.markdown') {
    await fs.rm(req.file.path, { force: true });
    res.status(400).json({ error: '只能导入 .md 或 .markdown 文件' });
    return;
  }
  try {
    const raw = await fs.readFile(req.file.path, 'utf8');
    const parsed = matter(raw);
    const titleFromFM = parsed.data && parsed.data.title;
    const titleFromName = path.basename(req.file.originalname, ext);
    const title = String(titleFromFM || titleFromName || '未命名文章').trim();
    const file = await uniquePostFile(safeName(title, `post-${Date.now()}`));
    const stickyValue = parsed.data && Number(parsed.data.sticky);
    const postBody = {
      title,
      date: parsed.data && parsed.data.date ? String(parsed.data.date) : todayString(),
      categories: parsed.data ? parsed.data.categories : [],
      tags: parsed.data ? parsed.data.tags : [],
      sticky: Number.isFinite(stickyValue) ? stickyValue : 0,
      content: parsed.content.trimStart(),
    };
    await fs.writeFile(path.join(postsDir, file), postMarkdown(postBody), 'utf8');
    await fs.rm(req.file.path, { force: true });
    await appendActivity('post_imported', { file, title });
    res.json(await readPost(file));
  } catch (error) {
    await fs.rm(req.file.path, { force: true });
    res.status(500).json({ error: `导入失败：${error.message}` });
  }
});

app.post('/api/publish', auth, async (_req, res) => {
  const job = makeJob();
  addLog(job, '发布任务已创建。');
  appendActivity('publish_started', { jobId: job.id });
  runPublishJob(job);
  res.json({ jobId: job.id });
});

app.get('/api/jobs/:id', auth, (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }
  res.json(job);
});

app.listen(port, '127.0.0.1', async () => {
  await ensureDirs();
  try {
    const filePassword = (await fs.readFile(passwordFile, 'utf8')).trim();
    if (filePassword) password = filePassword;
  } catch (_) {
    // Use the default or environment password when no local password file exists.
  }
  console.log(`博客管理员后台已启动：http://127.0.0.1:${port}`);
  console.log(`默认密码：${password}`);
});
