/**
 * WorkerDataProvider
 *
 * 基于 workerManager 的 ToolDataProvider 实现。
 * 通过 Worker IPC 异步访问 SQLite，供 Electron Agent 使用。
 */

import * as workerManager from '../../worker/workerManager'
import type {
  ToolDataProvider,
  SearchMessagesResult,
  MemberStatItem,
  SchemaTableInfo,
  TimeFilter,
} from '@openchatlab/tools'

export class WorkerDataProvider implements ToolDataProvider {
  constructor(private sessionId: string) {}

  async searchMessages(
    keywords: string[],
    options?: { timeFilter?: TimeFilter; limit?: number; senderId?: number }
  ): Promise<SearchMessagesResult> {
    const result = await workerManager.searchMessages(
      this.sessionId,
      keywords,
      options?.timeFilter,
      options?.limit ?? 50,
      0,
      options?.senderId
    )

    return {
      messages: result.messages.map((m) => ({
        id: m.id,
        senderName: m.senderName,
        senderPlatformId: m.senderPlatformId,
        content: m.content,
        timestamp: m.timestamp,
      })),
      total: result.total,
    }
  }

  async getRecentMessages(options?: { timeFilter?: TimeFilter; limit?: number }): Promise<SearchMessagesResult> {
    const result = await workerManager.getRecentMessages(this.sessionId, options?.timeFilter, options?.limit ?? 50)

    return {
      messages: result.messages.map((m) => ({
        id: m.id,
        senderName: m.senderName,
        senderPlatformId: m.senderPlatformId,
        content: m.content,
        timestamp: m.timestamp,
      })),
      total: result.total,
    }
  }

  async getMemberStats(options?: { timeFilter?: TimeFilter; top?: number }): Promise<MemberStatItem[]> {
    const top = options?.top ?? 20
    const members = await workerManager.getMemberActivity(this.sessionId, options?.timeFilter)
    return members.slice(0, top).map((m: any) => ({
      name: m.name,
      messageCount: m.messageCount,
      percentage: m.percentage,
    }))
  }

  async getTimeStats(type: 'hourly' | 'weekday' | 'daily', options?: { timeFilter?: TimeFilter }): Promise<unknown[]> {
    const filter = options?.timeFilter
    switch (type) {
      case 'weekday':
        return workerManager.getWeekdayActivity(this.sessionId, filter)
      case 'daily':
        return workerManager.getDailyActivity(this.sessionId, filter)
      case 'hourly':
      default:
        return workerManager.getHourlyActivity(this.sessionId, filter)
    }
  }

  async executeSql(sql: string): Promise<unknown> {
    return workerManager.executeRawSQL(this.sessionId, sql)
  }

  async getSchema(): Promise<SchemaTableInfo[]> {
    const tables = await workerManager.getSchema(this.sessionId)
    return tables.map((t) => ({
      name: t.name,
      sql: t.columns.map((c) => `${c.name} ${c.type}${c.pk ? ' PK' : ''}${c.notnull ? ' NOT NULL' : ''}`).join(', '),
    }))
  }
}
