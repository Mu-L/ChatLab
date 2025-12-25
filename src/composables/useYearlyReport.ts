import { ref, computed } from 'vue'
import type { YearlyReportData } from '@/types/yearly'

const isYearlyReportOpen = ref(false)
const currentSlideIndex = ref(0)

// Mock Data
const mockData: YearlyReportData = {
  year: 2025,
  overview: {
    totalMessages: 12580,
    totalWords: 450000,
    totalDurationMinutes: 3200,
    messageTrend: [120, 300, 450, 800, 600, 900, 1200, 1500, 1100, 1300, 1800, 2410],
    mostActiveMonth: 12,
    mostActiveMonthCount: 2410,
  },
  nightOwl: {
    lateNightCount: 342,
    lateNightPercentage: 15,
    latestMessage: {
      content: '睡了，晚安，明天还要早起搬砖呢...',
      timestamp: 1735154100000, // 2024-12-26 03:15:00
      senderName: '我',
    },
  },
  keywords: {
    wordCloud: [
      { text: '哈哈', value: 100 },
      { text: '确实', value: 80 },
      { text: '牛逼', value: 60 },
      { text: '吃饭', value: 50 },
      { text: '下班', value: 45 },
      { text: '睡觉', value: 40 },
      { text: '不知道', value: 35 },
      { text: '好', value: 30 },
      { text: '可以', value: 25 },
      { text: '笑死', value: 20 },
    ],
    topEmojis: [
      { char: '😂', count: 230, sender: 'me' },
      { char: '😭', count: 180, sender: 'other' },
      { char: '👍', count: 150, sender: 'me' },
      { char: '🌹', count: 120, sender: 'other' },
    ],
  },
  emotions: {
    laughterCount: 2333,
    laughterSenderRatio: 0.6,
  },
  aiSummary: {
    keywords: ['火锅', '旅行', '加班'],
    summary:
      '2025年，你们聊得最多的关键词是“火锅”，一共提到了 42 次，看来是一起吃了很多顿饭的人。你们还一起策划了一次说走就走的旅行，虽然最后因为加班没去成，但那些讨论攻略的夜晚依然闪闪发光。',
    highlightDate: 1727712000000, // 2025-10-01
    highlightEvent: '国庆假期规划',
  },
  partnerName: '对方',
  myAvatar: '',
  partnerAvatar: '',
}

export function useYearlyReport() {
  const openReport = () => {
    isYearlyReportOpen.value = true
    currentSlideIndex.value = 0
  }

  const closeReport = () => {
    isYearlyReportOpen.value = false
  }

  const nextSlide = () => {
    currentSlideIndex.value++
  }

  const prevSlide = () => {
    if (currentSlideIndex.value > 0) {
      currentSlideIndex.value--
    }
  }

  const setSlide = (index: number) => {
    currentSlideIndex.value = index
  }

  return {
    isOpen: isYearlyReportOpen,
    currentIndex: currentSlideIndex,
    data: computed(() => mockData),
    openReport,
    closeReport,
    nextSlide,
    prevSlide,
    setSlide,
  }
}
