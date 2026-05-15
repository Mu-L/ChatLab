/**
 * CoreDataProvider
 *
 * 基于 @openchatlab/core 同步查询函数的 ToolDataProvider 实现。
 * 供 Server / MCP 使用，通过 DatabaseAdapter 直接访问 SQLite。
 */

import type { DatabaseAdapter } from '@openchatlab/core'
import {
  searchMessagesLike,
  getRecentMessages,
  getMemberActivity,
  getHourlyActivity,
  getWeekdayActivity,
  getDailyActivity,
  executeReadonlySql,
  getDatabaseSchema,
} from '@openchatlab/core'
import type { ToolDataProvider, SearchMessagesResult, MemberStatItem, SchemaTableInfo, TimeFilter } from '../types'

export class CoreDataProvider implements ToolDataProvider {
  constructor(private db: DatabaseAdapter) {}

  async searchMessages(
    keywords: string[],
    options?: { timeFilter?: TimeFilter; limit?: number; senderId?: number }
  ): Promise<SearchMessagesResult> {
    const keyword = keywords.join(' ')
    const result = searchMessagesLike(this.db, keyword, { limit: options?.limit ?? 50 })

    return {
      messages: result.messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.senderName,
        senderPlatformId: m.senderPlatformId,
        content: m.content,
        timestamp: m.timestamp,
      })),
      total: result.total ?? result.messages.length,
    }
  }

  async getRecentMessages(options?: { timeFilter?: TimeFilter; limit?: number }): Promise<SearchMessagesResult> {
    const messages = getRecentMessages(this.db, { limit: options?.limit ?? 50 })

    return {
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.senderName,
        senderPlatformId: m.senderPlatformId,
        content: m.content,
        timestamp: m.timestamp,
      })),
      total: messages.length,
    }
  }

  async getMemberStats(options?: { timeFilter?: TimeFilter; top?: number }): Promise<MemberStatItem[]> {
    const top = options?.top ?? 20
    const members = getMemberActivity(this.db, options?.timeFilter)
    return members.slice(0, top).map((m) => ({
      name: m.name,
      messageCount: m.messageCount,
      percentage: m.percentage,
    }))
  }

  async getTimeStats(type: 'hourly' | 'weekday' | 'daily', options?: { timeFilter?: TimeFilter }): Promise<unknown[]> {
    const filter = options?.timeFilter
    switch (type) {
      case 'weekday':
        return getWeekdayActivity(this.db, filter)
      case 'daily':
        return getDailyActivity(this.db, filter)
      case 'hourly':
      default:
        return getHourlyActivity(this.db, filter)
    }
  }

  async executeSql(sql: string): Promise<unknown> {
    return executeReadonlySql(this.db, sql)
  }

  async getSchema(): Promise<SchemaTableInfo[]> {
    return getDatabaseSchema(this.db)
  }
}
