# 公众号文章内容

博客内容现在分成文字和图片两个目录：

```text
content/text/blog/<date>/
content/media/blog/<date>/
```

`<date>` 使用日期命名，例如 `2026-07-01`。两边目录名保持一致，系统会自动配对。

## 文字目录

每篇文章的文字文件放在：

```text
content/text/blog/2026-07-01/
  标题.txt
  摘要.txt
  链接.txt
  分类.txt
```

- `标题.txt`：文章标题，可选；没有时使用日期。
- `摘要.txt`：文章摘要或正文摘要。
- `链接.txt`：一行一个链接。第一行是公众号链接，第二行可放 X/Twitter 链接。
- `分类.txt`：文章所属分类，填写 `content/text/blog/categories.yml` 里的分类 `id`。

## 分类配置

文章分类统一维护在：

```text
content/text/blog/categories.yml
```

如果要新增分类，先在 `categories.yml` 添加 `id`、中英文标题和说明，再把对应文章文件夹里的 `分类.txt` 改成这个 `id`。

## 图片目录

封面图放在：

```text
content/media/blog/2026-07-01/
  cover.jpeg
```

图片文件名不限，支持 `jpg`、`jpeg`、`png`、`webp`、`gif`。系统会自动取该目录里的第一张图片作为封面。

## 更新命令

```bash
npm run content:sync
npm run content:check
```

博客按日期倒序展示，最新日期在前。
