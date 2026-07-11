# Changelog

本文件记录 folio-studio 模板的重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [1.1.0] - 2026-07-12

### Added
- **时间线可视化编辑**：Studio 首页内容 tab 直接编辑成长轨迹——图标选择器（24 个精选 Material Symbols）、时期/标题/关键词/描述文本框、增删与排序。
- **可配置个人 Logo**：首屏 Logo 改为读取 `shared.yml` 的 brandMark，可在 Studio 上传或移除，默认隐藏。
- **个人 AI 功能开关**：`content/config/site.yml` 新增 `features.personalAI`（默认关闭），未配置 Coze 时右下角卡片整体隐藏。

### Changed
- 定制器界面翻新：内嵌 Lucide 风格 SVG 图标替换全部 emoji，保存按钮加载状态，文案与操作逻辑梳理。
- 项目卡顺序与主题色完全数据驱动（meta.yml 的 order 与 themeColor）。

## [1.0.0] - 2026-07-11

### Added
- 首个公开版本：瑞士设计风格个人作品集模板（React 19 + Vite + Tailwind，中英双语、深色模式、内容与代码分离）。
- **Studio 可视化定制器**（`npm run studio`，仅本地开发存在）：点哪改哪、定制进度清单、6 套整站风格包实时预览、基本信息与图片上传（自动压缩）、项目与博客管理、发布页（体检/打包/拖拽部署指引）、撤销与重置。
- **示例人设内容包**：内置虚构人设"林小满"，`npm run content:reset -- --yes` 一键回到干净起点。
- **Claude Code 定制技能**：`.claude/skills/customize-site/`，支持用自然语言让 Claude 修改网站内容。
- **页脚署名开关**：`content/config/site.yml`，默认开启，可在 Studio 发布页关闭。
