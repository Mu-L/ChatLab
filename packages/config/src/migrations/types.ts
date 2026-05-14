/**
 * Migration Runner 类型定义
 */

export interface Logger {
  info(category: string, message: string, ...args: unknown[]): void
  warn(category: string, message: string, ...args: unknown[]): void
  error(category: string, message: string, ...args: unknown[]): void
}

export interface MigrationContext {
  /** ~/.chatlab */
  dataDir: string
  /** ~/.chatlab/ai */
  aiDataDir: string
  logger: Logger
}

export interface Migration {
  /** 迁移后的目标版本号（单调递增） */
  version: number
  /** 迁移名称（用于日志） */
  name: string
  /** 迁移描述 */
  description: string
  /** 执行迁移（须幂等） */
  up(context: MigrationContext): Promise<void>
}
