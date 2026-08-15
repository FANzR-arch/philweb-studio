# Content Workspace

这个目录是网站的内容中心。复刻或维护时，优先只改 `content/`，不要直接改组件代码。

## 目录结构

- `text/`：所有可编辑文案、项目说明、博客文字。
- `media/`：所有图片、Logo、二维码、项目详情图、博客封面。
- `theme/`：网站颜色、明暗模式、阴影、项目色等视觉 token。
- `config/`：预留给站点级配置，目前主要配置仍在 `text/site/shared.yml`。

## 常用入口

- 首页文案：`content/text/site/home.zh.md` 和 `content/text/site/home.en.md`
- 简历文案：`content/text/site/resume.zh.md` 和 `content/text/site/resume.en.md`
- 联系方式：`content/text/site/contact.zh.md`、`content/text/site/contact.en.md`、`content/text/site/shared.yml`
- 技能配置：`content/text/site/skills.yml`
- 项目文本：`content/text/projects/<id>/`
- 项目图片：`content/media/projects/<id>/`
- 博客文字：`content/text/blog/<date>/`
- 博客封面：`content/media/blog/<date>/`
- 主题颜色：`content/theme/site-theme.json`

## 检查命令

```bash
npm run content:check
npm run content:sync
npm run export
```

完整维护说明见 `content/CONTENT_STRUCTURE.md`。
