# 晚风の技术笔记

这是一个基于 Hexo 和 Fluid 主题搭建的博客项目，目标目录：

```text
D:\BOKE plus
```

目标域名：

```text
https://wf.5yu.org/
```

## 本地预览

```powershell
cd /d "D:\BOKE plus"
npm run server
```

默认访问：

```text
http://localhost:4000/
```

## 管理员后台

```powershell
cd /d "D:\BOKE plus"
npm run admin
```

打开：

```text
http://127.0.0.1:5050/
```

默认密码：

```text
admin123
```

## 发布

```powershell
cd /d "D:\BOKE plus"
npm run publish
```

GitHub Pages 会通过 `.github/workflows/pages.yml` 自动构建和发布。

## 自定义域名

Hexo 自定义域名文件已经写入：

```text
source\CNAME
```

内容是：

```text
wf.5yu.org
```

还需要在域名平台后台给 `5yu.org` 添加 DNS 解析：

```text
主机记录：wf
记录类型：CNAME
记录值：wfcrush.github.io
```

DNS 生效后，在 GitHub 仓库 `Settings -> Pages -> Custom domain` 填入：

```text
wf.5yu.org
```

并开启 `Enforce HTTPS`。

