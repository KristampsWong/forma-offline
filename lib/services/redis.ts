import Redis from "ioredis"
import { isBuildTime } from "@/lib/env"

interface SetOptions {
  ex?: number
  nx?: boolean
}

interface RedisWrapper {
  get(key: string): Promise<string | null>
  set(key: string, value: string, options?: SetOptions): Promise<string | null>
  del(...keys: string[]): Promise<number>
  ttl(key: string): Promise<number>
}

let redis: RedisWrapper

if (!isBuildTime()) {
  const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379")

  redis = {
    get: (key) => client.get(key),
    set: async (key, value, options) => {
      if (options?.ex && options?.nx) {
        return client.set(key, value, "EX", options.ex, "NX")
      }
      if (options?.ex) {
        return client.set(key, value, "EX", options.ex)
      }
      if (options?.nx) {
        return client.set(key, value, "NX")
      }
      return client.set(key, value)
    },
    del: (...keys) => client.del(...keys),
    ttl: (key) => client.ttl(key),
  }
} else {
  redis = {} as RedisWrapper
}

export { redis }
