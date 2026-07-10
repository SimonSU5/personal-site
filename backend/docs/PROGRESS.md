# 前后端分离迁移 — 进度报告

> 最后更新：2026-07-10
> 方法论：Loop Engineering（PM↔Architect 共识 + Engineer↔Verifier 闭环）

---

## 总体进度

| 阶段 | 状态 | 说明 |
|---|---|---|
| **阶段 1：SPEC 共识** | ✅ 完成 | 8 域 PM↔Architect 闭环，7/8 共识，产出 96KB SPEC |
| **阶段 1 检查点** | ✅ 通过 | 8 个开放问题用户已拍板（见 SPEC §13） |
| **阶段 2a：脚手架** | ✅ 完成 | NestJS 骨架 build 零错误 + e2e 冒烟 4/4 全绿 |
| **阶段 2b：Auth** | ✅ 完成 | users / JWT access+refresh 轮换 / 家系撤销 / 3 类限流 / guard / seed。23/23 测试全绿，Verifier 残留 2 条已修+防回归 |
| 阶段 2c：业务模块 | ⏳ 待开始 | Content / Posts / Works / Upload(OSS) / GitHub 同步 |
| 阶段 2d：前端重构 | ⏳ 待开始 | 移入 frontend/、api-client、AuthContext、RSC fetch |
| 数据迁移 | ⏳ 待开始 | data/*.json 全量导入 MongoDB |
| 集成与 e2e | ⏳ 待开始 | docker-compose / nginx / 迁移脚本 / 冒烟 |


---

## 阶段 1 产物

- `backend/docs/spec/SPEC.md`（96KB，12 章 + §13 决策）
- `backend/docs/spec/domain-results.json` — 各域共识轮次
- `backend/docs/spec/cross-domain-issues.json`
- `backend/docs/spec/open-questions.json`

工作流统计：43 个 agent，0 错误，~1.6M tokens。

### 用户确认的关键决策（SPEC §13）
- OSS：**Bucket 公共读**
- 现有明文 PAT：**部署后重新输入**（不迁移明文）
- 用户角色：**仅 admin**
- ICP 备案：用户负责
- 后端实例：单实例 v1
- featured 上限：8
- Mongo：单节点副本集（开事务）
- 前端构建 fallback：不设

---

## 阶段 2a 脚手架现状

### 已实现（按 SPEC §2/§3，质量高，经我直接复核）
- `src/main.ts` — 引导顺序（helmet/CORS allowlist/ValidationPipe/全局过滤器+拦截器/X-Request-Id/优雅关闭/bind 错误处理）
- `src/app.module.ts` — 根模块
- `src/common/` — 响应拦截器（{success,data} 信封 + @RawResponse opt-out）、全局异常过滤器（错误码表、不泄露堆栈、Mongo 故障→DEPENDENCY_DOWN）、error-code 表、request-id 中间件、payload 深度中间件、structured logger
- `src/config/` — fail-closed 环境校验（class-validator，无任何密钥默认值）、AppConfigService
- `src/health/` — GET /health（raw，前缀外）+ /api/v1/health 就绪探针
- `src/throttle/` — Mongo 后端限流存储（集群安全，TTL 索引）+ XFF guard
- `src/seed/` — 用户 seed（已起头，属 Auth 域，待续）
- `test/app.e2e-spec.ts` — 冒烟测试
- `package.json` / `tsconfig.json` / `nest-cli.json` / `.env.example` / `README.md`

### 已修复的编译/类型错误（我手动修复，11→0）
1. throttle 模块 vs `@nestjs/throttler` v6 API：`ThrottlerStorageRecord` 不再是值导出（改本地结构体）；`ThrottlerStorage` 是 symbol token 不是类（去掉 extends/super）；Mongoose 字符串 `_id` schema 改用 `@Prop` + `declare`
2. `env.validation.ts`：`@IsEnum(NodeEnv)` 类型当值用 → 改用具体数组 `NODE_ENV_VALUES`
3. `main.ts`：`enableImplicitConversion` 非合法选项（移除）；`HttpAdapterHost` 解构错误
4. `structured-logger.ts`：`silly` 不在 NestJS `LogLevel`；`info`→`log` 别名；嵌套索引 bug

### `npm run build`：✅ 零错误通过

### 当前阻塞：e2e 冒烟测试
- 验证已通过（fail-closed ConfigModule 在 setup-env.ts 注入的测试 env 下放行）
- 但 `app.init()` 要连真实 Mongo（`mongodb://127.0.0.1:27017`），本地无 Mongo → Mongoose 重试超时 → 4 个测试失败
- **下一步**：加 `mongodb-memory-server` devDep，测试 setup 自动拉起内存 Mongo；或测试中 override Mongoose 连接

---

## 关键文件清单（脚手架）
```
backend/
├── docs/spec/          # SPEC 全套
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/         # response.interceptor, exception.filter, error-code, request-id, payload-depth, structured-logger
│   ├── config/         # config.module, config.service, env.validation
│   ├── health/
│   ├── throttle/       # mongo-throttler-storage, throttler.schema, xff-throttler.guard, throttle.module
│   └── seed/           # (Auth 域，起头)
├── test/               # app.e2e-spec, setup-env.ts, jest-e2e.json
├── package.json
├── tsconfig.json / tsconfig.spec.json / tsconfig.build.json
└── nest-cli.json
```

---

## 下一步计划
1. 修通 e2e 冒烟（内存 Mongo）→ 脚手架域收尾、Verifier 正式验收
2. 阶段 2b：Auth 模块（users schema、JWT 双 token、login/refresh/logout、JwtAuthGuard、bcrypt、seed 脚本）
3. 阶段 2c：Content / Posts / Works / Upload(OSS) / GitHub 同步（按 SPEC §5–§9，闭环 B）
4. 阶段 2d：前端移入 frontend/ 并重构
5. 数据迁移 + docker-compose + nginx + 端到端冒烟

---

## 注意 / 风险
- 仓库现有明文 GitHub PAT（`.env.local`、`data/github-settings.json`）需轮换（SPEC §安全清理）
- 现网站（Next.js 单体）在阶段 2 全程保持可用，前端重构在最后一步
- 当前 `cwd` 为 `backend/`（开发在此目录进行）
