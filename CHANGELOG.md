# Changelog

本文件记录 folio-studio 模板的重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [1.2.0] - 2026-07-12

### Added
- **卡片浮动动画开关**：`effects.cards.floatState`，Studio 外观页一键开关，实时预览。
- **阴影风格**：柔和投影 / 硬边色块（新粗野主义）/ 无阴影三档，同时作用于普通卡片与液态玻璃卡片。
- **风格包扩充**：新增「包豪斯」「瑞士国际主义」，「新粗野主义」升级为硬边阴影 + 关浮动；风格包现在携带阴影与浮动设置。
- **自定义方案**：把当前整套外观设置保存为命名方案（存于 `content/theme/custom-packs.json`），一键切回、可删除。
- **单卡片配色**：首页五张卡片（个人资料/问候/时间线/作品/快捷入口）可分别叠加半透明色调，留空跟随主题。

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
