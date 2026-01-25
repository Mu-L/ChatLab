/**
 * AI 对话 Composable
 * 封装 AI 对话的核心逻辑（基于 Agent + Function Calling）
 */

import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { usePromptStore } from '@/stores/prompt'
import { useSessionStore } from '@/stores/session'

// 工具调用记录
export interface ToolCallRecord {
  name: string
  displayName: string
  status: 'running' | 'done' | 'error'
  timestamp: number
  /** 工具调用参数（如搜索关键词等） */
  params?: Record<string, unknown>
}

export interface ToolBlockContent {
  name: string
  displayName: string
  status: 'running' | 'done' | 'error'
  params?: Record<string, unknown>
}

// 内容块类型（用于 AI 消息的流式混合渲染）
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'think'; tag: string; text: string; durationMs?: number } // 思考内容块
  | {
      type: 'tool'
      tool: ToolBlockContent
    }

// 消息类型
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  dataSource?: {
    toolsUsed: string[]
    toolRounds: number
  }
  /** @deprecated 使用 contentBlocks 替代 */
  toolCalls?: ToolCallRecord[]
  /** AI 消息的内容块数组（按时序排列的文本和工具调用） */
  contentBlocks?: ContentBlock[]
  isStreaming?: boolean
}

// 搜索结果消息类型（保留用于数据源面板）
export interface SourceMessage {
  id: number
  senderName: string
  senderPlatformId: string
  content: string
  timestamp: number
  type: number
}

// 工具状态类型
export interface ToolStatus {
  name: string
  displayName: string
  status: 'running' | 'done' | 'error'
  result?: unknown
}

// Token 使用量类型
export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

// 工具名称多语言映射
const TOOL_DISPLAY_NAMES_I18N: Record<string, Record<string, string>> = {
  'zh-CN': {
    search_messages: '搜索聊天记录',
    get_recent_messages: '获取最近消息',
    get_member_stats: '获取成员统计',
    get_time_stats: '获取时间分布',
    get_group_members: '获取成员列表',
    get_member_name_history: '获取昵称历史',
    get_conversation_between: '获取对话记录',
    get_message_context: '获取上下文',
    semantic_search_messages: '🔍 语义搜索',
  },
  'en-US': {
    search_messages: 'Search Messages',
    get_recent_messages: 'Get Recent Messages',
    get_member_stats: 'Get Member Stats',
    get_time_stats: 'Get Time Stats',
    get_group_members: 'Get Members',
    get_member_name_history: 'Get Nickname History',
    get_conversation_between: 'Get Conversation',
    get_message_context: 'Get Message Context',
    semantic_search_messages: '🔍 Semantic Search',
  },
}

// 获取工具显示名称
function getToolDisplayName(toolName: string, locale: string): string {
  const names = TOOL_DISPLAY_NAMES_I18N[locale] || TOOL_DISPLAY_NAMES_I18N['zh-CN']
  return names[toolName] || toolName
}

/** Owner 信息类型 */
interface OwnerInfo {
  platformId: string
  displayName: string
}

