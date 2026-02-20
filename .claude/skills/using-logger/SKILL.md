---
name: using-logger
description: Use when adding logging, handling errors, or using console.log in this codebase. All logging must go through lib/logger.ts — never use console.log/warn/error directly.
---

# Using Logger

## Core Rule

**Never use `console.log()`, `console.warn()`, or `console.error()` directly.** Always use `logger` from `@/lib/logger`.

The logger is environment-aware — it respects the log level set in `lib/config/index.ts`:
- **Development:** All levels shown (debug, info, warn, error)
- **Production:** Only errors shown

## Quick Reference

```ts
import { logger } from "@/lib/logger"
```

| Method | When to use | Dev | Prod | Output |
|--------|-------------|-----|------|--------|
| `logger.debug(msg, ...args)` | Detailed debugging info | Yes | No | `[DEBUG] msg` |
| `logger.info(msg, ...args)` | General information | Yes | No | `[INFO] msg` |
| `logger.warn(msg, ...args)` | Potential issues | Yes | No | `[WARN] msg` |
| `logger.error(msg, ...args)` | Actual errors | Yes | Yes | `[ERROR] msg` |
| `logger.request(method, path, details?)` | HTTP request logging | If enabled | No | `[REQUEST] GET /path` |
| `logger.test(msg, ...args)` | Test-specific logging | Always | Always | `[TEST MODE] msg` |

## Usage Patterns

### Server actions / services — error logging

```ts
import { logger } from "@/lib/logger"

export async function updateEmployee(data: FormData) {
  try {
    // ...
  } catch (error) {
    logger.error("Failed to update employee:", error)
    return { success: false, error: "Failed to update employee" }
  }
}
```

### Client components — action error logging

```ts
import { logger } from "@/lib/logger"

const result = await createEmployee(formData)
if (!result.success) {
  logger.error("Create employee failed:", result.error)
  toast.error(result.error)
}
```

### Module-scoped logger — adds a prefix to all messages

```ts
import { createModuleLogger } from "@/lib/logger"

const log = createModuleLogger("PayrollService")

log.info("Calculating payroll")   // [INFO] [PayrollService] Calculating payroll
log.error("Tax calc failed", err) // [ERROR] [PayrollService] Tax calc failed
```

Use `createModuleLogger` in service files or anywhere you want consistent prefixed logging. It exposes `debug`, `info`, `warn`, and `error` — same as `logger` but with `[ModuleName]` prefix.

## Log Level Configuration

Log level is set in `lib/config/index.ts` based on environment:

```ts
export const logging = {
  level: isDevelopment() ? "debug" : "error",
  logRequests: isDevelopment(),
} as const
```

Severity order: `debug` (0) < `info` (1) < `warn` (2) < `error` (3). A message is shown only if its level >= the configured level.

## Where Logger Is Used

| Location | What it logs |
|----------|-------------|
| `actions/company.ts` | Company CRUD errors |
| `actions/employee.ts` | Employee CRUD errors |
| `lib/auth/auth-helpers.ts` | Auth failures |
| `models/employee.ts` | SSN decryption/masking failures |
| `components/employee/add-employee-button.tsx` | Employee creation errors |
| `components/auth/google-sign-in.tsx` | Sign-in errors |
| `components/company/settings/` | Settings update errors |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `console.log("debug:", data)` | `logger.debug("debug:", data)` |
| `console.error("failed:", err)` | `logger.error("failed:", err)` |
| Using `logger.info()` for errors | Use `logger.error()` — only level shown in prod |
| No logging in catch blocks | Always `logger.error()` before returning error response |
| Verbose logging in loops | Use `logger.debug()` — hidden in prod |
