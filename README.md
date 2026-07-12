# folio-studio

> 自带可视化定制器的个人网站模板 —— 不写代码，把它变成你自己的站。

一个瑞士设计风格的个人作品集模板（React 19 + Vite + Tailwind），内置 **Studio 可视化定制器**：改文字、传图片、换配色圆角字体，全程点点改改，右侧实时预览，最后跟着引导拖拽上线。

## ✨ 三分钟上手

```bash
npm install
npm run studio
```

浏览器会自动打开定制器（http://localhost:3000/studio ）：

- **点哪改哪** — 在右侧预览里点击任何文字或图片，左边自动跳到对应编辑框
- **定制进度条** — 换头像 → 改名字 → 写介绍 → 挑风格 → 放项目 → 发布，一步步打勾
- **整套风格包** — 6 套配色×字体×圆角组合，点一下实时预览，喜欢再应用
- **🚀 发布页** — 一键体检、一键打包，跟着图文把 dist 文件夹拖进 Netlify / Cloudflare 就上线
- **改坏了能撤销** — 每次打开自动备份，一键回滚；也可以整站重置回示例内容

小白完整教程见 **[docs/CUSTOMIZE.md](docs/CUSTOMIZE.md)**。

## 🤖 配合 Claude Code 更强

用 [Claude Code](https://claude.com/claude-code) 打开本文件夹，用大白话说需求：

> "把时间线换成我的经历：2021 年毕业……"
> "这是我的简历，帮我填进关于我"
> "整站换成蓝色系，圆角小一点"

内置技能 `.claude/skills/customize-site/` 让 Claude 准确知道每样内容在哪个文件、怎么改、改完怎么校验。

## 📦 特性一览

| 能力 | 说明 |
|---|---|
| 内容与代码完全分离 | 所有文字/图片/配色都在 `content/`，代码不用碰 |
| 中英双语 | 全站 i18n，语言一键切换 |
| 深色模式 | 跟随系统 + 手动切换，全部主题变量化 |
| 项目展示 | 卡片列表 + 详情弹窗（多图轮播、PRD/指南/技术文档 Tab） |
| 博客卡片 | 按日期归档，链接到微信公众号 / X 原文 |
| 严格内容校验 | `npm run content:check` 在构建前抓出缺图、格式错误 |

## 🗂 内容都在哪

```text
content/
  text/site/     # 首页、简历、联系方式文案（中英文）
  text/projects/ # 每个项目一个文件夹
  text/blog/     # 每篇文章一个日期文件夹
  media/         # 头像、二维码、封面、截图
  theme/         # 配色、圆角、字体、效果
  config/        # 页脚署名等站点配置
```

完整规范见 [content/CONTENT_STRUCTURE.md](content/CONTENT_STRUCTURE.md)。

## 🚀 部署

`npm run build` 生成 `dist/`，拖进 [Netlify Drop](https://app.netlify.com/drop) 或 Cloudflare Pages 直传即可；也可以关联 Git 仓库自动部署（构建命令 `npm run build`，输出目录 `dist`）。Studio 定制器只在本地开发时存在，不会进入线上产物。

## 🙏 署名

页脚默认有一行"基于 folio-studio 开源模板搭建"的小字。它可以在 Studio 发布页一键关闭——但如果这个模板帮到了你，留着它就是对项目最好的支持。

## License

[MIT](LICENSE) © RZC
