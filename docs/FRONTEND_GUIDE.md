# surong-personal 前端开发指南

> 写给前端功能优化 / bug 修复会话。本文档固化了站点的功能、路由、组件、数据流、设计系统。
> 最后更新：2026-07-11

---

## 1. 这是什么项目

个人作品集/博客站点，**vCard 风格暗色主题**。单页 + 分页切换（不是传统多页跳转），左侧 vCard 侧边栏（头像/姓名/联系方式/社交），右侧主内容区按导航切换 About / Resume / Portfolio / Blog / Contact。

**两套主题风格**（`StyleContext`，存 localStorage）：`tech`（科技暗色）/ `warm`（暖色）。**三种字体**（`ThemeContext`）：poppins / inter / space-grotesk。

## 2. 技术栈

- **Next.js 16.2.9**（App Router）+ React 19 + TypeScript（strict）
- Tailwind CSS v4（`@import "tailwindcss"` + `@theme inline`，CSS 变量驱动配色）
- framer-motion（详情视图动画）、react-markdown + remark-gfm + rehype-sanitize（渲染博客/作品正文）、mermaid（markdown 里的流程图）、react-syntax-highlighter、lucide-react（图标）、sharp（上传图片预处理）
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

> ⚠️ **双数据源**：列表页走 `/api/*`（运行时），详情页（RSC）直读 JSON。改数据结构两边都要动。详见 KNOWN_ISSUES。

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
| POST | `/api/github/sync` | **无鉴权**（bug） | 拉内容仓库覆盖 posts/works.json |
| POST | `/api/github/webhook` | HMAC | 触发 sync |

## 5. 组件架构（`components/`）

- **`components/ui/Sidebar.tsx`** — 左侧 vCard（头像、姓名、title、联系方式列表、社交图标、展开按钮）
- **`components/ui/VCards/BottomNav.tsx`** — 底部/顶部导航（移动端底部固定，桌面端右上角；`/api/v1` 前缀外的导航）
- **`components/ui/VCards/AboutSection.tsx` / `ResumeSection` / `PortfolioSection` / `BlogSection` / `ContactSection`** — 5 个 `<article data-page>` 分页内容，靠 `.active` class 切换显隐（CSS 动画 fade/scaleUp）
- **`components/ui/VCards/DetailView.tsx`** — 作品/博客详情弹层（framer-motion），含 `MarkdownContent`
- **`components/MarkdownContent.tsx`** — markdown 渲染（react-markdown + mermaid + 代码高亮）
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

> 💡 **样式约定（用户偏好）**：CSS class 经常因缓存/优先级失效，**内联 style 更可靠**（见 `~/.claude/.../memory/`）。能用内联就内联。

## 8. 环境变量（`.env.local`，已 gitignore）

`ADMIN_PASSWORD`、`SESSION_SECRET`、`CSRF_SECRET`、`GITHUB_TOKEN`、`GITHUB_REPO`、（可选）`GITHUB_WEBHOOK_SECRET`、`GITHUB_ENCRYPTION_KEY`、`NEXT_PUBLIC_BASE_URL`。
⚠️ 仓库历史里有明文 GitHub PAT，需轮换。

## 9. 数据（`data/*.json`）

- **`content.json`** — 站点主内容（siteName, hero{warm,tech}, about, services[], education[], experience[], skills[], sections, footer, socialLinks）。驱动首页/关于/简历/联系。
- **`posts.json`** — 博客数组（id,title,excerpt,content[markdown],category,date,readTime,cover,source,githubPath）。
- **`works.json`** — 作品数组（id,title,description,category,cover,tech[],demo,repo,featured,content,source,githubPath）。
- `data/` 已加入 `.gitignore` 且三个 json 设了 `--skip-worktree`：**GitHub 保留默认值，本地编辑不入 git**。

> 类型定义在 `types/index.ts`（与实际 JSON 一致）。⚠️ `lib/types.ts` 里的 `Work` 接口**过时**（image?/tags?），别用它。

## 10. 与 PerLog 后端的关系（重要）

PerLog（`../Perlog`，NestJS+MongoDB+JWT）是这个站点的**未来后端**，目前**未接入**。
阶段 2d（前端重构）时才会：建 `lib/api-client.ts`、`AuthContext`（JWT）、把所有 `fetch("/api/...")` 换成调 PerLog、RSC 详情页改服务端 fetch、删掉旧的 `app/api/*` + `proxy.ts` + data 直读。
**在那之前，本前端仍是自洽的单体 Next.js（自带 API 路由读 data/*.json）。**

## 11. 怎么跑

```bash
npm install
npm run dev        # http://localhost:3000
# 后台：访问 /admin/login，密码 = ADMIN_PASSWORD
```
