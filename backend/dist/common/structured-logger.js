"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.structuredLogger = exports.StructuredLogger = void 0;
const LEVEL_PRIORITY = {
    fatal: 0,
    error: 1,
    warn: 2,
    log: 3,
    verbose: 4,
    debug: 5,
};
const PRIORITY_LEVEL = Object.fromEntries(Object.entries(LEVEL_PRIORITY).map(([k, v]) => [v, k]));
function normalizeEnvLevel(raw) {
    const lower = raw.toLowerCase();
    if (lower === 'info')
        return 'log';
    return (lower in LEVEL_PRIORITY) ? lower : undefined;
}
function configuredLevels() {
    const env = normalizeEnvLevel(process.env.LOG_LEVEL ?? 'info');
    if (env === undefined) {
        return new Set(['fatal', 'error', 'warn', 'log']);
    }
    const threshold = LEVEL_PRIORITY[env];
    const enabled = new Set();
    Object.keys(LEVEL_PRIORITY).forEach((lvl) => {
        if (LEVEL_PRIORITY[lvl] <= threshold)
            enabled.add(lvl);
    });
    return enabled;
}
class StructuredLogger {
    enabled;
    isProd;
    constructor() {
        this.enabled = configuredLevels();
        this.isProd = process.env.NODE_ENV === 'production';
    }
    emit(level, message, context) {
        if (!this.enabled.has(level))
            return;
        const entry = {
            level: PRIORITY_LEVEL[LEVEL_PRIORITY[level]],
            time: new Date().toISOString(),
            message: typeof message === 'string' ? message : safeStringify(message),
        };
        if (context) {
            for (const [k, v] of Object.entries(context)) {
                if (v !== undefined && !(k in entry))
                    entry[k] = v;
            }
        }
        const line = JSON.stringify(entry);
        if (level === 'fatal' || LEVEL_PRIORITY[level] <= LEVEL_PRIORITY.error) {
            process.stderr.write(line + '\n');
        }
        else {
            process.stdout.write(line + '\n');
        }
    }
    log(message, context) {
        this.emit('log', message, context);
    }
    error(message, context) {
        this.emit('error', message, context);
    }
    warn(message, context) {
        this.emit('warn', message, context);
    }
    debug(message, context) {
        this.emit('debug', message, context);
    }
    verbose(message, context) {
        this.emit('verbose', message, context);
    }
    fatal(message, context) {
        this.emit('fatal', message, context);
    }
    async flush() {
    }
    isLevelEnabled(level) {
        return this.enabled.has(level);
    }
    redact(value) {
        return this.isProd ? '[REDACTED]' : safeStringify(value);
    }
}
exports.StructuredLogger = StructuredLogger;
function safeStringify(value) {
    if (value instanceof Error) {
        return value.stack ?? `${value.name}: ${value.message}`;
    }
    try {
        return JSON.stringify(value);
    }
    catch {
        return String(value);
    }
}
exports.structuredLogger = new StructuredLogger();
//# sourceMappingURL=structured-logger.js.map