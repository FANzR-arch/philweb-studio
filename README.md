# PhilWeb Studio

> 一个本地开源的网站定制器：修改内容，检查质量，导出可直接部署的网站 ZIP。

PhilWeb Studio 是一个 React 19 + Vite + Tailwind 的静态网站工具。它把编辑器和网站运行时放在同一个开源项目中，但导出时只交付最终静态文件，不会把 Studio、模板源码或 Node 配置带给最终用户。

## 下载与一键启动

GitHub 项目地址：[FANzR-arch/philweb-studio](https://github.com/FANzR-arch/philweb-studio)

也可以直接下载源码 ZIP：[下载 main 分支 ZIP](https://github.com/FANzR-arch/philweb-studio/archive/refs/heads/main.zip)

Windows 用户解压后，双击项目根目录里的 `启动 PhilWeb Studio.cmd`。脚本会检查 Node.js，首次启动自动执行 `npm install`，然后运行 Studio 并打开浏览器。

首次使用需要：

- 安装 [Node.js LTS](https://nodejs.org/)
- 保持网络连接，以便首次安装项目依赖
- 不要移动或删除项目根目录里的 `package.json`

如果已经安装过依赖，之后再次双击即可启动。

## 三分钟开始（手动方式）

```bash
npm install
npm run studio
```

打开 `http://localhost:3000/studio` 后：

- 在左侧修改个人信息、首页、外观、项目和博客。
- 在右侧预览实际网站；需要操作弹窗、按钮和链接时切换到“正常预览”，需要定位编辑字段时切回“点哪改哪”。
- 修改完成后点击“检查并导出网站”。
- 浏览器会下载一个独立 ZIP，解压后即可上传到 Netlify、Cloudflare Pages、Vercel 等静态托管平台。

以后需要修改时，回到 PhilWeb Studio 修改并重新导出，不要直接编辑已经导出的 ZIP。

## 导出内容

导出 ZIP 只包含网站部署所需的 HTML、CSS、JavaScript、图片、字体、favicon、manifest、robots 和 sitemap 文件。

导出包不包含：

- `content/`
- `templates/`
- `plugins/`
- `components/`
- `scripts/`
- `node_modules/`
- `.git/`
- `package.json`、Vite 配置和 Studio API

也可以在终端导出：

```bash
npm run export
```

命令行导出的 ZIP 会放到被 Git 忽略的 `exports/` 文件夹中。

## 内容位置

```text
content/
  text/site/       # 首页、简历、联系方式和技能
  text/projects/  # 项目内容
  text/blog/      # 博客内容
  media/          # 头像、二维码、项目图和博客封面
  theme/          # 颜色、字体、圆角和效果
  config/         # 站点级配置
```

内容与代码分离。通常只需要在 Studio 中修改，不需要碰 React 组件。

## 校验命令

```bash
npm run content:check
npm run verify
npm run build
npm run export
```

导出会拦截未处理的示例姓名、假邮箱、社交账号占位符、缺图和内容校验错误。空的可选社交链接、博客和简历字段不会阻止导出。

## 开源说明

PhilWeb Studio 本身是开源工具。工具文档、开发配置和许可证只属于源码项目，不会进入用户下载的网站成品。
