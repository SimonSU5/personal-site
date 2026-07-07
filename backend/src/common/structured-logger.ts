import { LoggerService, LogLevel } from '@nestjs/common';

/**
 * Structured JSON logger emitting one line per event with `requestId`
 * correlation (SPEC §2.4 — "every structured log line" carries the id).
 *
 * This is a minimal pino-free implementation so the scaffolding has no
 * extra runtime dependency. It writes to stdout/stderr as JSON objects:
 *
 *   { level, time, event?, message, requestId?, userId?, ...extras }
 *
 * Stack traces are only logged server-side; they NEVER appear in any
 * response body (enforced by the global exception filter).
 */

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  fatal: 0,
  error: 1,
  warn: 2,
  log: 3,
  verbose: 4,
  debug: 5,
};

const PRIORITY_LEVEL: Readonly<Record<number, LogLevel>> = Object.fromEntries(
  Object.entries(LEVEL_PRIORITY).map(([k, v]) => [v, k as LogLevel]),
) as Readonly<Record<number, LogLevel>>;

/** Map common aliases (info→log) onto NestJS LogLevel values. */
function normalizeEnvLevel(raw: string): LogLevel | undefined {
  const lower = raw.toLowerCase();
  if (lower === 'info') return 'log';
  return (lower in LEVEL_PRIORITY) ? (lower as LogLevel) : undefined;
}

function configuredLevels(): Set<LogLevel> {
  const env = normalizeEnvLevel(process.env.LOG_LEVEL ?? 'info');
  if (env === undefined) {
    return new Set<LogLevel>(['fatal', 'error', 'warn', 'log']);
  }
  const threshold = LEVEL_PRIORITY[env];
  const enabled = new Set<LogLevel>();
  (Object.keys(LEVEL_PRIORITY) as LogLevel[]).forEach((lvl) => {
    if (LEVEL_PRIORITY[lvl] <= threshold) enabled.add(lvl);
  });
  return enabled;
}

export interface LogContext {
  requestId?: string;
  userId?: string | null;
  event?: string;
  [key: string]: unknown;
}

export class StructuredLogger implements LoggerService {
  private readonly enabled: Set<LogLevel>;
  private readonly isProd: boolean;

  constructor() {
    this.enabled = configuredLevels();
    this.isProd = process.env.NODE_ENV === 'production';
  }

  private emit(level: LogLevel, message: unknown, context?: LogContext): void {
    if (!this.enabled.has(level)) return;
    const entry: Record<string, unknown> = {
      level: PRIORITY_LEVEL[LEVEL_PRIORITY[level]],
      time: new Date().toISOString(),
      message: typeof message === 'string' ? message : safeStringify(message),
    };
    if (context) {
      for (const [k, v] of Object.entries(context)) {
        if (v !== undefined && !(k in entry)) entry[k] = v;
      }
    }
    const line = JSON.stringify(entry);
    if (level === 'fatal' || LEVEL_PRIORITY[level] <= LEVEL_PRIORITY.error) {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  }

  log(message: unknown, context?: LogContext): void {
    this.emit('log', message, context);
  }
  error(message: unknown, context?: LogContext): void {
    this.emit('error', message, context);
  }
  warn(message: unknown, context?: LogContext): void {
    this.emit('warn', message, context);
  }
  debug(message: unknown, context?: LogContext): void {
    this.emit('debug', message, context);
  }
  verbose(message: unknown, context?: LogContext): void {
    this.emit('verbose', message, context);
  }
  fatal(message: unknown, context?: LogContext): void {
    this.emit('fatal', message, context);
  }

  /** Allow flushing on shutdown (best-effort; stdout is async by default). */
  async flush(): Promise<void> {
    // no-op for now; placeholder for stream-flush when wired to a sink.
  }

  /** Whether a given level is currently emitted — used by callers/tests. */
  isLevelEnabled(level: LogLevel): boolean {
    return this.enabled.has(level);
  }

  /** Avoid leaking sensitive values in production logs. */
  redact(value: unknown): string {
    return this.isProd ? '[REDACTED]' : safeStringify(value);
  }
}

function safeStringify(value: unknown): string {
  if (value instanceof Error) {
    return value.stack ?? `${value.name}: ${value.message}`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export const structuredLogger = new StructuredLogger();