export function useAIChat(
  sessionId: string,
  timeFilter?: { startTs: number; endTs: number },
  chatType: 'group' | 'private' = 'group',
  locale: string = 'zh-CN'
) {
  // 获取 chat store 中的提示词配置和全局设置
  const promptStore = usePromptStore()
  const sessionStore = useSessionStore()
  const { activePreset, aiGlobalSettings } = storeToRefs(promptStore)

  // 获取当前聊天类型对应的提示词配置（使用统一的激活预设）
  const currentPromptConfig = computed(() => {
    return {
      roleDefinition: activePreset.value.roleDefinition,
      responseRules: activePreset.value.responseRules,
    }
  })

  // 状态
  const messages = ref<ChatMessage[]>([])
  const sourceMessages = ref<SourceMessage[]>([])
  const currentKeywords = ref<string[]>([])
  const isLoadingSource = ref(false)
  const isAIThinking = ref(false)
  const currentConversationId = ref<string | null>(null)

  // Owner 信息（用于告诉 AI 当前用户是谁）
  const ownerInfo = ref<OwnerInfo | undefined>(undefined)

  // 工具调用状态
  const currentToolStatus = ref<ToolStatus | null>(null)
  const toolsUsedInCurrentRound = ref<string[]>([])

  // Token 使用量（当前会话累计）
  const sessionTokenUsage = ref<TokenUsage>({ promptTokens: 0, completionTokens: 0, totalTokens: 0 })

  // 初始化：获取 Owner 信息
  async function initOwnerInfo() {
    const ownerId = sessionStore.currentSession?.ownerId
    if (!ownerId) {
      ownerInfo.value = undefined
      return
    }

    try {
      // 获取成员列表，找到 owner 的显示名称
      const members = await window.chatApi.getMembers(sessionId)
      const ownerMember = members.find((m) => m.platformId === ownerId)
      if (ownerMember) {
        ownerInfo.value = {
          platformId: ownerId,
          displayName: ownerMember.groupNickname || ownerMember.accountName || ownerId,
        }
        console.log('[AI] Owner 信息已加载:', ownerInfo.value)
      }
    } catch (error) {
      console.error('[AI] 获取 Owner 信息失败:', error)
      ownerInfo.value = undefined
    }
  }

  // 初始化时加载 Owner 信息
  initOwnerInfo()

  // 中止控制
  let isAborted = false
  // 当前请求 ID，用于区分不同请求的响应
  let currentRequestId = ''
  // 当前 Agent 请求 ID，用于中止请求
  let currentAgentRequestId = ''

  // 生成消息 ID
  function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  /**
   * 发送消息（使用 Agent + Function Calling）
   */
  async function sendMessage(content: string): Promise<void> {
    console.log('[AI] ====== 开始处理用户消息 ======')
    console.log('[AI] 用户输入:', content)

    if (!content.trim() || isAIThinking.value) {
      console.log('[AI] 跳过：内容为空或正在思考')
      return
    }

    // 检查是否已配置 LLM
    console.log('[AI] 检查 LLM 配置...')
    const hasConfig = await window.llmApi.hasConfig()
    console.log('[AI] LLM 配置状态:', hasConfig)

    if (!hasConfig) {
      console.log('[AI] 未配置 LLM，显示提示')
      messages.value.push({
        id: generateId('error'),
        role: 'assistant',
        content: '⚠️ 请先配置 AI 服务。点击左下角「设置」按钮前往「模型配置Tab」进行配置。',
        timestamp: Date.now(),
      })
      return
    }

    // 添加用户消息（包含工具调用记录）
    const userMessage: ChatMessage = {
      id: generateId('user'),
      role: 'user',
      content,
      timestamp: Date.now(),
      toolCalls: [], // 工具调用会在这里更新
    }
    messages.value.push(userMessage)
    console.log('[AI] 已添加用户消息')

    // 开始处理
    isAIThinking.value = true
    isLoadingSource.value = true
    currentToolStatus.value = null
    toolsUsedInCurrentRound.value = []
    isAborted = false
    // 生成新的请求 ID
    currentRequestId = generateId('req')
    const thisRequestId = currentRequestId
    console.log('[AI] 开始 Agent 处理...', { requestId: thisRequestId })

    // 创建 AI 响应消息占位符（使用 contentBlocks 数组）
    const aiMessageId = generateId('ai')
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      contentBlocks: [], // 初始化内容块数组
    }
    messages.value.push(aiMessage)
    const aiMessageIndex = messages.value.length - 1
    let hasStreamError = false

    // 辅助函数：更新 AI 消息
    const updateAIMessage = (updates: Partial<ChatMessage>) => {
      messages.value[aiMessageIndex] = {
        ...messages.value[aiMessageIndex],
        ...updates,
      }
    }

    // 辅助函数：获取或创建当前文本块
    const appendTextToBlocks = (text: string) => {
      if (!text) return
      const blocks = messages.value[aiMessageIndex].contentBlocks || []
      const lastBlock = blocks[blocks.length - 1]

      if (text.trim().length === 0 && (!lastBlock || lastBlock.type !== 'text')) {
        // 纯空白且没有可追加的文本块时，避免创建空块
        return
      }

      if (lastBlock && lastBlock.type === 'text') {
        // 追加到现有文本块
        lastBlock.text += text
      } else {
        // 创建新文本块
        blocks.push({ type: 'text', text })
      }

      updateAIMessage({
        contentBlocks: [...blocks],
        content: messages.value[aiMessageIndex].content + text, // 同时更新 content 用于向后兼容和数据库存储
      })
    }

    // 辅助函数：追加思考块（单独渲染，不写入 content）
    const appendThinkToBlocks = (text: string, tag?: string, durationMs?: number) => {
      if (!text && durationMs === undefined) return
      const blocks = messages.value[aiMessageIndex].contentBlocks || []
      const thinkTag = tag || 'think'
      const lastBlock = blocks[blocks.length - 1]

      if (
        text.trim().length === 0 &&
        durationMs === undefined &&
        (!lastBlock || lastBlock.type !== 'think' || lastBlock.tag !== thinkTag)
      ) {
        // 纯空白且没有可追加的思考块时，避免创建空块
        return
      }

      let targetBlock = lastBlock
      if (lastBlock && lastBlock.type === 'think' && lastBlock.tag === thinkTag) {
        lastBlock.text += text
      } else if (text.trim().length > 0) {
        targetBlock = { type: 'think', tag: thinkTag, text }
        blocks.push(targetBlock)
      } else if (durationMs !== undefined) {
        // 仅更新耗时时，向前查找最近的同标签思考块
        for (let i = blocks.length - 1; i >= 0; i--) {
          const block = blocks[i]
          if (block.type === 'think' && block.tag === thinkTag) {
            targetBlock = block
            break
          }
        }
      }

      if (durationMs !== undefined && targetBlock && targetBlock.type === 'think') {
        targetBlock.durationMs = durationMs
      }

      updateAIMessage({ contentBlocks: [...blocks] })
    }

    // 辅助函数：添加工具块
    const addToolBlock = (toolName: string, params?: Record<string, unknown>) => {
      const blocks = messages.value[aiMessageIndex].contentBlocks || []
      blocks.push({
        type: 'tool',
        tool: {
          name: toolName,
          displayName: getToolDisplayName(toolName, locale),
          status: 'running',
          params,
        },
      })
      updateAIMessage({ contentBlocks: [...blocks] })
    }

    // 辅助函数：更新工具块状态
    const updateToolBlockStatus = (toolName: string, status: 'done' | 'error') => {
      const blocks = messages.value[aiMessageIndex].contentBlocks || []
      // 找到最后一个匹配的 running 状态的工具块
      for (let i = blocks.length - 1; i >= 0; i--) {
        const block = blocks[i]
        if (block.type === 'tool' && block.tool.name === toolName && block.tool.status === 'running') {
          block.tool.status = status
          break
        }
      }
      updateAIMessage({ contentBlocks: [...blocks] })
    }

    try {
      // 调用 Agent API
      // 注意：ownerInfo 需要深拷贝为普通对象，否则 IPC 克隆会失败
      const context = {
        sessionId,
        timeFilter: timeFilter ? { startTs: timeFilter.startTs, endTs: timeFilter.endTs } : undefined,
        maxMessagesLimit: aiGlobalSettings.value.maxMessagesPerRequest,
        ownerInfo: ownerInfo.value
          ? { platformId: ownerInfo.value.platformId, displayName: ownerInfo.value.displayName }
          : undefined,
      }

      console.log('[AI] 构建 context:', {
        sessionId,
        maxMessagesLimit: context.maxMessagesLimit,
        ownerInfo: context.ownerInfo,
        aiGlobalSettings: aiGlobalSettings.value,
      })

      // 收集历史消息（排除当前用户消息和 AI 占位消息）
      // 应用历史轮数限制：每轮 = 用户提问 + AI 回复 = 2 条消息
      const maxHistoryRounds = aiGlobalSettings.value.maxHistoryRounds ?? 5
      const maxHistoryMessages = maxHistoryRounds * 2

      const historyMessages = messages.value
        .slice(0, -2) // 排除刚添加的用户消息和 AI 占位消息
        .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
        .filter((msg) => msg.content && msg.content.trim() !== '') // 排除空消息
        .slice(-maxHistoryMessages) // 只保留最近 N 轮对话
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }))

      console.log('[AI] 调用 Agent API...', {
        context,
        historyLength: historyMessages.length,
        chatType,
        promptConfig: currentPromptConfig.value,
      })

      // 获取 requestId 和 promise（传递历史消息、聊天类型、提示词配置和语言设置）
      const { requestId: agentReqId, promise: agentPromise } = window.agentApi.runStream(
        content,
        context,
        (chunk) => {
          // 如果已中止或请求 ID 不匹配，忽略后续 chunks
          if (isAborted || thisRequestId !== currentRequestId) {
            console.log('[AI] 已中止或请求已过期，忽略 chunk', {
              isAborted,
              thisRequestId,
              currentRequestId,
            })
            return
          }

          // 只在工具调用时记录，减少日志噪音
          if (chunk.type === 'tool_start' || chunk.type === 'tool_result') {
            console.log('[AI] Agent chunk:', chunk.type, chunk.toolName)
          }

          switch (chunk.type) {
            case 'content':
              // 流式内容更新 - 追加到 contentBlocks
              if (chunk.content) {
                currentToolStatus.value = null
                appendTextToBlocks(chunk.content)
              }
              break

            case 'think':
              // 思考内容 - 写入思考块
              if (chunk.content) {
                appendThinkToBlocks(chunk.content, chunk.thinkTag)
              } else if (chunk.thinkDurationMs !== undefined) {
                appendThinkToBlocks('', chunk.thinkTag, chunk.thinkDurationMs)
              }
              break

            case 'tool_start':
              // 工具开始执行 - 添加工具块到 contentBlocks
              console.log('[AI] 工具开始执行:', chunk.toolName, chunk.toolParams)
              if (chunk.toolName) {
                const toolParams = chunk.toolParams as Record<string, unknown> | undefined
                currentToolStatus.value = {
                  name: chunk.toolName,
                  displayName: getToolDisplayName(chunk.toolName, locale),
                  status: 'running',
                }
                toolsUsedInCurrentRound.value.push(chunk.toolName)

                // 添加工具块到 AI 消息的 contentBlocks
                addToolBlock(chunk.toolName, toolParams)
              }
              break

            case 'tool_result':
              // 工具执行结果 - 更新工具块状态
              console.log('[AI] 工具执行结果:', chunk.toolName, chunk.toolResult)
              if (chunk.toolName) {
                if (currentToolStatus.value?.name === chunk.toolName) {
                  currentToolStatus.value = {
                    ...currentToolStatus.value,
                    status: 'done',
                  }
                }
                // 更新 contentBlocks 中的工具块状态
                updateToolBlockStatus(chunk.toolName, 'done')
              }
              isLoadingSource.value = false
              break

            case 'done':
              // 完成 - 更新 Token 使用量
              console.log('[AI] Agent 完成', chunk.usage)
              currentToolStatus.value = null
              // 更新会话累计 Token（流式响应在最后一个 chunk 返回 usage）
              if (chunk.usage) {
                sessionTokenUsage.value = {
                  promptTokens: sessionTokenUsage.value.promptTokens + chunk.usage.promptTokens,
                  completionTokens: sessionTokenUsage.value.completionTokens + chunk.usage.completionTokens,
                  totalTokens: sessionTokenUsage.value.totalTokens + chunk.usage.totalTokens,
                }
                console.log('[AI] Token 使用量更新:', sessionTokenUsage.value)
              }
              break

            case 'error':
              // 错误
              console.error('[AI] Agent 错误:', chunk.error)
              if (currentToolStatus.value) {
                currentToolStatus.value = {
                  ...currentToolStatus.value,
                  status: 'error',
                }
                // 更新对应工具块状态为错误
                updateToolBlockStatus(currentToolStatus.value.name, 'error')
              }
              if (!hasStreamError) {
                hasStreamError = true
                const errorMessage = chunk.error || '未知错误'
                // 提前将错误显示给用户，避免无反馈
                appendTextToBlocks(`\n\n❌ 处理失败：${errorMessage}`)
                updateAIMessage({ isStreaming: false })
              }
              break
          }
        },
        historyMessages,
        chatType,
        // 确保传递纯对象，避免 IPC 克隆失败
        {
          roleDefinition: currentPromptConfig.value.roleDefinition,
          responseRules: currentPromptConfig.value.responseRules,
        },
        locale
      )

      // 存储 Agent 请求 ID（用于中止）
      currentAgentRequestId = agentReqId
      console.log('[AI] Agent 请求已启动，agentReqId:', agentReqId)

      // 等待 Agent 完成
      const result = await agentPromise
      console.log('[AI] Agent 返回结果:', result)

      // 如果请求已过期，不更新
      if (thisRequestId !== currentRequestId) {
        console.log('[AI] 请求已过期，跳过结果处理')
        return
      }

      if (result.success && result.result) {
        // 更新消息的 dataSource
        messages.value[aiMessageIndex] = {
          ...messages.value[aiMessageIndex],
          dataSource: {
            toolsUsed: result.result.toolsUsed,
            toolRounds: result.result.toolRounds,
          },
          isStreaming: false,
        }

        // 保存对话到数据库
        console.log('[AI] 保存对话...')
        await saveConversation(userMessage, messages.value[aiMessageIndex])
        console.log('[AI] 对话已保存')
      } else {
        // 处理错误
        const errorText = `❌ 处理失败：${result.error || '未知错误'}`
        if (!hasStreamError) {
          // 只在未展示过错误时追加
          appendTextToBlocks(`\n\n${errorText}`)
        }
        messages.value[aiMessageIndex] = {
          ...messages.value[aiMessageIndex],
          isStreaming: false,
        }
      }

      console.log('[AI] ====== 处理完成 ======')
    } catch (error) {
      console.error('[AI] ====== 处理失败 ======')
      console.error('[AI] 错误:', error)

      messages.value[aiMessageIndex] = {
        ...messages.value[aiMessageIndex],
        content: `❌ 处理失败：${error instanceof Error ? error.message : '未知错误'}

请检查：
- 网络连接是否正常
- API Key 是否有效
- 配置是否正确`,
        isStreaming: false,
      }
    } finally {
      isAIThinking.value = false
      isLoadingSource.value = false
    }
  }

  /**
   * 保存对话到数据库
   */
  async function saveConversation(userMsg: ChatMessage, aiMsg: ChatMessage): Promise<void> {
    console.log('[AI] saveConversation 调用')

    try {
      // 如果没有当前对话，创建新对话
      if (!currentConversationId.value) {
        const title = userMsg.content.slice(0, 50) + (userMsg.content.length > 50 ? '...' : '')
        const conversation = await window.aiApi.createConversation(sessionId, title)
        currentConversationId.value = conversation.id
        console.log('[AI] 创建了新对话:', conversation.id)
      }

      // 保存用户消息
      await window.aiApi.addMessage(currentConversationId.value, 'user', userMsg.content)

      // 保存 AI 消息（包含 contentBlocks）
      // 注意：需要深拷贝 contentBlocks 以确保可序列化（避免 Vue 响应式代理对象）
      const serializableContentBlocks = aiMsg.contentBlocks
        ? JSON.parse(JSON.stringify(aiMsg.contentBlocks))
        : undefined
      console.log('[AI] 保存 AI 消息:', {
        contentLength: aiMsg.content?.length,
        hasContentBlocks: !!serializableContentBlocks,
        contentBlocksLength: serializableContentBlocks?.length,
      })
      await window.aiApi.addMessage(
        currentConversationId.value,
        'assistant',
        aiMsg.content,
        undefined, // 不再保存关键词
        undefined,
        serializableContentBlocks // 保存内容块（已序列化）
      )
      console.log('[AI] 消息保存完成')
    } catch (error) {
      console.error('[AI] 保存对话失败：', error)
    }
  }

  /**
   * 加载对话历史
   */
  async function loadConversation(conversationId: string): Promise<void> {
    console.log('[AI] 加载对话历史，conversationId:', conversationId)
    try {
      const history = await window.aiApi.getMessages(conversationId)
      currentConversationId.value = conversationId

      console.log(
        '[AI] 从数据库加载的原始消息:',
        history.map((m) => ({
          id: m.id,
          role: m.role,
          contentLength: m.content?.length,
          hasContentBlocks: !!m.contentBlocks,
          contentBlocksLength: m.contentBlocks?.length,
        }))
      )

      messages.value = history.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp * 1000,
        // 加载保存的 contentBlocks（如果有）
        contentBlocks: msg.contentBlocks as ContentBlock[] | undefined,
      }))
      console.log('[AI] 加载完成，messages.value 数量:', messages.value.length)
    } catch (error) {
      console.error('[AI] 加载对话历史失败：', error)
    }
  }

  /**
   * 创建新对话
   */
  function startNewConversation(welcomeMessage?: string): void {
    currentConversationId.value = null
    messages.value = []
    sourceMessages.value = []
    currentKeywords.value = []
    // 重置 Token 计数
    sessionTokenUsage.value = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

    if (welcomeMessage) {
      messages.value.push({
        id: generateId('welcome'),
        role: 'assistant',
        content: welcomeMessage,
        timestamp: Date.now(),
      })
    }
  }

  /**
   * 加载更多搜索结果（保留兼容性，但不再主动使用）
   */
  async function loadMoreSourceMessages(): Promise<void> {
    // Agent 模式下暂不支持加载更多
  }

  /**
   * 更新配置（保留兼容性）
   */
  async function updateMaxMessages(): Promise<void> {
    // Agent 模式下由工具自行控制
  }

  /**
   * 停止生成
   */
  async function stopGeneration(): Promise<void> {
    if (!isAIThinking.value) return

    console.log('[AI] 用户停止生成')
    isAborted = true
    isAIThinking.value = false
    isLoadingSource.value = false
    currentToolStatus.value = null

    // 调用主进程中止 Agent 请求
    if (currentAgentRequestId) {
      console.log('[AI] 中止 Agent 请求:', currentAgentRequestId)
      try {
        await window.agentApi.abort(currentAgentRequestId)
        console.log('[AI] Agent 请求已中止')
      } catch (error) {
        console.error('[AI] 中止 Agent 请求失败:', error)
      }
      currentAgentRequestId = ''
    }

    // 标记最后一条 AI 消息为已完成
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
      lastMessage.isStreaming = false
      lastMessage.content += '\n\n_（已停止生成）_'
    }
  }

  return {
    // 状态
    messages,
    sourceMessages,
    currentKeywords,
    isLoadingSource,
    isAIThinking,
    currentConversationId,
    currentToolStatus,
    toolsUsedInCurrentRound,
    sessionTokenUsage,

    // 方法
    sendMessage,
    loadConversation,
    startNewConversation,
    loadMoreSourceMessages,
    updateMaxMessages,
    stopGeneration,
  }
}
