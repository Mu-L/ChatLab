/**
 * 微信默认数据库导出 JSON 格式解析器
 * 适配微信数据库直接导出的 JSON 格式（私聊）
 *
 * 格式特征：
 * - JSON 数组，每个元素是一条消息
 * - 无 metadata 头部，需从文件名提取聊天名称
 * - mesDes: 0=自己发送，1=对方发送
 * - messageType: 1=文本, 3=图片, 34=语音, 43=视频, 47=表情, 48=位置, 49=应用消息, 10000=系统
 *
 * 发送者标识：
 * - 自己：platformId = "self"
 * - 对方：platformId = 文件名（如 bingbing.json → "bingbing"）
 */

import * as fs from 'fs'
import * as path from 'path'
import { parser } from 'stream-json'
import { streamArray } from 'stream-json/streamers/StreamArray'
import { chain } from 'stream-chain'
import { KNOWN_PLATFORMS, ChatType, MessageType } from '../../../../src/types/base'
import type {
  FormatFeature,
  FormatModule,
  Parser,
  ParseOptions,
  ParseEvent,
  ParsedMeta,
  ParsedMember,
  ParsedMessage,
} from '../types'
import { getFileSize, createProgress } from '../utils'

// ==================== 辅助函数 ====================

/**
 * 从文件名提取聊天名称（对方名称）
 */
function extractNameFromFilePath(filePath: string): string {
  const basename = path.basename(filePath)
  const name = basename.replace(/\.json$/i, '')
  return name || '未知对话'
}

// ==================== 特征定义 ====================

export const feature: FormatFeature = {
  id: 'wechat-default',
  name: '微信数据库导出 (JSON)',
  platform: KNOWN_PLATFORMS.WECHAT,
  priority: 20,
  extensions: ['.json'],
  signatures: {
    // 数组结构，包含微信特有字段
    head: [/"mesDes"\s*:/, /"messageType"\s*:/, /"msgContent"\s*:/, /"ConBlob"\s*:/],
  },
}

// ==================== 微信消息结构 ====================

interface WechatMessage {
  mesDes: number // 0=自己发送，1=对方发送
  mesLocalID: number
  mesSvrID: number
  messageType: number
  msgContent: string | null
  msgCreateTime: number // Unix 时间戳（秒）
  msgImgStatus: number
  msgSeq: number
  msgSource: string | null
  msgStatus: number
  msgVoiceText: string | null
  CompressContent: string | null
  ConBlob: string | null
  IntRes1: number
  IntRes2: number
  StrRes1: string | null
  StrRes2: string | null
}

// ==================== 消息类型转换 ====================

/**
 * 从 messageType=49 的 XML 内容中提取应用消息子类型
 */
function parseAppMsgType(content: string | null): MessageType {
  if (!content) return MessageType.OTHER

  // 尝试从 XML 中提取 <type> 标签的值
  const typeMatch = content.match(/<type>(\d+)<\/type>/)
  if (!typeMatch) return MessageType.OTHER

  const appType = parseInt(typeMatch[1], 10)
  switch (appType) {
    case 5: // 链接
      return MessageType.LINK
    case 6: // 文件
      return MessageType.FILE
    case 19: // 聊天记录
      return MessageType.FORWARD
    case 33: // 小程序
    case 36: // 小程序
      return MessageType.SHARE
    case 51: // 视频号
      return MessageType.SHARE
    case 57: // 引用回复
      return MessageType.REPLY
    case 2000: // 转账
      return MessageType.TRANSFER
    case 2001: // 红包
      return MessageType.RED_PACKET
    default:
      return MessageType.SHARE // 默认作为分享处理
  }
}

/**
 * 转换微信消息类型到标准消息类型
 */
function convertMessageType(wechatType: number, content: string | null): MessageType {
  switch (wechatType) {
    case 1: // 文本
      return MessageType.TEXT
    case 3: // 图片
      return MessageType.IMAGE
    case 34: // 语音
      return MessageType.VOICE
    case 43: // 视频
      return MessageType.VIDEO
    case 47: // 表情包
      return MessageType.EMOJI
    case 48: // 位置
      return MessageType.LOCATION
    case 49: // 应用消息（需要细分）
      return parseAppMsgType(content)
    case 10000: // 系统消息
      // 检查是否是撤回消息
      if (content && content.includes('撤回')) {
        return MessageType.RECALL
      }
      return MessageType.SYSTEM
    case 10002: // 系统消息（撤回等）
      return MessageType.RECALL
    default:
      return MessageType.OTHER
  }
}

/**
 * 提取消息的纯文本内容
 * 对于 XML 格式的消息，提取其中的文本部分
 */
