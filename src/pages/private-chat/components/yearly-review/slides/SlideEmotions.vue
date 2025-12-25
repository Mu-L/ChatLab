<script setup lang="ts">
import type { YearlyReportData } from '@/types/yearly'
import YearlyReviewSlide from '../YearlyReviewSlide.vue'
import DoughnutChart from '@/components/charts/DoughnutChart.vue'
import { computed } from 'vue'

const props = defineProps<{
  data: YearlyReportData
}>()

const chartData = computed(() => ({
  labels: ['我', '对方'],
  values: [props.data.emotions.laughterSenderRatio * 100, (1 - props.data.emotions.laughterSenderRatio) * 100],
  colors: ['#f472b6', '#a78bfa'], // pink-400, purple-400
}))
</script>

<template>
  <YearlyReviewSlide title="快乐源泉" subtitle="谁是那个长在笑点上的人？">
    <template #background>
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-200/40 rounded-full blur-3xl animate-pulse"
      ></div>
    </template>

    <div class="space-y-12 flex flex-col items-center">
      <div class="relative w-64 h-64">
        <DoughnutChart :data="chartData" cutout="70%" :show-legend="false" />
        <!-- Center Text -->
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <div class="text-4xl font-bold text-slate-900">{{ data.emotions.laughterCount }}</div>
          <div class="text-sm text-slate-500">次“哈哈”</div>
        </div>
      </div>

      <div class="space-y-4 text-center">
        <div class="text-xl text-slate-800">
          这一年，屏幕上出现了
          <span class="text-pink-500 font-bold">{{ data.emotions.laughterCount }}</span>
          次笑声
        </div>
        <div class="text-slate-600 text-sm max-w-xs mx-auto leading-relaxed">
          <template v-if="data.emotions.laughterSenderRatio > 0.5">
            你贡献了
            <span class="text-pink-500 font-bold">{{ (data.emotions.laughterSenderRatio * 100).toFixed(0) }}%</span>
            的笑声，
            <br />
            看来对方真的很幽默。
          </template>
          <template v-else>
            对方贡献了
            <span class="text-pink-400 font-bold">
              {{ ((1 - data.emotions.laughterSenderRatio) * 100).toFixed(0) }}%
            </span>
            的笑声，
            <br />
            你一定是他的开心果。
          </template>
        </div>
      </div>
    </div>
  </YearlyReviewSlide>
</template>
