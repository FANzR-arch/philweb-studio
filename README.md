# PhilWeb Studio

在线编辑器：<https://fanzr-arch.github.io/philweb-studio/>

> 打开 GitHub Pages 链接即可编辑、保存和导出个人网站。不需要安装 Node，也不需要登录。

PhilWeb Studio 2.0 是一个浏览器优先的开源网站定制器。正式入口就是编辑器本身：左侧改内容，右侧实时预览。所有用户数据只保存在**当前浏览器**，不会写入公共 GitHub 仓库，也不会被其他访问者看到。

## 直接使用（推荐）

1. 打开 [PhilWeb Studio](https://fanzr-arch.github.io/philweb-studio/)。
2. 左侧编辑基本信息、首页、简历、联系方式、技能、外观、项目和博客。
3. 右侧可切换电脑 / 手机预览，以及「正常预览 / 点哪改哪」。
4. 改动会自动保存到当前浏览器；左下角也可以随时手动保存，或按 `Ctrl+S` / `Cmd+S`。
5. 完成后导出：
   - **网站 ZIP**：只包含可部署的静态网站，上传到 Netlify、Cloudflare Pages、Vercel 等即可。
   - **工程备份**：包含完整项目和全部媒体，用来换电脑、换浏览器或清理数据前保存进度。

## 必须知道的数据边界

- 数据只保存在当前浏览器的 IndexedDB 中。
- 不同设备、不同浏览器、无痕窗口都不会自动同步。
- 清理站点数据、卸载浏览器或换电脑前，必须先导出工程备份。
- 网站 ZIP 不能用来继续编辑；要继续改，请导入工程备份。

## 网站 ZIP 和工程备份的区别

| | 网站 ZIP | 工程备份 |
| --- | --- | --- |
| 用途 | 部署给访客看 | 给自己继续编辑 |
| 内容 | `index.html`、静态资源、`project.json`、用到的 `media/` | `manifest.json`、`project.json`、全部媒体 |
| 能否继续在 Studio 里改 | 不能 | 能，导入即可 |
| 是否包含编辑器 | 否 | 否 |

## 如何部署导出的网站

解压网站 ZIP 后，把其中的文件上传到：

- Netlify Drop
- Cloudflare Pages
- Vercel
- 任何支持静态 HTML 的托管服务

相对路径已处理，可以放在域名根目录或子目录。

## 本地开发

GitHub 项目地址：[FANzR-arch/philweb-studio](https://github.com/FANzR-arch/philweb-studio)

```bash
npm install
npm run studio
```

这会打开与线上相同的浏览器编辑器。维护者仍可用 `content/` 作为默认模板和 CLI 数据源。

```bash
npm run content:check
npm run verify
npm run test
npm run build
npm run export
npm run test:e2e
```

`npm run export` 会从当前 `content/` 生成可部署网站 ZIP，供维护者使用；在线编辑器导出不依赖 Node。

## 开源说明

PhilWeb Studio 是开源工具品牌。工具文档、开发配置和许可证只属于源码项目，默认不会进入用户导出的个人网站署名。
