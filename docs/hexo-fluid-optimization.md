# Hexo + Fluid 博客优化与维护说明

本文档对应站点：`https://wanfeng.888.moe/`，项目根目录：`D:\BOKE plus`。

## 核心文件

- `D:\BOKE plus\_config.yml`：Hexo 主配置，包含 `url: https://wanfeng.888.moe` 和 `root: /`
- `D:\BOKE plus\_config.fluid.yml`：Fluid 主题配置
- `D:\BOKE plus\source\css\blog-custom.css`：自定义样式
- `D:\BOKE plus\source\js\site-enhance.js`：自定义交互
- `D:\BOKE plus\source\CNAME`：GitHub Pages 自定义域名，内容为 `wanfeng.888.moe`

## 已启用功能

- Fluid 暗色模式、搜索、返回顶部、文章目录、代码复制、图片放大、字数统计和阅读时间
- 首页卡片式文章列表和右侧信息栏
- 紫色库洛米鼠标效果
- 阅读进度条、点赞、选中文字分享到 Twitter/微博
- SEO：`sitemap.xml`、`robots.txt`、canonical、Open Graph、Schema.org
- 图片 WebP/响应式优化：`hexo-image-opt`

## GitHub Pages

当前使用 `.github/workflows/pages.yml` 进行 GitHub Actions 部署。

仓库建议：

```text
WFCrush/boke-plus
```

GitHub Pages 设置：

```text
Settings -> Pages -> Source -> GitHub Actions
```

自定义域名：

```text
Settings -> Pages -> Custom domain -> wanfeng.888.moe
```

DNS 生效后开启：

```text
Enforce HTTPS
```

## DNS 设置

在 `localhost.cc` 后台给 `wanfeng.888.moe` 添加：

```text
主机记录：wanfeng
记录类型：CNAME
记录值：wfcrush.github.io
```

如果后台要求填写完整主机名，就填：

```text
wanfeng.888.moe
```

## 评论

当前 Giscus 已预留仓库：

```yaml
giscus:
  repo: WFCrush/boke-plus
  repo-id:
  category: General
  category-id:
```

需要你在 GitHub 仓库开启 Discussions，并安装 Giscus App，然后到 `https://giscus.app/zh-CN` 获取 `repo-id` 和 `category-id`。
