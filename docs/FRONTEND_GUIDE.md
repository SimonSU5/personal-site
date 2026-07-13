# surong-personal 前端开发指南

> 写给前端功能优化 / bug 修复会话。本文档固化了站点的功能、路由、组件、数据流、设计系统。
> 最后更新：2026-07-13

---

## 1. 这是什么项目

个人作品集/博客站点，**vCard 风格暗色主题**。单页 + 分页切换（不是传统多页跳转），左侧 vCard 侧边栏（头像/姓名/联系方式/社交），右侧主内容区按导航切换 About / Resume / Portfolio / Blog / Contact。

**两套主题风格**（`StyleContext`，存 localStorage）：`tech`（科技暗色）/ `warm`（暖色）。**三种字体**（`ThemeContext`）：poppins / inter / space-grotesk。

## 2. 技术栈

- **Next.js 16.2.9**（App Router）+ React 19 + TypeScript（strict）
- Tailwind CSS v4（`@import "tailwindcss"` + `@theme inline`，CSS 变量驱动配色）
- framer-motion（详情视图动画）、react-markdown + remark-gfm + rehype-sanitize + **自研 remark-obsidian**（渲染博客/作品正文 + Obsidian 内链）、mermaid（markdown 里的流程图）、react-syntax-highlighter、lucide-react（图标）、sharp（图片处理：上传预处理 + GitHub 同步时压缩为 WebP，见 §11）
- **⚠️ 注意**：Next.js 16 有破坏性变更，和训练数据可能不同——写代码前读 `node_modules/next/dist/docs/`，留意 deprecation（见 `AGENTS.md`）。

## 3. 路由地图（`app/`）

### 公开页面
| 路由 | 文件 | 渲染策略 | 数据来源 |
|---|---|---|---|
| `/` | `app/page.tsx` | 客户端（`"use client"`） | fetch `/api/content` + `/api/works` + `/api/posts` |
| `/about` | `app/about/page.tsx` | 客户端 | fetch `/api/content` |
| `/contact` | `app/contact/page.tsx` | 客户端 | fetch `/api/content` |
| `/blog` | `app/blog/page.tsx` | 客户端 | fetch `/api/posts` |
| `/blog/[id]` | `app/blog/[id]/page.tsx` | **RSC**（服务端组件） | 直读 `data/posts.json`（fs/promises） |
| `/works/[id]` | `app/works/[id]/page.tsx` | **RSC** | 直读 `data/works.json` |
| `/preview/{minimal,tech,warm}` | `app/preview/*/page.tsx` | 构建时静态 | `import @/data/works.json` |

> ⚠️ **双数据源**：列表页走 `/api/*`（运行时），详情页（RSC）直读 JSON。改数据结构两边都要动。

> `/assets/[...path]`（`app/assets/[...path]/route.ts`）是**静态资源路由**：项目根 `assets/` 不在 `public/` 下，由这个 catch-all 路由按扩展名设 Content-Type 提供服务（含目录穿越防护）。同步下来的图片、封面都走这里。

### 后台页面（`/admin/*`，全部 `"use client"`）
| 路由 | 用途 |
|---|---|
| `/admin/login` | 密码登录（唯一获取+发送 CSRF token 的页面） |
| `/admin/dashboard` | 统计卡片 + 最近 5 作品/5 博客 + 删除 + 登出 |
| `/admin/works` | 作品网格、分类筛选、删除、★精选切换、编辑（跳 `/admin/upload?id=`） |
| `/admin/upload` | 作品编辑器（含图片上传 multipart→`/api/upload`）→ POST `/api/works` |
| `/admin/upload-post` | 博客编辑器（**无图片上传**）→ POST `/api/posts` |
| `/admin/blog` | 博客网格、分类筛选、删除、编辑 |
| `/admin/content` | 包在 `AdminLayout` 里。编辑 siteName/hero.warm/about/services |
| `/admin/resume` | 包在 `AdminLayout` 里。编辑 education/experience/skills（用 `ResumeEditor`） |
| `/admin/contact` | 编辑 socialLinks（email/phone/location/birthday/github） |
| `/admin/edit-content` | ⚠️ **遗留**全量内容编辑器（tabs），已被 content+resume 取代，未在导航链接 |
| `/admin/github-settings` | GitHub 仓库配置 + PAT + 手动同步 + webhook 文档 |

