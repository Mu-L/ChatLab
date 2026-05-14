/**
 * Migration v1→v2: Schema v2 升级
 *
 * - 移除 configs 中的 disableThinking / isReasoningModel 字段
 * - 更新 schemaVersion 为 2
 *
 * 注意：原 Electron 版还包含自定义 provider/model 创建逻辑，
 * 该逻辑依赖 Electron-specific 模块，在共享 migration 中跳过。
 * Electron 端在 loadConfigStore 中已有回退处理。
 */

import * as fs from 'fs'
import * as path from 'path'
import type { Migration, MigrationContext } from './types'

export const m002SchemaV2: Migration = {
  version: 2,
  name: 'schema-v2',
  description: 'Upgrade LLM config to schema v2 (remove deprecated fields)',

  async up(ctx: MigrationContext) {
    const configPath = path.join(ctx.aiDataDir, 'llm-config.json')
    if (!fs.existsSync(configPath)) return

    let data: Record<string, unknown>
    try {
      data = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    } catch {
      return
    }

    const schemaVersion = (data.schemaVersion as number) || 0
    if (schemaVersion >= 2) return

    ctx.logger.info('Migration', 'Upgrading LLM config to schema v2')

    const configs = (data.configs as Record<string, unknown>[]) || []
    const cleanedConfigs = configs.map((c) => {
      const { disableThinking: _dt, isReasoningModel: _rm, ...rest } = c
      return rest
    })

    data.configs = cleanedConfigs
    data.schemaVersion = 2

    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8')
  },
}
