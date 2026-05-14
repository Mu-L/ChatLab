/**
 * Migration v3→v4: 加密 API Key → auth-profiles.json
 *
 * - 从 llm-config.json 读取加密的 apiKey（enc: 前缀）
 * - 使用 device-key + legacy machine-id 尝试解密
 * - 解密成功的写入 auth-profiles.json
 * - 清空 llm-config.json 中的 apiKey 字段
 */

import * as fs from 'fs'
import * as path from 'path'
import type { Migration, MigrationContext } from './types'
import { isEncrypted, decryptApiKey } from './crypto-legacy'
import { writeAuthProfile } from '../auth-profiles'

export const m004EncryptedKeysToAuthProfiles: Migration = {
  version: 4,
  name: 'encrypted-keys-to-auth-profiles',
  description: 'Migrate encrypted API keys from llm-config.json to auth-profiles.json',

  async up(ctx: MigrationContext) {
    const configPath = path.join(ctx.aiDataDir, 'llm-config.json')
    if (!fs.existsSync(configPath)) return

    let data: Record<string, unknown>
    try {
      data = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    } catch {
      return
    }

    const configs = (data.configs as Array<Record<string, unknown>>) || []
    let migrated = false

    for (const config of configs) {
      const apiKey = config.apiKey as string
      if (!apiKey) continue

      if (isEncrypted(apiKey)) {
        const plainKey = decryptApiKey(apiKey)
        if (plainKey) {
          const provider = (config.provider as string) || 'unknown'
          const name = (config.name as string) || provider
          const profileName = name.toLowerCase().replace(/\s+/g, '-')

          writeAuthProfile(profileName, { type: 'api_key', provider, key: plainKey })
          config.apiKey = ''
          migrated = true
          ctx.logger.info('Migration', `Migrated API key for "${name}" to auth-profiles.json`)
        } else {
          ctx.logger.warn('Migration', `Failed to decrypt API key for "${config.name}", skipping`)
        }
      } else if (apiKey.length > 0) {
        const provider = (config.provider as string) || 'unknown'
        const name = (config.name as string) || provider
        const profileName = name.toLowerCase().replace(/\s+/g, '-')

        writeAuthProfile(profileName, { type: 'api_key', provider, key: apiKey })
        config.apiKey = ''
        migrated = true
        ctx.logger.info('Migration', `Migrated plaintext API key for "${name}" to auth-profiles.json`)
      }
    }

    if (migrated) {
      fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8')
      ctx.logger.info('Migration', 'Cleared API keys from llm-config.json')
    }
  },
}
