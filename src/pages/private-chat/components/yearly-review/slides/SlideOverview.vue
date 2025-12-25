<script setup lang="ts">
import { computed } from 'vue'
import type { YearlyReportData } from '@/types/yearly'
import YearlyReviewSlide from '../YearlyReviewSlide.vue'
import LineChart from '@/components/charts/LineChart.vue'

const props = defineProps<{
  data: YearlyReportData
}>()

const chartData = computed(() => ({
  labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  values: props.data.overview.messageTrend,
}))
</script>

<template>
  <YearlyReviewSlide title="年度回响" subtitle="这一年，我们的声音">
    <template #background>
      <div class="absolute top-1/4 left-1/4 w-64 h-64 bg-pink-200/40 rounded-full blur-3xl animate-pulse"></div>
      <div
        class="absolute bottom-1/4 right-1/4 w-64 h-64 bg-pink-300/30 rounded-full blur-3xl animate-pulse delay-700"
      ></div>
    </template>

    <div class="space-y-12">
      <!-- Big Stats -->
      <div class="grid grid-cols-2 gap-8">
        <div class="text-center space-y-2">
          <div
            class="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-linear-to-br from-pink-600 to-pink-400"
          >
            {{ (data.overview.totalMessages / 10000).toFixed(1) }}w
          </div>
          <div class="text-sm text-slate-500 uppercase tracking-widest">条消息</div>
        </div>
        <div class="text-center space-y-2">
          <div
            class="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-linear-to-br from-pink-500 to-pink-300"
          >
            {{ (data.overview.totalWords / 10000).toFixed(1) }}w
          </div>
          <div class="text-sm text-slate-500 uppercase tracking-widest">个字</div>
        </div>
      </div>

      <!-- Highlight Text -->
      <div class="text-xl md:text-2xl font-light leading-relaxed text-slate-700">
        如果把这些文字印成书，
        <br />
        大概有
        <span class="font-bold text-pink-500">3.5</span>
        厘米厚，
        <br />
        相当于一本《围城》。
      </div>

      <!-- Chart -->
      <div class="h-48 w-full bg-white/40 rounded-2xl p-4 backdrop-blur-sm border border-white/40 shadow-sm">
        <LineChart :data="chartData" line-color="#ee4567" fill-color="rgba(238, 69, 103, 0.1)" :height="160" />
      </div>
    </div>
  </YearlyReviewSlide>
</template>
