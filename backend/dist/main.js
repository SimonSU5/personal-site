"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const express_1 = require("express");
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
const config_service_1 = require("./config/config.service");
const exception_filter_1 = require("./common/exception.filter");
const response_interceptor_1 = require("./common/response.interceptor");
async function bootstrap() {
    let app;
    try {
        app = await core_1.NestFactory.create(app_module_1.AppModule, {
            bodyParser: false,
            bufferLogs: true,
        });
    }
    catch (err) {
        printEnvFailure(err);
        process.exit(1);
    }
    const config = app.get(config_service_1.AppConfigService);
    app.use((0, express_1.json)({
        limit: config.bodyLimitBytes,
        verify: (_req, _res, buf) => buf,
    }));
    app.use((0, express_1.urlencoded)({ extended: true, limit: config.bodyLimitBytes }));
    app.setGlobalPrefix('api/v1', {
        exclude: ['health'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        errorHttpStatusCode: common_1.HttpStatus.UNPROCESSABLE_ENTITY,
        disableErrorMessages: false,
    }));
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false,
    }));
    const allowedOrigins = config.corsAllowedOrigins;
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Authorization',
            'Content-Type',
            'If-Match',
            'X-Request-Id',
            'X-Forwarded-For',
        ],
        exposedHeaders: [
            'X-Request-Id',
            'ETag',
            'X-Content-Source',
            'Location',
            'Retry-After',
        ],
    });
    const httpAdapterHost = app.get(core_1.HttpAdapterHost);
    app.useGlobalFilters(new exception_filter_1.GlobalExceptionFilter(httpAdapterHost));
    app.enableShutdownHooks();
    const port = config.port;
    const host = config.host;
    const server = await app.listen(port, host).catch((err) => {
        const code = err?.code;
        if (code === 'EADDRINUSE' || code === 'EACCES' || code === 'EAFNOSUPPORT') {
            process.stderr.write(`BIND_ERROR (${code}): cannot bind to HOST="${host}" PORT="${port}". ` +
                `Is another process already on that port, or is the host invalid?\n`);
        }
        process.stderr.write(err instanceof Error ? err.stack ?? String(err) : String(err));
        process.stderr.write('\n');
        process.exit(1);
    });
    const log = new common_1.Logger('Bootstrap');
    let shuttingDown = false;
    const shutdown = async (signal) => {
        if (shuttingDown)
            return;
        shuttingDown = true;
        log.log(`Received ${signal}; draining for up to ${config.shutdownGraceMs}ms.`);
        try {
            await server.close();
        }
        catch (err) {
            log.warn(`Error closing HTTP server: ${messageOf(err)}`);
        }
        try {
            await (await Promise.resolve().then(() => __importStar(require('mongoose')))).default.disconnect();
        }
        catch (err) {
            log.warn(`Error disconnecting mongoose: ${messageOf(err)}`);
        }
        process.exit(0);
    };
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
    log.log(`surong-personal-backend listening on http://${host}:${port}/api/v1`);
    void response_interceptor_1.ResponseInterceptor;
}
function printEnvFailure(err) {
    const maybeErrors = err.errors;
    if (Array.isArray(maybeErrors) && maybeErrors.length > 0) {
        process.stderr.write('Environment validation failed:\n');
        for (const e of maybeErrors) {
            const variable = e?.variable ?? 'UNKNOWN';
            const reason = e?.reason ?? 'invalid';
            process.stderr.write(`  - ${variable}: ${reason}\n`);
        }
        return;
    }
    process.stderr.write('Bootstrap failed: ');
    process.stderr.write(err instanceof Error ? err.stack ?? String(err) : String(err));
    process.stderr.write('\n');
}
function messageOf(err) {
    if (err instanceof Error)
        return err.message;
    return String(err);
}
bootstrap().catch((err) => {
    process.stderr.write('Fatal bootstrap error: ');
    process.stderr.write(err instanceof Error ? err.stack ?? String(err) : String(err));
    process.stderr.write('\n');
    process.exit(1);
});
//# sourceMappingURL=main.js.map