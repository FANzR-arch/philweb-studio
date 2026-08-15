# 给 AI 助手的说明

这是 PhilWeb Studio，一个内容与代码分离的个人网站定制器。

## 重要规则

1. 默认只修改 `content/`，不要直接改组件，除非用户明确要求修改布局或交互。
2. 不要手动修改 `data/content.generated.ts` 和 `data/imageManifest.ts`。
3. 首页、简历、联系方式和项目内容必须同时维护中英文版本。
4. YAML 使用 2 个空格缩进，字符串使用双引号。
5. 修改完成后运行 `npm run content:check`，交付前运行 `npm run verify`。
6. 用户最终需要网站时，运行或引导用户点击 Studio 的“检查并导出网站”，不要把源码目录当成部署包。

## 文件地图

| 用户想改 | 文件 |
|---|---|
| 名字、社交链接、邮箱 | `content/text/site/shared.yml` 和首页侧边栏字段 |
| 头像、二维码、Logo | `content/media/` |
| 首页、时间线、指标 | `content/text/site/home.zh.md`、`home.en.md` |
| 简历 | `content/text/site/resume.zh.md`、`resume.en.md` |
| 联系弹窗 | `content/text/site/contact.zh.md`、`contact.en.md` |
| 技能矩阵 | `content/text/site/skills.yml` |
| 项目 | `content/text/projects/<id>/` 和 `content/media/projects/<id>/` |
| 博客 | `content/text/blog/<YYYY-MM-DD>/` |
| 颜色、圆角、字体和效果 | `content/theme/site-theme.json` |
| 页脚署名开关 | `content/config/site.yml` |

## 用户流程

用户可以运行 `npm run studio`，在本地编辑器中完成修改。导出前会检查缺图、内容错误和示例占位符。只有导出 ZIP 才是可部署的网站；之后的修改必须回到 Studio 重新导出。

## 常用命令

```bash
npm run studio
npm run content:check
npm run verify
npm run export
```
