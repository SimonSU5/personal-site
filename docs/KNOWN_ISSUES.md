# surong-personal 前端 — 已知问题 / 优化清单

> 按严重度排。前端的 bug 修复 / 优化会话可从这里挑。
> 最后更新：2026-07-11

---

## 🔴 安全 / 正确性（建议先修）

### 1. `proxy.ts` 未挂载为 middleware → admin 路由保护薄弱
- **问题**：仓库无 `middleware.ts`，`proxy.ts` 只是个普通文件没生效。admin 页面保护**只靠每个页面 `useEffect` 里 `fetch('/api/auth/check')`**——这意味着页面 JS 加载前 `/admin/*` 的静态资源都能被访问，且 API 路由本身靠各自的 `checkAuth()`。
- **修法**：把 `proxy.ts` 改名/重写为 `middleware.ts`（Next.js 16 中间件，注意 16 的 middleware API 可能和旧版不同——读 `node_modules/next/dist/docs/`），在 edge runtime 校验 `admin-session` cookie 签名（`lib/auth-edge.ts` 的 `verifyToken` 已有，但需确认 16 的导出约定）。或等阶段 2d 接 PerLog 后端时整体换掉。

### 2. CSRF 只在 `/api/auth/login` 强制，其他写操作无 CSRF 防护
- **问题**：`/api/content` PUT、`/api/posts` POST/DELETE、`/api/works`、`/api/upload`、`/api/github/sync` 都没校验 CSRF token。虽是 httpOnly cookie + SameSite，但 SameSite=lax 仍允许顶级导航 GET 触发；写操作理论上可被 CSRF（配合已登录 session）。
- **修法**：在每个写 route handler 加 `verifyCsrfToken(header)`，前端写操作带 `X-CSRF-Token` 头。或等接 PerLog（JWT bearer，无 cookie 则无 CSRF 风险）。

### 3. `/api/github/sync` 无鉴权
- **问题**：任何人知道 URL 都能触发同步（还能塞自己的 token）。`app/api/github/sync/route.ts` 无 `checkAuth()`。
- **修法**：加 `await checkAuth()`。

### 4. RSC 详情页直读 JSON = 双数据源
- **问题**：`app/blog/[id]/page.tsx`、`app/works/[id]/page.tsx` 用 `fs/promises` 直读 `data/*.json`，绕过 API。列表页走 `/api/*`。改数据结构两边都要改，且 RSC 拿不到运行时 API 的任何处理。
- **修法**：RSC 改用服务端 fetch 调自己的 `/api/posts/[id]`（同进程 fetch）或等接 PerLog 后端。注意 Next 16 的 fetch 缓存语义。

### 5. `lib/types.ts` 的 `Work` 接口过时
- **问题**：`lib/types.ts` 的 `Work` 用 `image?`/`tags[]`，实际 `works.json` 是 `cover?`/`tech[]`。误导。
- **修法**：删掉 `lib/types.ts` 的 Work/Config，统一用 `types/index.ts`（已正确）。

---

## 🟠 一致性 / 体验

### 6. 后台鉴权检查重复
- **问题**：`AdminLayout`（包住 content/resume 页）自己调 `/api/auth/check`；而 dashboard/works/blog/upload/upload-post/contact/edit-content/github-settings 每个页面又各自 `useEffect` 调一遍。两套并存。
- **修法**：所有 admin 页统一走 `AdminLayout`（或统一的 `useRequireAuth` hook），去掉内联重复检查。

### 7. 旧 API 响应壳不统一
- **问题**：`/api/posts/[id]` PUT 返回记录本体；`/api/works/[id]` PUT 返回 `{success, work}`。前端要分别处理。
- **修法**：统一成 `{success, data}`（和 PerLog 后端 SPEC §2.1 一致，也为 2d 接入铺路）。

### 8. 遗留编辑器 `/admin/edit-content` 还在
- **问题**：已被 `/admin/content` + `/admin/resume` 取代，未在导航链接，但页面还在。且它的 PUT 是全量替换，会**覆盖** content/resume/contact 存的其他字段（stomp bug）。
- **修法**：直接删除 `app/admin/edit-content/`（edit-about 已删，这个漏了）。

### 9. 上传页编辑模式预填未实现
- **问题**：`/admin/upload?id=xxx`（从作品管理点编辑跳来）和 `/admin/upload-post?id=` 的编辑预填**没实现**，表单始终空白。用户以为是新建。
- **修法**：读 `?id=` 后 fetch 现有数据预填表单，提交时走 PUT 而非 POST。或暂时隐藏编辑入口只保留新建。

### 10. `upload-post` 无图片上传
- **问题**：博客编辑器不能传封面图，博客 cover 只能靠 GitHub 同步带进来。
- **修法**：复用 `/api/upload`，在 upload-post 加封面图选择。

### 11. 登录限流是内存 Map
- **问题**：`app/api/auth/login/route.ts` 的失败计数用内存 `Map`，进程重启即重置，且 Next.js serverless 多实例不共享。
- **修法**：改用持久化（文件/Redis）或等接 PerLog（限流落 Mongo）。低优先级（个人站）。

---

## 🟡 显示 / 样式（"bug 优化"常见来源）

### 12. vCard 导航定位（BottomNav 双用途）
- **现状**：`BottomNav` 前台用底部固定（`position:fixed;bottom:0`），后台用 sticky top（AdminLayout 直接实现了 navbar 而非复用 BottomNav，因为定位需求不同）。
- **坑**：改 BottomNav 样式要同时看前台和后台两处影响。
- **建议**：后台导航独立组件，BottomNav 只服务前台。

### 13. 内联代码 / markdown 样式
- **历史**：`MarkdownContent` 里内联 code 背景曾用 `bg-gray-100`（亮色），已改 `bg-bg-secondary`。代码块、mermaid 图、表格的暗色适配在 `globals.css` 的 `.prose` / `.detail-content` 段。改 markdown 渲染样式去那里。

### 14. 响应式断点
- 移动端（<580px）：侧边栏可折叠（`info_more-btn`），导航底部固定。
- ≥1024px：row 布局，侧边栏 sticky。
- 超宽屏（≥1920px）：main-container max-width 1600px，作品/博客保持 3 列。
- 优化显示 bug 时先确认在哪个断点。

### 15. 用户样式偏好
- **CSS class 常因 Tailwind v4 缓存/优先级失效 → 内联 style 更可靠**（这是用户明确反馈过的，见 `~/.claude/.../memory/feedback_styling_inline.md`）。改样式优先内联。

---

## 备注：哪些会在阶段 2d 自然解决
接入 PerLog 后端时，#1（middleware）、#2（CSRF）、#4（RSC 双源）、#7（响应壳）、#11（限流）会被整体替换——前端不再有自带的 `app/api/*`。但**在那之前的 bug 优化**仍需在现有单体上修。如果优化会话的目标是"先让现有站更稳"，就修上面的；如果是"推进 2d"，就别在旧 API 上投入，直接做 api-client 重构。
