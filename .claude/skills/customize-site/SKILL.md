---
name: customize-site
description: 把这个个人网站模板定制成用户自己的网站。当用户想修改网站上的名字、头像、二维码、文案、配色、圆角、项目作品、博客文章、简历、联系方式，或说"把网站换成我的信息"时使用。用户只需要口头描述或发图片，由 Claude 完成文件修改。
---

# 网站定制技能

这个项目是一个内容与代码分离的个人作品集网站模板。**定制网站 = 修改 `content/` 目录下的文件，不需要改任何组件代码。** 你的任务是把用户口头描述的需求（文字、图片、颜色）翻译成对 `content/` 文件的修改。

## 核心原则

1. **只改 `content/`，不改组件**。除非用户明确要求改布局/交互，否则不要碰 `components/`、`App.tsx`。
2. **绝不手动编辑生成文件**：`data/content.generated.ts` 和 `data/imageManifest.ts` 是自动生成的。
3. **中英文成对维护**：站点是双语的。改中文文案时，同步更新对应英文文件（用户没给英文就帮忙翻译）。
4. **改完必须验证**：运行 `npm run content:check`。它会用严格解析器校验所有内容文件，失败信息会精确指出哪一行有问题。
5. **YAML 格式要求严格**：内容系统用的是自研解析器，只支持 2 空格缩进、双引号字符串。字符串值一律用双引号包裹。

## 用户不想动手？推荐可视化定制器

如果用户更想自己点点改改，告诉他们运行 `npm run studio`（会自动打开 http://localhost:3000/studio ）。那里支持：**点哪改哪**（在预览里点击文字/图片直接跳到编辑框）、定制进度清单、整套风格包（配色+字体+圆角，实时预览）、基本信息与图片上传、项目与博客管理、发布页（体检/打包/拖拽部署指引）、撤销本次修改与重置为示例内容。更复杂的修改再回来找你。

相关命令：`npm run content:reset -- --yes` 把 content/ 整体重置为示例人设（重置前自动备份到 `.studio-snapshots/`）。

## 文件地图（需求 → 文件）

| 用户想改 | 文件 |
|---|---|
| 名字、微信号、社交链接、邮箱 | `content/text/site/shared.yml` |
| 头像 | `content/media/profile/avatar.png`、`avatar-dark.png`（覆盖同名文件） |
| 微信二维码 | `content/media/qrcodes/wx.jpg` |
| 首屏标题、侧边栏、技能标签、时间线、页脚 | `content/text/site/home.zh.md` + `home.en.md`（frontmatter） |
| 简历内容 | `content/text/site/resume.zh.md` + `resume.en.md` |
| 联系弹窗文案 | `content/text/site/contact.zh.md` + `contact.en.md` |
| 技能矩阵（工具、Logo） | `content/text/site/skills.yml`，Logo 在 `content/media/logos/` |
| 全站配色、圆角、阴影、背景效果、字体与疏密 | `content/theme/site-theme.json`（字体/根字号在 `typography` 段） |
| 页脚署名开关与链接 | `content/config/site.yml` |
| 项目卡片信息（年份、角色、主色、链接、上/下架） | `content/text/projects/<id>/meta.yml` |
| 项目标题、副标题、简介、案例长文 | `content/text/projects/<id>/overview.zh.md` + `overview.en.md` |
| 项目 PRD / 使用指南 / 技术说明 | `content/text/projects/<id>/prd.md`、`user-guide.md`、`tech-spec.md` |
| 项目封面 / 详情截图 | `content/media/projects/<id>/`（`cover-light.jpg`、`cover-dark.jpg`、`01.jpg`…） |
| 博客文章 | `content/text/blog/<YYYY-MM-DD>/`（`标题.txt`、`摘要.txt`、`链接.txt`、`分类.txt`） |
| 博客封面 | `content/media/blog/<YYYY-MM-DD>/`（文件夹里的第一张图即封面） |
| 博客分类 | `content/text/blog/categories.yml` |

完整规范见 `content/CONTENT_STRUCTURE.md`。

## 常见任务操作要点

### 换名字 / 联系方式
改 `shared.yml` 的 `person.*` 和 `links.*`。注意 `email` 值需要 `mailto:` 前缀。同时检查 `home.zh.md` / `home.en.md` 里的 `sidebar.name`、`sidebar.targetRoleValue`、`footer.copyright`——这三处通常也是名字。

### 换头像 / 二维码
用户发来的图片保存后覆盖 `content/media/profile/avatar.png` 等文件。如果扩展名不同（如 .jpg），需同步更新 `shared.yml` 里 `assets.*` 的路径，并删除旧文件。大图先用 `sharp` 或脚本压缩（头像 ≤640px 宽）。

### 改配色 / 圆角
`content/theme/site-theme.json`：
- 全站强调色：`accent.light`、`accent.dark`（深色模式的要更亮），同步改 `modes.light.text.accent`、`modes.dark.text.accent`，`accent.glow` 用主色的 rgba(…, 0.35)。
- 卡片圆角：`effects.cards.radius`（主卡片）和 `radiusSmall`（约为主值的 75%）。
- 页面底色：`modes.light.surface.page`、`modes.dark.surface.page`。
- 背景光晕强弱：`effects.aurora.light.opacity`（基准 0.19）、`effects.aurora.dark.opacity`（基准 0.22）。
- 字体与疏密：`typography` 段（`fontSans` 字体栈、`webfonts` 需要动态加载的字体 CSS 链接、`rootFontSize` 根字号 15/16/17px 控制整体疏密）。中文字体务必用开源字体（Noto 系列、霞鹜文楷等）。
- 单个项目的主色：改该项目 `meta.yml` 的 `themeColor`。

### 新增项目
运行 `npm run content:new -- --id <项目id>`（id 用小写字母/数字/连字符）。然后按用户描述填 `meta.yml` 和两份 overview，把图片放进 `content/media/projects/<id>/`，最后把 `meta.yml` 的 `published` 改为 `true` 上架。

### 替换示例项目为用户自己的项目
优先"改造"现有项目目录（保留结构），把文本和图片全部换掉。如果数量对不上，多余的项目把 `published: false` 下架即可，不要直接删目录（避免残留引用）。

### 新增博客
新建 `content/text/blog/<YYYY-MM-DD>/`，写入 `标题.txt`、`摘要.txt`、`链接.txt`（第一行微信链接，第二行 X 链接，都可省略）、`分类.txt`（写 categories.yml 里的分类 id）。封面放 `content/media/blog/<同日期>/`。一个日期一篇。

### 不想要某个板块
- 博客：删掉（或清空）`content/text/blog/` 下的日期目录即可，前端自动隐藏空板块。
- Personal AI（Coze 对话）：需要用户自己的 Coze 配置才能用（见 README"Coze Personal AI Setup"）；未配置时线上会自动不可用。用户想彻底移除卡片属于代码改动，改 `components/` 前先跟用户确认。

## 验证流程

1. `npm run content:check` —— 内容文件校验，必须通过。
2. 如果 dev 服务器（`npm run dev`，端口 3000）在跑，内容改动会自动热更新，可直接在浏览器确认效果。
3. 交付前跑 `npm run verify`（含内容同步、图片清单、类型检查、资源预算）。
4. 图片较大时运行 `npm run assets:optimize` 压缩。

## 发布

`npm run build` 产出 `dist/`，可部署到 Cloudflare Pages / Vercel / Netlify。Personal AI 相关环境变量仅在用户需要 Coze 机器人时配置。
