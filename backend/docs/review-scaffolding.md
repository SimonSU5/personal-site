# 后端脚手架代码审查报告（阶段 2a）

> 审查范围：commit `7bb83ac`（脚手架）及后续 `dist` 取消跟踪
> 审查方式：2 个 max-effort finder agent 并行 + 主线经验性验证
> 参考规范：`backend/docs/spec/SPEC.md` §2/§3
> 严重度从高到低排列；前 3 条为必须修复的生产 Bug

---

## 🔴 严重（生产环境错误路由 + SPEC 违规）

### 1. `/health` 与 `/api/v1/health` 路由冲突

- **位置**：`backend/src/main.ts:64`
- **问题**：`setGlobalPrefix('api/v1', { exclude: ['health'] })` 会把前缀剥离掉 **两个**控制器——`HealthController`（`@Controller('health') @Get()`）和 `RawHealthController`（`@Controller() @Get('health')`），两者都被压平到 `/health`，导致 `/api/v1/health` 不存在。
- **触发场景**：NestJS 的 exclude 是按路由本地路径字符串相等匹配的，两个控制器都产生本地路径 `health`。生产环境下 `GET /health` 会返回 JSON 活性信封（`HealthController` 先注册、先命中），而不是 SPEC 要求的 `text/plain` 的 `alive`；同时 `GET /api/v1/health` 返回 404。nginx 的原始健康探针和任何访问 `/api/v1/health` 的客户端都会失败。
- **额外说明**：e2e 冒烟测试**掩盖了这个问题**——它把 `/health` 直接挂到 Express 上并去掉了 exclude，所以测试通过但生产环境有 bug。**这是最重要的发现。**

### 2. `PAYLOAD_TOO_DEEP` 错误码不可达

- **位置**：`backend/src/common/exception.filter.ts:86`
- **问题**：`statusToCode()` 在检查响应对象的 `code` 字段之前，就把 HTTP 400 映射成了 `BAD_REQUEST`，所以 `PayloadDepthMiddleware` 抛出的 `BadRequestException({ code: 'PAYLOAD_TOO_DEEP' })` 最终被报告为 `BAD_REQUEST`。
- **触发场景**：客户端发送嵌套过深的 JSON，中间件抛 `BadRequestException({code:'PAYLOAD_TOO_DEEP'})`，过滤器看到 status 400 命中 `case HttpStatus.BAD_REQUEST: return ErrorCode.BAD_REQUEST`，响应里 `error.code` 变成 `BAD_REQUEST` 而非 `PAYLOAD_TOO_DEEP`。SPEC §2.2 把它列为独立的 400 码，客户端无法区分"嵌套过深"和"普通格式错误"。**已经验证。**

### 3. Helmet frameguard 默认是 `SAMEORIGIN` 而非 `DENY`

- **位置**：`backend/src/main.ts:84`
- **问题**：`helmet({ contentSecurityPolicy: false })` 让 frameguard 保持默认值 `SAMEORIGIN`，但 SPEC §3.6/FR-27 要求 `X-Frame-Options: DENY`。
- **触发场景**：依赖 SPEC 承诺的 `DENY` 做点击劫持防护，实际拿到的是更弱的 `SAMEORIGIN`（同源兄弟页面仍可嵌入）。**已经验证（实测 `X-Frame-Options = "SAMEORIGIN"`）。**

### 4. 限流器的 key 是 sha256 哈希，不是 `${tracker}-${name}`

- **位置**：`backend/src/throttle/mongo-throttler-storage.ts:146`
- **问题**：`splitKey()` 假设 key 形如 `${tracker}-${throttlerName}`，但 `@nestjs/throttler` v6 的默认 `generateKey()` 返回的是 `sha256(...)` 的十六进制摘要（不含连字符），`splitKey` 解析出错。
- **触发场景**：`increment(key,...)` 收到 sha256 字符串，`lastIndexOf('-')` 返回 -1，`splitKey` 返回 `{tracker: <整个哈希>, routeName: <throttlerName>}`。Mongo 文档的 `tracker` 字段存的是无意义的哈希（不是 SPEC §3.2 要求的 XFF IP），`{tracker:1, routeName:1}` 索引对按 IP 聚合毫无用处。限流计数本身仍然正确，但 SPEC §3.2 的 schema/可观测性契约被破坏。**已通过 throttler v6 源码确认。**

---

## 🟠 中等（SPEC 缺口）

### 5. 畸形 JSON → 500 而非 400