## 4. API（`app/api/*`，Next.js Route Handler，读 `data/*.json`）

> 这是**当前**前端调用的 API（单体自带）。PerLog 后端（NestJS）是**未来**替换，尚未接入（接入在阶段 2d）。

| 方法 | 路径 | 鉴权 | 数据文件 |
|---|---|---|---|
| GET/PUT | `/api/content` | GET 公开 / PUT admin | content.json（PUT 浅合并） |
| GET | `/api/posts` / `/api/works` | 公开 | posts/works.json |
| POST/DELETE | `/api/posts` / `/api/works` | admin | 同上 |
| PUT/DELETE | `/api/posts/[id]` / `/api/works/[id]` | admin | 同上（shallow 合并） |
| POST | `/api/upload` | admin（multipart） | 写 `public/uploads/` |
| GET | `/api/auth/check` | — | 校验 session |
| GET | `/api/auth/csrf` | — | 发 csrf-session cookie |
| POST | `/api/auth/login` | 公开（需 CSRF 头） | 校验 ADMIN_PASSWORD，设 admin-session cookie |
| POST | `/api/auth/logout` | 无校验 | 清 cookie |
| GET/POST | `/api/github/settings` | admin | github-settings.json |
| POST | `/api/github/sync` | ⚠️ 无鉴权（建议补 `checkAuth`） | 拉内容仓库 `blogs/works/assets` → posts/works.json + 根 `assets/`；**assets 落盘前压缩为 WebP（≤300KB）**；cover 与正文图片改写为本地 `/assets/...`；响应含 `assetsCompressed/assetsSkipped/originalBytes/compressedBytes` 统计 |
| GET | `/assets/[...path]` | 公开 | 读项目根 `assets/<path>` 返回（图片等附件） |
| POST | `/api/github/webhook` | HMAC | 触发 sync |

## 5. 组件架构（`components/`）

- **`components/ui/Sidebar.tsx`** — 左侧 vCard（头像、姓名、title、联系方式列表、社交图标、展开按钮）
- **`components/ui/VCards/BottomNav.tsx`** — 底部/顶部导航（移动端底部固定，桌面端右上角；`/api/v1` 前缀外的导航）
- **`components/ui/VCards/AboutSection.tsx` / `ResumeSection` / `PortfolioSection` / `BlogSection` / `ContactSection`** — 5 个 `<article data-page>` 分页内容，靠 `.active` class 切换显隐（CSS 动画 fade/scaleUp）
- **`components/ui/VCards/DetailView.tsx`** — 作品/博客详情弹层（framer-motion），含 `MarkdownContent`
- **`components/MarkdownContent.tsx`** — markdown 渲染（react-markdown + remark-gfm + remark-obsidian + rehype-sanitize + mermaid + 代码高亮）。可选 `notes` prop 用于解析 `[[笔记]]`。
- **`lib/remark-obsidian.ts`** — 渲染时把 Obsidian 内链转成标准节点：`![[图片]]`（同步期已改写为 `/assets/...`）、`[[笔记]]`/`[[笔记|别名]]`/`[[笔记#标题]]` → `/blog|/works/{id}`（未匹配 → `#obsidian-unresolved-*`，由 `MarkdownContent` 的 `a` 组件渲染成灰色文本）。导出 `isImageFilename` / `splitObsidianTarget` 供 sync 复用。
- **`components/admin/AdminLayout.tsx`** — 后台布局（自带 sidebar + navbar + auth check + 登出）
- **`components/admin/ResumeEditor.tsx`** — 简历编辑器（education/experience/skills tabs）
- **`components/public/Navbar.tsx`** — 预览页用的 Tailwind 导航（和 vCard 的 BottomNav 是两套）
- **`components/ui/WorkCard.tsx`** — 预览页用的作品卡

