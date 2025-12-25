<script setup lang="ts">
import type { YearlyReportData } from '@/types/yearly'
import YearlyReviewSlide from '../YearlyReviewSlide.vue'
import { format } from 'date-fns'

defineProps<{
  data: YearlyReportData
}>()
</script>

<template>
  <YearlyReviewSlide title="AI 记忆盒子" subtitle="智能提取的年度碎片">
    <template #background>
      <div class="absolute inset-0 bg-[url('https://ui.nuxt.com/grid.svg')] opacity-5"></div>
      <div class="absolute top-0 left-0 w-full h-32 bg-linear-to-b from-pink-100 to-transparent"></div>
    </template>

    <div class="space-y-8">
      <!-- Highlight Date Card -->
      <div class="bg-white/60 border border-pink-100 rounded-xl p-6 backdrop-blur-sm shadow-sm">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
            <UIcon name="i-heroicons-calendar" class="w-6 h-6 text-pink-500" />
          </div>
          <div>
            <div class="text-sm text-slate-400">年度高光时刻</div>
            <div class="text-lg font-bold text-slate-800">
              {{ format(data.aiSummary.highlightDate, 'yyyy年MM月dd日') }}
            </div>
          </div>
        </div>
        <div class="text-pink-600 font-medium">
          {{ data.aiSummary.highlightEvent }}
        </div>
      </div>

      <!-- AI Summary Text -->
      <div class="relative">
        <UIcon name="i-heroicons-sparkles" class="absolute -top-6 -left-4 w-8 h-8 text-yellow-400 animate-bounce" />
        <div class="text-lg leading-loose text-slate-700 text-justify font-light">
          {{ data.aiSummary.summary }}
        </div>
      </div>

      <!-- Tags -->
      <div class="flex flex-wrap justify-center gap-2 pt-4">
        <span
          v-for="tag in data.aiSummary.keywords"
          :key="tag"
          class="px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 border border-slate-200"
        >
          # {{ tag }}
        </span>
      </div>
    </div>
  </YearlyReviewSlide>
</template>
