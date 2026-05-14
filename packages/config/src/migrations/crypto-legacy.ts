/**
 * Legacy crypto 解密模块（仅用于迁移）
 *
 * 从 electron/main/ai/llm/crypto.ts + device-key.ts 提取，
 * 不依赖 Electron API，可在 CLI 和 Electron 中共用。
 */

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { createDecipheriv, createHash } from 'crypto'
import { execSync } from 'child_process'

const ENCRYPTED_PREFIX = 'enc:'
const ALGORITHM = 'aes-256-gcm'
const SALT = 'chatlab-api-key-encryption-v1'
const DEVICE_KEY_FILE = '.device-key'

export function isEncrypted(value: string): boolean {
  return value?.startsWith(ENCRYPTED_PREFIX) ?? false
}

function readKeyFromFile(keyPath: string): string | null {
  try {
    if (fs.existsSync(keyPath)) {
      const key = fs.readFileSync(keyPath, 'utf-8').trim()
      if (key.length >= 32) return key
    }
  } catch {
    // ignore
  }
  return null
}

function getAllDeviceKeyPaths(): string[] {
  const home = os.homedir()
  const paths = [path.join(home, '.chatlab', DEVICE_KEY_FILE)]

  if (process.platform === 'darwin') {
    paths.push(path.join(home, 'Library', 'Application Support', 'ChatLab', 'data', DEVICE_KEY_FILE))
  } else if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming')
    paths.push(path.join(appData, 'ChatLab', 'data', DEVICE_KEY_FILE))
  } else {
    paths.push(path.join(home, '.config', 'ChatLab', 'data', DEVICE_KEY_FILE))
  }

  return paths
}

function getAllDeviceKeys(): string[] {
  const keys: string[] = []
  const seen = new Set<string>()
  for (const p of getAllDeviceKeyPaths()) {
    const k = readKeyFromFile(p)
    if (k && !seen.has(k)) {
      seen.add(k)
      keys.push(k)
    }
  }
  return keys
}

function deriveLegacyKeys(): Buffer[] {
  const keys: Buffer[] = []
  try {
    let cmd: string | null = null
    if (process.platform === 'linux') {
      cmd = '( cat /var/lib/dbus/machine-id /etc/machine-id 2> /dev/null || hostname ) | head -n 1 || :'
    } else if (process.platform === 'darwin') {
      cmd = 'ioreg -rd1 -c IOPlatformExpertDevice'
    } else if (process.platform === 'win32') {
      cmd = 'REG.exe QUERY HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid'
    }

    if (cmd) {
      const raw = execSync(cmd).toString()
      let machineId: string
      if (process.platform === 'darwin') {
        machineId =
          raw
            .split('IOPlatformUUID')[1]
            ?.split('\n')[0]
            ?.replace(/[=\s"]/g, '')
            ?.toLowerCase() || ''
      } else if (process.platform === 'win32') {
        machineId =
          raw
            .split('REG_SZ')[1]
            ?.replace(/[\r\n\s]/g, '')
            ?.toLowerCase() || ''
      } else {
        machineId = raw.replace(/[\r\n\s]/g, '').toLowerCase()
      }

      if (machineId) {
        const hashed = createHash('sha256').update(machineId).digest('hex')
        keys.push(
          createHash('sha256')
            .update(hashed + SALT)
            .digest()
        )
      }
    }
  } catch {
    // ignore
  }

  keys.push(
    createHash('sha256')
      .update('chatlab-fallback-key' + SALT)
      .digest()
  )
  return keys
}

function tryDecryptWithKey(encrypted: string, key: Buffer): string | null {
  try {
    const parts = encrypted.slice(ENCRYPTED_PREFIX.length).split(':')
    if (parts.length !== 3) return null

    const [ivBase64, authTagBase64, ciphertext] = parts
    const iv = Buffer.from(ivBase64, 'base64')
    const authTag = Buffer.from(authTagBase64, 'base64')

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return null
  }
}

/**
 * 解密旧加密 API Key，尝试所有可用的 device key 和 legacy machine-id 密钥
 */
export function decryptApiKey(encrypted: string): string {
  if (!encrypted || !isEncrypted(encrypted)) return encrypted || ''

  for (const dk of getAllDeviceKeys()) {
    const derived = createHash('sha256')
      .update(dk + SALT)
      .digest()
    const result = tryDecryptWithKey(encrypted, derived)
    if (result !== null) return result
  }

  for (const legacyKey of deriveLegacyKeys()) {
    const result = tryDecryptWithKey(encrypted, legacyKey)
    if (result !== null) return result
  }

  return ''
}
