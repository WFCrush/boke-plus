$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

npm run build
git add .

$changes = git status --porcelain
if (-not $changes) {
  Write-Host '没有需要发布的新内容。'
  exit 0
}

$message = "update blog $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git commit -m $message
git push
if ($LASTEXITCODE -ne 0) {
  Write-Host '普通 git push 失败，正在改用 GitHub API 发布...'
  node tools/github-api-publish.js
  if ($LASTEXITCODE -ne 0) {
    throw '发布到 GitHub 失败，请检查 GitHub 登录凭据。'
  }
}

Write-Host '发布完成，稍等一会儿访问：'
Write-Host 'https://wanfeng.888.moe/'
Write-Host '如果刚发布后还没看到，请等待 GitHub Pages 自动部署完成，通常需要 30 到 90 秒。'
