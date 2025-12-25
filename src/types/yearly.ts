export interface YearlyReportData {
  year: number
  // Chapter 1: Overview
  overview: {
    totalMessages: number
    totalWords: number
    totalDurationMinutes: number
    messageTrend: number[] // 12 months data
    mostActiveMonth: number
    mostActiveMonthCount: number
  }
  // Chapter 2: Night Owl
  nightOwl: {
    lateNightCount: number // 23:00 - 05:00
    lateNightPercentage: number
    latestMessage: {
      content: string
      timestamp: number
      senderName: string
    }
  }
  // Chapter 3: Keywords & Emojis
  keywords: {
    wordCloud: Array<{ text: string; value: number }>
    topEmojis: Array<{ char: string; count: number; sender: 'me' | 'other' }>
  }
  // Chapter 4: Emotions
  emotions: {
    laughterCount: number // "哈哈" count
    laughterSenderRatio: number // 0-1, my percentage
  }
  // Chapter 5: AI Summary
  aiSummary: {
    keywords: string[]
    summary: string
    highlightDate: number
    highlightEvent: string
  }
  // Meta
  partnerName: string
  myAvatar?: string
  partnerAvatar?: string
}
