<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 项目上手

开始任何前端工作前，先读：
- **`docs/FRONTEND_GUIDE.md`** — 功能、路由地图、组件架构、数据流、设计系统（vCard 暗色主题 / CSS 变量 / 响应式断点）、env、与 PerLog 后端的关系
- **`docs/KNOWN_ISSUES.md`** — 按严重度排的 bug / 优化清单（安全、一致性、显示样式）

本仓库是**前端**（Next.js 16 单体，自带 `app/api/*` 路由读 `data/*.json`）。后端在隔壁仓库 `../Perlog`（NestJS+MongoDB+JWT），目前**未接入**（接入在阶段 2d）。

样式约定：CSS class 常因 Tailwind v4 缓存/优先级失效，**内联 style 更可靠**（用户偏好）。