## 6. 鉴权与安全

- **单密码**：env `ADMIN_PASSWORD`（默认 `admin123`，生产必改）。无用户表。
- **session**：HMAC 签名的 `admin-session` cookie（httpOnly, 7d），`lib/auth.ts`。
- **CSRF**：double-submit 模式，`lib/csrf.ts`。⚠️ **只在 `/api/auth/login` 强制**，其他写操作没查 CSRF。
- **路由保护**：⚠️ `proxy.ts` **未挂载为 middleware**（仓库无 `middleware.ts`），admin 页面保护**只靠每个页面 `useEffect` 里调 `/api/auth/check`**。
- **登录限流**：内存 Map（`login/route.ts`），重启即重置，不集群安全。

## 7. 设计系统（`app/globals.css`）

**vCard 暗色主题**，CSS 自定义属性驱动（`:root`）：
- 背景：`--bg-primary`(smoky-black) / `--bg-secondary`(eerie-black-1) / `--bg-card`(eerie-black-2) / `--bg-elevated`(onyx)
- 文字：`--text-primary`(white) / `--text-secondary`(light-gray) / `--text-muted`
- 强调：`--accent-primary`(橙黄 crayola) / `--accent-secondary`(vegas-gold)
- 边框：`--border-color`(jet)
- 圆角：`--radius-sm/md/lg/xl/full`

**Tailwind 映射**：`bg-bg-primary`、`text-text-primary`、`bg-accent-primary`、`text-text-inverse` 等（见 globals.css `@theme inline` + `:root` 映射段）。

**响应式断点**：375 / 580 / 768 / 1024 / 1250 / 1400 / 1920 px。`main-container` 在 ≥1024px 变成 row（侧边栏 + 主内容）。

> ⚠️ **卡片网格必须用 `minmax(0, 1fr)`**（`.project-list` / `.blog-posts-list` 的固定列数断点）：若用 `1fr` 或 `minmax(Npx,1fr)`，grid 项的隐含 `min-width:auto`（=卡片内容最小宽，实测约 391px）会在 article 变窄时撑爆容器右边缘（issue #12）。`minmax(0,1fr)` 让卡片可随容器缩放，根除溢出。base 的 `auto-fill + minmax(min(100%,280px),1fr)` 自保护，可保留。

> 💡 **样式约定（用户偏好）**：CSS class 经常因缓存/优先级失效，**内联 style 更可靠**（见 `~/.claude/.../memory/`）。能用内联就内联。

## 8. 环境变量（`.env.local`，已 gitignore）

`ADMIN_PASSWORD`、`SESSION_SECRET`、`CSRF_SECRET`、`GITHUB_TOKEN`、`GITHUB_REPO`、（可选）`GITHUB_WEBHOOK_SECRET`、`GITHUB_ENCRYPTION_KEY`、`NEXT_PUBLIC_BASE_URL`。
⚠️ 仓库历史里有明文 GitHub PAT，需轮换。

## 9. 数据（`data/*.json`）

- **`content.json`** — 站点主内容（siteName, hero{warm,tech}, about, services[], education[], experience[], skills[], sections, footer, socialLinks）。驱动首页/关于/简历/联系。
- **`posts.json`** — 博客数组（id,title,excerpt,content[markdown],category,date,readTime,cover,source,githubPath）。
- **`works.json`** — 作品数组（id,title,description,category,cover,tech[],demo,repo,featured,content,source,githubPath）。
- `data/`（除 `github-settings.json`）与项目根 `assets/` **已纳入版本管理**（2026-07 起：移除 `.gitignore` 规则 + 取消 `--skip-worktree`，内容随仓库走）。`assets/` 是同步压缩后的 WebP（单图 ≤300KB）。重新同步 / 后台编辑会覆盖本地内容；若想冻结本地改动，可自行重设 `--skip-worktree`。
- **`assets/`**（项目根，**非** `public/`）—— GitHub 同步下来、**已压缩为 WebP** 的 Obsidian 附件（`covers/`、`images/` …，单图 ≤300KB），由 `app/assets/[...path]/route.ts` 提供静态服务。`posts`/`works` 的 `cover` 与正文图片都指向 `/assets/**.webp`。
- **`github-settings.json`** —— 同步用的仓库地址 + PAT，已 gitignore，不入库。

