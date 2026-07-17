# Simon 的个人网站（surong-personal）

个人作品集 / 博客站点，**vCard 风格暗色主题**。Next.js 16 单体应用（自带 `app/api/*` 读 `data/*.json`），支持从 Obsidian 仓库同步内容与附件。

> 深入架构 / 数据流 / 设计系统见 [`docs/FRONTEND_GUIDE.md`](docs/FRONTEND_GUIDE.md)。

## 功能

- **vCard 暗色主题**：左侧 vCard 侧边栏（头像 / 姓名 / 联系方式 / 社交），右侧按导航切换 About / Resume / Portfolio / Blog / Contact
- **三种字体**（poppins / inter / space-grotesk，存 localStorage）
- **作品集 & 博客**：列表 + 详情弹层（framer-motion）；博客/作品也支持独立详情页 `/blog/[id]`、`/works/[id]`（RSC 直读 JSON）
- **Markdown 渲染**：react-markdown + remark-gfm + rehype-sanitize，支持 mermaid 流程图、代码高亮
- **Obsidian 内部链接**：正文里的 `[[笔记]]` / `![[图片]]` 自动解析（`lib/remark-obsidian.ts`）
- **GitHub 同步**：从内容仓库拉取博客 / 作品 / 附件（见下文「内容工作流」）
- **管理后台**：内容 / 简历 / 作品 / 博客 / 联系方式编辑、图片上传、GitHub 同步配置

## 技术栈

Next.js 16.2.9（App Router）· React 19 · TypeScript（strict）· Tailwind CSS v4 · framer-motion · react-markdown + remark-gfm + rehype-sanitize + 自研 remark-obsidian · mermaid · react-syntax-highlighter · lucide-react · sharp

> ⚠️ Next.js 16 有破坏性变更，写代码前读 `node_modules/next/dist/docs/`，留意 deprecation。

## 快速开始

```bash
npm install
npm run dev          # http://localhost:3000
# 后台：访问 /admin/login，密码 = ADMIN_PASSWORD（默认 admin123，生产必改）
```

其它脚本：`npm run dev:3001` / `npm run dev:8080`（换端口）、`npm run build` + `npm run start`（生产）、`npm run lint`。

## 内容工作流（Obsidian → 站点）

内容源在**另一个仓库** `SimonSU5/personal-site-content`（Obsidian 仓库）：

```
personal-site-content/
├── blogs/*.md     # 博客（frontmatter: title/excerpt/category/cover/date）
├── works/*.md     # 作品（frontmatter: title/description/category/cover/tech/demo/repo/featured）
└── assets/        # 附件（图片：covers/、images/ …）
```

**同步**（后台「GitHub 同步」点「立即同步」，或 `POST /api/github/sync`，或配置 webhook 自动触发）会：

1. 用 **Git Trees API（recursive）+ Blobs API** 拉 `blogs/`、`works/`、`assets/`（绕开 Contents API 单文件 1MB 限制，大封面图也能拉）；
2. **图片压缩**：`assets/` 落盘前经 sharp 压缩为 **WebP，单图 ≤300KB**（gif/svg 跳过）→ 写项目根 `assets/**/*.webp`；
3. 解析 frontmatter → 写 `data/posts.json` / `data/works.json`；`cover` 与正文图片改写为本地 `/assets/**.webp`；
4. 渲染时 `[[笔记]]` → `/blog/{id}` 或 `/works/{id}`（未匹配则灰色文本）。

`assets/` 不在 `public/` 下，由 [`app/assets/[...path]/route.ts`](app/assets/[...path]/route.ts) 提供静态服务（带目录穿越防护）。

## 项目结构

```
surong-personal/
├── app/
│   ├── page.tsx              # 首页（客户端，fetch content+works+posts）
│   ├── about/ contact/ blog/ # 公开页
│   ├── blog/[id]/ works/[id] # 详情页（RSC，直读 data/*.json）
│   ├── assets/[...path]/     # 静态资源路由（服务根 assets/）
│   ├── admin/                # 后台（login/dashboard/works/upload/upload-post/blog/content/resume/contact/github-settings）
│   ├── api/                  # content/posts/works/upload/auth/github
│   └── globals.css           # 全局样式（vCard 暗色主题 + markdown 样式）
├── components/               # ui/（vCard 组件、DetailView、MarkdownContent）admin/ public/
├── lib/                      # auth/csrf/contexts/remark-obsidian
├── types/                    # 类型定义（以 types/index.ts 为准）
├── data/                     # content/posts/works.json（内容数据）+ github-settings.json（gitignore）
├── assets/                   # 同步下来、已压缩为 WebP 的附件（≤300KB/张）
├── docs/                     # FRONTEND_GUIDE.md
└── public/                   # 上传图片等
```

## 数据与资源

- `data/{content,posts,works}.json`、根 `assets/`（同步压缩后的 WebP）**已纳入版本管理**（随仓库走）。后台编辑 / 重新同步会覆盖本地内容。
- `data/github-settings.json` 存 GitHub 仓库与 PAT，**已 gitignore**，不会进仓库。

## 环境变量（`.env.local`，已 gitignore）

`ADMIN_PASSWORD`、`SESSION_SECRET`、`CSRF_SECRET`、`GITHUB_TOKEN`、`GITHUB_REPO`、（可选）`GITHUB_WEBHOOK_SECRET`、`GITHUB_ENCRYPTION_KEY`、`NEXT_PUBLIC_BASE_URL`。

后台也可在 `/admin/github-settings` 临时填写仓库 + PAT（存 `data/github-settings.json`，仅本机）。

## 安全须知

- 🔴 生产**务必修改 `ADMIN_PASSWORD`**（默认 `admin123`）。

## 部署

支持任何能跑 Next.js 的长驻 node 环境（`npm run build` + `npm run start`）。

> 说明：`assets/`（WebP）与 `data/` 已随仓库提交，新环境开箱即可展示；如需最新内容，**跑一次 GitHub 同步**覆盖本地。

## 与 PerLog 后端的关系

本仓库是**前端**（自洽单体，自带 API 读 `data/*.json`）。后端在隔壁 `../Perlog`（NestJS + MongoDB + JWT），目前**未接入**，计划在阶段 2d 用它替换自带的 `app/api/*`。

## 许可

MIT
