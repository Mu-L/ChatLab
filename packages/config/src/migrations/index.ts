/**
 * Migration Runner 导出
 *
 * ALL_MIGRATIONS 按版本号排列，由 MigrationRunner 在应用启动时执行。
 */

export { MigrationRunner } from './runner'
export type { Migration, MigrationContext, Logger } from './types'

import { m001LegacyToMultiConfig } from './m001-legacy-to-multi-config'
import { m002SchemaV2 } from './m002-schema-v2'
import { m003SchemaV3 } from './m003-schema-v3'
import { m004EncryptedKeysToAuthProfiles } from './m004-encrypted-keys-to-auth-profiles'
import type { Migration } from './types'

export const ALL_MIGRATIONS: Migration[] = [
  m001LegacyToMultiConfig,
  m002SchemaV2,
  m003SchemaV3,
  m004EncryptedKeysToAuthProfiles,
]