> 类型定义在 `types/index.ts`（与实际 JSON 一致）。⚠️ `lib/types.ts` 里的 `Work` 接口**过时**（image?/tags?），别用它。

## 10. 与 PerLog 后端的关系（重要）

PerLog（`../Perlog`，NestJS+MongoDB+JWT）是这个站点的**未来后端**，目前**未接入**。
阶段 2d（前端重构）时才会：建 `lib/api-client.ts`、`AuthContext`（JWT）、把所有 `fetch("/api/...")` 换成调 PerLog、RSC 详情页改服务端 fetch、删掉旧的 `app/api/*` + `proxy.ts` + data 直读。
**在那之前，本前端仍是自洽的单体 Next.js（自带 API 路由读 data/*.json）。**

## 11. GitHub 同步与 Obsidian 内链（数据流）

**同步**（`app/api/github/sync/route.ts`，POST，⚠️ 暂无鉴权）：
1. **syncAssets 先跑**：先清空项目根 `assets/`（保留 `.gitkeep`，避免改名 `.webp` 后旧文件残留）；Git Trees API（`recursive=1`）列出 `assets/` 下所有 blob，用 Blobs API（`git/blobs/{sha}`）取内容（绕开 Contents API 单文件 1MB 限制）→ **经 `lib/image-compress.ts` 压缩为 WebP（≤`MAX_BYTES`=300KB，gif/svg 跳过）** → 写 `assets/<相对路径>.webp`，并构建 `原 basename → 压缩后相对路径` 索引。逐文件 try/catch；assets 异常被外层兜住，不影响内容同步。
2. **syncPosts / syncWorks**：拉 `blogs/`、`works/` 的 `.md`，解析 frontmatter，用上面的索引把 `cover` 与正文 `![[图片]]` 改写为本地 `/assets/**.webp`（`resolveAssetRef` 统一走 basename 索引，frontmatter 里写的 `.png` 也能解析到压缩后的 `.webp`），落 `data/posts.json` / `data/works.json`。

**渲染**（`lib/remark-obsidian.ts`，渲染时）：
- `![[图片]]` 已在同步期变成标准 `![](/assets/...)`；
- `[[笔记]]` / `[[笔记|别名]]` / `[[笔记#标题]]` 用传入的 `notes` 映射解析到 `/blog/{id}` 或 `/works/{id}`，未匹配渲染为灰色文本。`notes` 经 `MarkdownContent` ← `DetailView` ← `BlogSection`/`PortfolioSection` ← 首页 / 两个 RSC 详情页透传。

**图片压缩管线**（`lib/image-compress.ts`，syncAssets 落盘前对每张图调用）：
- 单图目标 ≤ `MAX_BYTES`（=300KB，文件顶部常量，一行可调）；统一输出 WebP。
- 流程：`sharp.rotate()`（按 EXIF 自动旋转，修手机照片方向）→ `resize({width:1600, withoutEnlargement:true})` → webp quality 阶梯 `82→74→66→58→50` 降级 → 仍超则逐步缩宽 `1500/1200/1000` → 兜底（webp 没比原图小则保留原图）。
- 跳过：`.gif`（保动画）、`.svg`（矢量）；sharp 失败原样返回，不阻塞同步。
- 输入：JPEG/PNG/WebP/GIF/BMP/AVIF/HEIC/HEIF/TIFF 均可读（`isCompressibleImage` 判定，比渲染层 `isImageFilename` 更宽）。

## 12. 怎么跑

```bash
npm install
npm run dev        # http://localhost:3000
# 后台：访问 /admin/login，密码 = ADMIN_PASSWORD
```
