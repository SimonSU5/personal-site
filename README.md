# Simon 的个人网站

功能完整的个人网站系统，支持多种设计风格切换、作品展示、技术博客和管理后台。

## 功能特点

- **三种设计风格**：极简、科技、温暖，支持实时切换
- **作品集展示**：网格布局展示个人项目作品
- **技术博客**：文章列表和详情页
- **关于页面**：个人简介、技能、工作经历
- **联系页面**：留言表单 + 社交链接
- **管理后台**：登录认证、作品上传、数据管理

## 项目结构

```
surong-personal/
├── app/                          # Next.js App Router
│   ├── (public pages)/
│   │   ├── page.tsx             # 首页（作品集）
│   │   ├── about/               # 关于页面
│   │   ├── blog/                # 博客列表
│   │   │   ├── [id]/            # 博客详情
│   │   └── contact/             # 联系页面
│   ├── (preview)/
│   │   ├── layout.tsx           # 预览布局
│   │   ├── minimal/             # 极简风格预览
│   │   ├── tech/                # 科技风格预览
│   │   └── warm/                # 温暖风格预览
│   ├── admin/                   # 管理后台
│   │   ├── login/               # 登录页
│   │   ├── dashboard/           # 仪表板
│   │   └── upload/              # 作品上传
│   ├── api/                     # API 路由
│   │   ├── auth/                # 认证 API
│   │   │   ├── login            # 登录
│   │   │   ├── check            # 验证登录
│   │   │   └── logout           # 退出登录
│   │   ├── works/               # 作品 CRUD
│   │   │   └── [id]/            # 删除作品
│   │   └── upload/              # 图片上传
│   ├── layout.tsx               # 根布局
│   └── globals.css              # 全局样式
│
├── components/                   # React 组件
│   ├── public/
│   │   └── Navbar.tsx           # 导航栏
│   └── ui/
│       ├── WorkCard.tsx         # 作品卡片
│       └── StyleSwitcher.tsx    # 风格切换器
│
├── lib/                         # 工具库
│   ├── contexts/
│   │   └── StyleContext.tsx     # 风格上下文
│   └── types.ts                 # TypeScript 类型定义
│
├── data/                        # 数据文件
│   ├── works.json               # 作品数据
│   └── config.json              # 网站配置
│
├── public/                      # 静态资源
│   └── uploads/                 # 上传的图片
│
└── package.json                 # 项目配置
```

## 开始使用

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev          # 3000 端口
npm run dev:3001     # 3001 端口
npm run dev:8080     # 8080 端口
```

访问 [http://localhost:3000](http://localhost:3000)

### 构建生产版本

```bash
npm run build
npm run start
```

## 页面路由

| 路径 | 功能 |
|------|------|
| `/` | 首页（作品集） |
| `/about` | 关于页面 |
| `/blog` | 博客列表 |
| `/blog/[id]` | 博客详情 |
| `/contact` | 联系页面 |
| `/preview/minimal` | 极简风格预览 |
| `/preview/tech` | 科技风格预览 |
| `/preview/warm` | 温暖风格预览 |
| `/admin/login` | 管理员登录 |
| `/admin/dashboard` | 管理后台 |
| `/admin/upload` | 作品上传 |

## 管理后台

默认管理员密码：`admin123`

⚠️ **生产环境请修改密码**，设置环境变量 `ADMIN_PASSWORD`

### 后台功能
- 查看作品统计
- 上传新作品（支持图片）
- 删除作品
- 查看留言

## 数据存储

使用 JSON 文件存储数据，便于部署和迁移：

- `data/works.json` - 作品数据
- `data/config.json` - 网站配置
- `public/uploads/` - 上传的图片

## 部署

### Vercel（推荐）

1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 设置环境变量 `ADMIN_PASSWORD`
4. 部署完成

### 其他平台

支持部署到任何支持 Next.js 的平台（Netlify、Railway 等）

## 技术栈

- **框架**：Next.js 16 (App Router)
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **状态管理**：React Context
- **存储**：JSON 文件

## 许可

MIT
