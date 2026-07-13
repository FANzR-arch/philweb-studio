# folio-studio 工程约定

自带可视化定制器（Studio）的个人网站模板。React 19 + Vite + Tailwind，纯静态产物，无后端。

## 一句话架构

**内容与代码完全分离**：所有文字/图片/配色在 `content/`，由 `content-system/core.js`（自研严格 YAML 解析器）在 dev/build 时生成 `data/content.generated.ts` 供组件消费。定制网站 = 改 `content/` 文件，绝大多数需求不碰组件。

```
content/            # 唯一内容源（text/ media/ theme/ config/）
content-system/     # 严格解析器 + 校验 + 项目脚手架（纯 Node，零依赖）
data/               # 数据层（content.generated.ts 与 imageManifest.ts 为自动生成，勿手改）
components/         # ui/ dashboard/ modals/
plugins/
  contentRegistry.ts  # 监听 content/ → 重新生成 registry（热更新链路的核心）
  imageScanner.ts     # 扫描 public/images → imageManifest
  studio/             # 可视化定制器（dev-only，apply:'serve'，不进构建产物）
    index.ts            # 中间件 + API（/studio/api/*）
    panel.html          # 编辑器界面（内嵌 Lucide 风格 SVG 图标，禁用 emoji）
    contentStore.ts     # YAML 行级定点读写（与 core.js 的引号/缩进约定互逆）
    edit-overlay.js     # 注入预览页的"点哪改哪"覆盖层
templates/starter-content/  # 示例人设"林小满"（设计师），content:reset 的默认底稿
templates/personas/<id>/    # 职业起始人设覆盖包（developer/product-manager…），只存差异文本 + persona.json
```

## 铁律

1. **YAML 格式严格**：2 空格缩进、字符串一律双引号。`content-system/core.js` 的解析器不容忍偏差。
2. **生成文件勿手改**：`data/content.generated.ts`、`data/imageManifest.ts`。
3. **中英文成对**：`home/resume/contact/overview` 都有 `.zh` `.en` 两份，改一份必须同步另一份。
4. **主题全变量化**：视觉改动优先走 `content/theme/site-theme.json` → CSS 变量（`data/theme.ts` 扁平化为 `--theme-*`，`index.css` 消费），不要在组件里写死颜色。
5. **Studio 是 dev-only**：`plugins/studio` 任何代码都不允许进入构建产物；新增站点能力时同步考虑 Studio 表单 + `edit-overlay` 的 `data-edit` 标记。
6. **改完必须验证**：`npm run content:check`（内容）→ `npm run verify`（全量）→ 交付前 `npm run build`。

## 常用命令

```bash
npm run studio            # 定制器（http://localhost:3000/studio）
npm run dev               # 纯 dev server
npm run verify            # 内容同步+图片清单+内容校验+typecheck+资源预算
npm run build             # verify + vite build → dist/
npm run content:reset -- --yes   # 整站重置为示例人设（先备份到 .studio-snapshots/）
npm run content:reset -- --list                        # 列出可选职业起始人设
npm run content:reset -- --template developer --yes    # 重置为某职业人设（底稿+覆盖）
npm run content:new -- --id x    # 脚手架新项目
```

## 关键机制备忘

- dev 模式下改 `content/` 任何文件会自动重新生成 registry 并热更新，Studio 依赖这条链路。
- Studio 启动时快照 `content/` 到 `.studio-snapshots/last-session`（"撤销本次修改"的还原点）。
- 主题 `typography` 段控制字体（`--theme-font-sans`）与疏密（`rootFontSize` → 根字号）；`effects.cards.floatState` 控制浮动动画；`effects.cards.shadowStyle`（soft/hard/none）由 Studio 写入具体阴影值；`effects.cardTints` 是五张首页卡的色调（rgba），透明度由 `effects.cardTintOpacity` 控制（Studio「色调浓度」滑块，默认 0.4）。液态玻璃卡片的色调靠 `index.css` 里 `.liquid-card` 背景把 `--card-tint` 叠在 `--liquid-surface` 之上实现（曾因 `!important` 覆盖而失效）。卡片内部小块（指标块/图标底/作品行）的圆角复用 `--card-radius-sm`，跟随卡片圆角。液态玻璃总开关走 `effects.cards.glassState`（on/off）→ CSS 变量 `--theme-effects-cards-glass-state`；`App.tsx`（真站点）与 `plugins/studio/edit-overlay.js`（预览）据此在根元素切 `no-glass` 类，`index.css` 的 `:root.no-glass .liquid-card` 把液态卡回落成实心卡。风格包各自携带 `glass` 字段（硬朗风格默认关）。
- 自定义风格方案存 `content/theme/custom-packs.json`；内置风格包（16 套）在 `plugins/studio/panel.html` 的 `STYLE_PACKS` 数组，新增只加一条即可，渲染是通用的。
- 职业人设是"覆盖式"：`reset` 先铺 `starter-content` 底稿，再把 `templates/personas/<id>/` 逐文件叠上去（跳过 `persona.json`）。人设只需存差异化文本、复用底稿的媒体资源；主题走风格包（职责分离，人设不带整份 site-theme.json）。
- 项目卡顺序由 `meta.yml` 的 `order` 决定，主题色由 `themeColor` 内联注入（无硬编码）。
- 页脚署名开关在 `content/config/site.yml`。
- 用户级定制指引见 `.claude/skills/customize-site/SKILL.md` 与 `docs/CUSTOMIZE.md`；功能变更需同步更新 `CHANGELOG.md`。

## 历史包袱提示

- 仓库文件多为 CRLF 行尾，脚本批量改文件时用 `\r?\n` 容忍正则。
- `imageManifest` 为空对象时 `keyof` 推断为 `never`——`data/useImages.ts` 已用宽松索引规避，不要改回。
- `data/i18n/zh.ts|en.ts` 是遗留兜底词典（registry 缺字段时才用），新功能不要往里加内容。
