# 网站内容维护说明

这套内容结构的目标是：代码只负责页面和交互，内容、图片、颜色都集中放在 `content/`。别人复刻网站时，可以优先替换这个目录里的文件。

## 总体结构

```text
content/
  text/      # 文案、项目说明、博客文字
  media/     # 图片、Logo、二维码、项目图、博客封面
  theme/     # 颜色、明暗模式、阴影、项目色等视觉 token
  config/    # 预留的站点级配置目录
```

## 文本文案

首页、简历、联系方式和技能配置都在：

```text
content/text/site/
```

常改文件：

- `home.zh.md`：中文首页文案
- `home.en.md`：英文首页文案
- `resume.zh.md`：中文简历内容
- `resume.en.md`：英文简历内容
- `contact.zh.md`：中文联系方式弹窗
- `contact.en.md`：英文联系方式弹窗
- `shared.yml`：姓名、微信号、社媒链接、头像和二维码引用
- `skills.yml`：技能分组和工具 Logo 引用

项目文案在：

```text
content/text/projects/<project-id>/
```

每个项目通常包含：

- `meta.yml`：项目年份、角色、项目色、封面图路径、链接等
- `overview.zh.md`：中文项目详情
- `overview.en.md`：英文项目详情
- `prd.md`：产品说明
- `user-guide.md`：使用说明
- `tech-spec.md`：技术说明

## 图片素材

公共图片在：

```text
content/media/profile/
content/media/qrcodes/
content/media/logos/
```

项目图片在：

```text
content/media/projects/<project-id>/
```

建议命名：

```text
cover-light.jpg
cover-dark.jpg
01.jpg
02.jpg
03.jpg
```

项目文本引用图片时，路径从 `content/text/projects/<project-id>/` 出发。例如：

```yaml
coverLight: "../../../media/projects/flowcard/cover-light.jpg"
coverDark: "../../../media/projects/flowcard/cover-dark.jpg"
```

```yaml
detailImages:
  - "../../../media/projects/flowcard/01.png"
  - "../../../media/projects/flowcard/02.jpg"
```

博客文字和封面分开：

```text
content/text/blog/2026-07-01/
  标题.txt
  摘要.txt
  链接.txt

content/media/blog/2026-07-01/
  cover.jpeg
```

系统会自动使用博客媒体目录里的第一张图片作为封面。

## 颜色和主题

网站主题集中在：

```text
content/theme/site-theme.json
```

常改位置：

- `modes.light.text`：浅色模式文字颜色
- `modes.light.surface`：浅色模式背景和卡片颜色
- `modes.dark.text`：暗色模式文字颜色
- `modes.dark.surface`：暗色模式背景和卡片颜色
- `accent`：全站强调色
- `projects`：项目专属色
- `effects`：默认/图片/视频背景、网格或点阵细节、卡片阴影、液态玻璃等视觉效果

项目卡片和详情页优先使用 `content/text/projects/<id>/meta.yml` 里的 `themeColor`。如果要改某个项目的主色，改这里最直接：

```yaml
themeColor: "#38BDF8"
```

## 新增项目

运行：

```bash
npm run content:new -- --id my-project
```

脚本会生成：

```text
content/text/projects/my-project/
content/media/projects/my-project/
```

然后按顺序处理：

1. 修改 `content/text/projects/my-project/meta.yml`
2. 填写 `overview.zh.md`
3. 填写 `overview.en.md`
4. 把图片放进 `content/media/projects/my-project/`
5. 按需要补充 `prd.md`、`user-guide.md`、`tech-spec.md`
6. 运行 `npm run content:check`

## 修改后如何生效

```bash
npm run content:sync
npm run build
npm run export
```

`content:sync` 会把 `content/` 里的内容生成到 `data/content.generated.ts`。这个生成文件不要手动改。

## 复刻建议

最稳的复刻顺序：

1. 替换 `content/media/profile/` 里的头像
2. 替换 `content/media/qrcodes/` 里的二维码
3. 修改 `content/text/site/shared.yml`
4. 修改 `content/text/site/home.*.md`
5. 按项目替换 `content/text/projects/<id>/` 和 `content/media/projects/<id>/`
6. 调整 `content/theme/site-theme.json`
7. 运行 `npm run export`，得到独立部署 ZIP

不要把所有图片平铺到一个文件夹。按 `site / projects / blog` 分组，后续替换和排错会更稳定。