- **位置**：`backend/src/main.ts:51`
- **问题**：body-parser 的 `verify: (_req,_res,buf)=>buf` 回调并不能像注释声称的那样重新格式化畸形 JSON 的错误信息；body-parser 抛出的 `SyntaxError` 不是 `HttpException`，全局过滤器会把非 `HttpException` 映射成 500 `INTERNAL_ERROR`，而非 SPEC 要求的 400 `BAD_REQUEST`。
- **触发场景**：客户端 POST 畸形 JSON，body-parser 抛 `SyntaxError`（status 400，type `entity.parse.failed`）。该错误发生在 Nest 路由之前的 Express 中间件，可能完全绕过 Nest 异常过滤器（走 Express 默认 HTML 400），或者进入过滤器后因为不是 `HttpException` → `INTERNAL_ERROR` 500。两种情况都违背 SPEC §3.4 FR-13 的统一信封 `{success:false, error:{code:'BAD_REQUEST'}}`。`verify` 回调对错误格式化是个空操作。

### 6. 优雅关闭没有翻转 readiness

- **位置**：`backend/src/main.ts:153`
- **问题**：关闭流程只是关闭了 HTTP 服务器和 Mongo，没有在排空（drain）前先把 readiness 标记为 `NOT_READY`——SPEC §3.4 FR-23 要求收到 SIGTERM 时 readiness 探针立即翻转，让负载均衡在宽限窗口内停止派发新流量。
- **触发场景**：SIGTERM 时代码调用 `server.close()` 然后 `mongoose.disconnect()` 然后 `exit(0)`。`/api/v1/health/ready` 在监听器关闭期间仍可能返回 200（Mongo 断开前一直 up），所以 LB/路由器可能在最长 `SHUTDOWN_GRACE_MS` 时间内继续把新请求路由到正在排空的实例，随后这些请求收到连接重置而非干净的 503 `NOT_READY`。

### 7. `config.intOr` 没有下限校验

- **位置**：`backend/src/config/config.service.ts:227`
- **问题**：`intOr()` 和端口解析都不强制合理下限，运维可以把 `BODY_LIMIT_BYTES=0`（禁用 body 解析）或 `THROTTLE_LIMIT=0`（拒绝所有流量）或意外的 `PORT=0` 设置成生效值。
- **触发场景**：运维在 `.env` 误设 `BODY_LIMIT_BYTES=0`，`json({limit:0})` 拒绝所有 POST body；或 `THROTTLE_LIMIT=0` 让每个请求都 429。配置校验器（`env.validation.ts`）只检查这些是数字字符串，从不检查取值范围，一个拼写错误就会让服务在启动时瘫痪且无 env 校验报错。

---

## 🟢 清理（死代码 / 可读性）

### 8. `XffThrottlerGuard.shouldThrow` 是死代码

- **位置**：`backend/src/throttle/xff-throttler.guard.ts:30`
- **问题**：`shouldThrow()` 在 `@nestjs/throttler` v6 的 `ThrottlerGuard` 上根本不存在（已验证 dist 里没有此方法），所以这个 override 是死代码；文档化的 fail-closed 行为完全依赖于未捕获的 `MongoError` 一路冒泡到过滤器。
- **风险**：维护者读到这个 guard 会以为 fail-closed 是在这里显式强制的。如果未来 throttler 版本或存储层在冒泡前吞掉了错误，guard 会悄悄放行流量却没有任何显式兜底。`shouldThrow` override 给的是虚假安全感。

### 9. `setMaxPayloadDepth` 零调用

- **位置**：`backend/src/common/payload-depth.middleware.ts:17`
- **问题**：导出但全代码库无任何调用方（grep 已验证），中间件里读 `res.locals` 的 override 路径不可达。
- **风险**：死代码——中间件永远走 `process.env.PAYLOAD_MAX_DEPTH`。没有任何路由能像导出函数暗示的那样自定义深度上限。未来维护者可能误以为按路由 override 已经接好。

### 10. `isProduction` 三元表达式冗余

- **位置**：`backend/src/common/exception.filter.ts:146`
- **问题**：`NODE_ENV==='production' || NODE_ENV==='test' ? NODE_ENV==='production' : false` 写得过度复杂；`'test'` 分支是死代码（两个分支都返回 false）。
- **风险**：化简后等价于 `NODE_ENV === 'production'`。多余的 `'test'` 操作数会误导读者以为 test 模式被特殊对待（实际并没有有）。纯可读性成本——行为本身是对的。

---

## 总体评估

脚手架**结构扎实、整体忠于 SPEC**，但有 **3 个必须修复的生产 Bug**（发现 1、2、3）才能算这个域交付完成。

发现 1 尤其值得注意，因为**测试基础设施掩盖了它**——冒烟测试应该重建为跑真实 `AppModule` 的健康检查接线（这需要 Mongo，正是我们遇到的阻塞点）。
