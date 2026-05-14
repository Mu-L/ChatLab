/**
 * 工具适配层
 *
 * 将 @openchatlab/tools 的 ToolDefinition 适配为 @mariozechner/pi-agent-core 的 AgentTool 格式。
 */

import type { AgentTool, AgentToolResult } from '@mariozechner/pi-agent-core'
import type { ToolDefinition, ToolExecutionContext } from '@openchatlab/tools'
import type { DatabaseAdapter } from '@openchatlab/core'

export interface ServerToolContext {
  db: DatabaseAdapter
  sessionId: string
  locale?: string
}

function convertJsonSchemaToParameters(schema: ToolDefinition['inputSchema']) {
  const properties: Record<string, unknown> = {}
  for (const [key, prop] of Object.entries(schema.properties)) {
    properties[key] = { ...prop }
  }
  return {
    type: 'object' as const,
    properties,
    required: schema.required || [],
  }
}

export function adaptToolsForAgent(
  tools: ToolDefinition[],
  getContext: () => ServerToolContext
): AgentTool<any, any>[] {
  return tools.map((tool) => ({
    name: tool.name,
    label: tool.name,
    description: tool.description,
    parameters: convertJsonSchemaToParameters(tool.inputSchema) as any,
    async execute(_toolCallId: string, params: Record<string, unknown>): Promise<AgentToolResult<unknown>> {
      const ctx = getContext()
      const execCtx: ToolExecutionContext = {
        db: ctx.db,
        sessionId: ctx.sessionId,
        locale: ctx.locale,
      }
      try {
        const result = tool.handler(params, execCtx)
        return { content: [{ type: 'text', text: result.content }], details: null }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        return { content: [{ type: 'text', text: `Error: ${msg}` }], details: null }
      }
    },
  }))
}
