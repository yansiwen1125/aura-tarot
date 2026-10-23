# 上传 GitHub

上传本文件夹 Aura-GitHub 的内容作为仓库根目录。不要上传原开发目录，也不要将密钥或用户历史复制进来。

## 推荐：Git 命令行

在 GitHub 创建一个空仓库，例如 aura-tarot。然后在本文件夹运行：

```sh
git init
git add .
git status --short
git commit -m "Initial Aura portfolio project"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aura-tarot.git
git push -u origin main
```

将 YOUR_USERNAME 和仓库名替换为自己的值。本次整理尚未创建远端、初始化 Git、提交或推送。

本交付保留完整高清牌面，总量较大，推荐使用 Git 或 GitHub Desktop。上传前可运行 npm run check 和 npm test。完整资源已检查单文件尺寸，结果见 DELIVERY.md。

## GitHub Desktop

将本文件夹创建为本地仓库后发布到 GitHub。确认仓库根目录直接包含 README.md、package.json、index.html 等文件。不要再额外嵌套一层项目文件夹。

## 忽略内容

.gitignore 已排除 .env、预算状态、node_modules、日志、测试生成报告、macOS 元数据和本地编辑器配置。`.env.example` 保留且密钥为空，新使用者自行复制填写。

如果生成测试截图，可在需要展示时精选到新的 docs/screenshots/ 并主动提交；不要把整个调试目录加入仓库。

## 作品访问

GitHub 仓库展示源代码、文档及资源。应用含 Node 后端，GitHub Pages 无法直接运行真实 AI 功能。当前代码限定本机访问，公网运行需要后续独立部署方案。