function extractTextContent(wechatType: number, content: string | null): string | null {
  if (!content) return null

  // 文本消息直接返回
  if (wechatType === 1) {
    return content
  }

  // 引用回复消息 (messageType=49, type=57)，提取 title 作为回复内容
  if (wechatType === 49) {
    const titleMatch = content.match(/<title>([^<]*)<\/title>/)
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1]
    }
  }

  // 系统消息直接返回
  if (wechatType === 10000 || wechatType === 10002) {
    return content
  }

  // 图片消息
  if (wechatType === 3) {
    return '[图片]'
  }

  // 语音消息
  if (wechatType === 34) {
    return '[语音]'
  }

  // 视频消息
  if (wechatType === 43) {
    return '[视频]'
  }

  // 表情包
  if (wechatType === 47) {
    return '[表情]'
  }

  // 位置
  if (wechatType === 48) {
    return '[位置]'
  }

  // 其他复杂消息，尝试提取描述
  const desMatch = content.match(/<des>([^<]*)<\/des>/)
  if (desMatch && desMatch[1]) {
    return desMatch[1]
  }

  return content.length > 200 ? `${content.substring(0, 200)}...` : content
}

// ==================== 解析器实现 ====================

async function* parseWechatDefault(options: ParseOptions): AsyncGenerator<ParseEvent, void, unknown> {
  const { filePath, batchSize = 5000, onProgress, onLog } = options

  const totalBytes = getFileSize(filePath)
  let bytesRead = 0
  let messagesProcessed = 0

  // 发送初始进度
  const initialProgress = createProgress('parsing', 0, totalBytes, 0, '开始解析...')
  yield { type: 'progress', data: initialProgress }
  onProgress?.(initialProgress)

  // 记录解析开始
  onLog?.('info', `开始解析微信导出文件，大小: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`)

  // 从文件名提取对方名称
  const otherName = extractNameFromFilePath(filePath)
  const selfPlatformId = 'self'
  const otherPlatformId = otherName

  // 成员信息
  const memberMap = new Map<string, { platformId: string; accountName: string }>()
  memberMap.set(selfPlatformId, { platformId: selfPlatformId, accountName: '我' })
  memberMap.set(otherPlatformId, { platformId: otherPlatformId, accountName: otherName })

  // 发送 meta
  const meta: ParsedMeta = {
    name: otherName,
    platform: KNOWN_PLATFORMS.WECHAT,
    type: ChatType.PRIVATE,
  }
  yield { type: 'meta', data: meta }

  // 消息批次收集器
  const messageBatch: ParsedMessage[] = []

  // 流式解析
  await new Promise<void>((resolve, reject) => {
    const readStream = fs.createReadStream(filePath, { encoding: 'utf-8' })

    readStream.on('data', (chunk: string | Buffer) => {
      bytesRead += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length
    })

    const pipeline = chain([readStream, parser(), streamArray()])

    pipeline.on('data', ({ value }: { value: WechatMessage }) => {
      const msg = value

      // 数据验证
      if (msg.msgCreateTime === undefined || msg.msgCreateTime === null) {
        return
      }
      if (msg.messageType === undefined || msg.messageType === null) {
        return
      }

      // 确定发送者
      const isFromSelf = msg.mesDes === 0
      const senderPlatformId = isFromSelf ? selfPlatformId : otherPlatformId
      const senderAccountName = isFromSelf ? '我' : otherName

      // 转换消息类型
      const type = convertMessageType(msg.messageType, msg.msgContent)

      // 提取文本内容
      const content = extractTextContent(msg.messageType, msg.msgContent)

      messageBatch.push({
        senderPlatformId,
        senderAccountName,
        timestamp: msg.msgCreateTime,
        type,
        content,
      })

      messagesProcessed++

      // 每处理 1000 条更新进度
      if (messagesProcessed % 1000 === 0) {
        const progress = createProgress(
          'parsing',
          bytesRead,
          totalBytes,
          messagesProcessed,
          `已处理 ${messagesProcessed} 条消息...`
        )
        onProgress?.(progress)
      }
    })

    pipeline.on('end', resolve)
    pipeline.on('error', reject)
  })

  // 发送成员
  const members: ParsedMember[] = Array.from(memberMap.values()).map((m) => ({
    platformId: m.platformId,
    accountName: m.accountName,
  }))
  yield { type: 'members', data: members }

  // 分批发送消息
  for (let i = 0; i < messageBatch.length; i += batchSize) {
    const batch = messageBatch.slice(i, i + batchSize)
    yield { type: 'messages', data: batch }
  }

  // 完成
  const doneProgress = createProgress('done', totalBytes, totalBytes, messagesProcessed, '解析完成')
  yield { type: 'progress', data: doneProgress }
  onProgress?.(doneProgress)

  // 记录解析摘要
  onLog?.('info', `解析完成: ${messagesProcessed} 条消息, ${memberMap.size} 个成员`)

  yield {
    type: 'done',
    data: { messageCount: messagesProcessed, memberCount: memberMap.size },
  }
}

// ==================== 导出解析器 ====================

export const parser_: Parser = {
  feature,
  parse: parseWechatDefault,
}

// ==================== 导出格式模块 ====================

const module_: FormatModule = {
  feature,
  parser: parser_,
}

export default module_

