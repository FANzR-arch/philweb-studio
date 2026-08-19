# PhilWeb Studio 工程约定

开源网站定制器 PhilWeb Studio。React 19 + Vite + Tailwind。v2.0 起正式入口是浏览器编辑器，可部署到 GitHub Pages；纯静态产物，无后端。

## 一句话架构

**内容与代码分离，编辑发生在浏览器。** 维护者仍用 `content/` 作为默认模板和 CLI 数据源。构建时把 `content/` 转成浏览器可读取的 starter project。用户在 Studio 里改的数据只存在当前浏览器，导出网站时写入 `project.json` + `media/`。

```
content/            # 维护者内容源（text/ media/ theme/ config/），也是 starter 底稿
content-system/     # 严格解析器 + 校验 + 项目脚手架（纯 Node，零依赖）
generated/starter/  # 构建生成的中性 starter project（勿手改）
lib/studio/         # StudioProject、IndexedDB、媒体、ZIP、校验
apps/
  studio/           # GitHub Pages 主入口：编辑、存储、导出
  preview/          # 右侧 iframe 预览 + 点哪改哪
  site/             # 导出网站使用的纯展示入口
data/               # ContentProvider 与遗留数据辅助
components/         # 展示组件，只从 ContentProvider 读数据
plugins/studio/     # 旧的 dev-only YAML 编辑器，不再作为正式入口
templates/starter-content/  # content:reset 的默认底稿
dist/site-shell/    # 预构建网站外壳，在线导出时打包进去
```

## 铁律

1. **YAML 格式严格**：2 空格缩进、字符串一律双引号。`content-system/core.js` 的解析器不容忍偏差。
2. **生成文件勿手改**：`data/content.generated.ts`、`data/imageManifest.ts`、`generated/starter/`。
3. **中英文成对**：`home/resume/contact` 都有 zh/en，改一份必须同步另一份。
4. **主题全变量化**：视觉改动走项目里的 theme → CSS 变量，不要在组件里写死颜色。
5. **展示组件禁止直接依赖编译期 contentRegistry**：一律 `ContentProvider` / `useSiteContent`。
6. **用户数据不得写入公共仓库**：只用 IndexedDB；导出 ZIP 不得包含 Studio 源码或 IndexedDB。
7. **在线导出不得调用 Node**：使用预构建 site-shell + fflate。
8. **改完必须验证**：`npm run content:check` → `npm run verify` → `npm run test` → `npm run build` → `npm run export`。

## 三个入口

1. **StudioApp**：GitHub Pages 主链接。编辑、项目管理、本地存储、备份和导出。
2. **PreviewApp**：编辑器右侧 iframe。接收当前项目，电脑/手机预览，正常预览 / 点哪改哪；切换模式不刷新 iframe。
3. **SiteApp**：导出网站入口。读取相对路径 `project.json`，不含编辑器。

## 常用命令

```bash
npm run studio            # 与线上相同的浏览器编辑器
npm run dev               # 同上，不自动打开浏览器
npm run verify            # 内容同步+图片清单+内容校验+starter+typecheck+资源预算
npm run test              # Vitest 单元测试
npm run test:e2e          # Playwright 端到端（需先 build）
npm run build             # 构建 GitHub Pages 在线工具（Studio + Preview + site-shell）
npm run export            # 维护者从 content/ 导出网站 ZIP
```

## 关键机制备忘

- 用户项目：IndexedDB；界面偏好和当前项目 ID：localStorage。
- 媒体用稳定 mediaId，渲染时解析为 starter URL、IndexedDB object URL 或导出相对路径。
- 点哪改哪消息：`EDIT_TARGET` / `PROJECT_UPDATE` / `SET_EDIT_MODE` / `PREVIEW_READY`，必须校验 source 和 origin。
- 主题 `typography`、卡片浮动、阴影、色调、液态玻璃开关与 v1.7 相同，改动写入项目 theme。
- 职业人设仍是覆盖式 CLI 工作流；在线编辑器默认加载中性 starter。
- 页脚署名开关在项目 `siteFlags`；工具品牌默认不进入导出网站署名。

## 历史包袱提示

- 仓库文件多为 CRLF 行尾，脚本批量改文件时用 `\r?\n` 容忍正则。
- `imageManifest` 为空对象时 `keyof` 推断为 `never`——`data/useImages.ts` 已用宽松索引规避。
- `data/i18n/zh.ts|en.ts` 是遗留兜底词典，新功能不要往里加内容。
- `plugins/studio/panel.html` 只作为旧实现参考，正式数据操作必须走 StudioProject 和 Storage。
