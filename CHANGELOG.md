# Changelog

本文件记录 folio-studio 模板的重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [1.0.0] - 2026-07-11

### Added
- 首个公开版本：瑞士设计风格个人作品集模板（React 19 + Vite + Tailwind，中英双语、深色模式、内容与代码分离）。
- **Studio 可视化定制器**（`npm run studio`，仅本地开发存在）：点哪改哪、定制进度清单、6 套整站风格包实时预览、基本信息与图片上传（自动压缩）、项目与博客管理、发布页（体检/打包/拖拽部署指引）、撤销与重置。
- **示例人设内容包**：内置虚构人设"林小满"，`npm run content:reset -- --yes` 一键回到干净起点。
- **Claude Code 定制技能**：`.claude/skills/customize-site/`，支持用自然语言让 Claude 修改网站内容。
- **页脚署名开关**：`content/config/site.yml`，默认开启，可在 Studio 发布页关闭。
