# GitHub Pages 部署

项目包含网页源代码、全部运行所需 GLB 模型与 WebP 贴图。部署不依赖本机 Blender 或原始设计稿。

1. 在 GitHub 建立 `qiniandian-web` 仓库，将当前项目推送到 `main`。
2. 仓库 Settings → Pages → Source 选择 GitHub Actions。
3. `.github/workflows/pages.yml` 自动安装依赖、构建并发布。

工作流自动读取 Pages 的路径，模型、背景和地面纹理均适配仓库子目录。支持以后推送 main 自动更新。

本机生产检查：`npm run build -- --base=/qiniandian-web/`，再运行 `npx vite preview --port 4174 --base=/qiniandian-web/`。访问 `http://localhost:4174/qiniandian-web/`。

压缩包中的 `dist/` 为预先构建的 `/qiniandian-web/` 版本；源代码可通过 `npm ci`、`npm run dev` 启动。未包含 node_modules、临时烘焙文件和登录凭据。Blender 源文件保留于原工作目录，不影响网页独立运行。

部署方式参考：https://vite.dev/guide/static-deploy#github-pages
