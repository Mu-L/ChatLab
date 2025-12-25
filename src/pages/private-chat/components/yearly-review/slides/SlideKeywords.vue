<script setup lang="ts">
import type { YearlyReportData } from '@/types/yearly'
import YearlyReviewSlide from '../YearlyReviewSlide.vue'

defineProps<{
  data: YearlyReportData
}>()

// Simple random positioning for word cloud mock
const getWordStyle = (index: number) => {
  const sizes = ['text-3xl', 'text-2xl', 'text-xl', 'text-lg', 'text-base']
  const colors = ['text-pink-600', 'text-pink-500', 'text-pink-400', 'text-slate-600', 'text-slate-500']
  const rotations = ['rotate-0', 'rotate-0', 'rotate-0', '-rotate-6', 'rotate-6']

  return {
    class: `${sizes[index % sizes.length]} ${colors[index % colors.length]} ${rotations[index % rotations.length]} font-bold hover:scale-110 transition-transform cursor-default`,
  }
}
</script>

<template>
  <YearlyReviewSlide title="加密通话" subtitle="只有我们懂的梗">
    <template #background>
      <!-- Floating particles -->
      <div
        v-for="i in 5"
        :key="i"
        class="absolute w-2 h-2 bg-pink-500/20 rounded-full animate-float"
        :style="{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${i * 0.5}s`,
          animationDuration: `${3 + Math.random() * 2}s`,
        }"
      ></div>
    </template>

    <div class="space-y-12 w-full">
      <!-- Word Cloud Area -->
      <div class="h-64 relative flex flex-wrap items-center justify-center content-center gap-4 p-4">
        <span v-for="(word, index) in data.keywords.wordCloud" :key="word.text" :class="getWordStyle(index).class">
          {{ word.text }}
        </span>
      </div>

      <!-- Top Emojis -->
      <div class="space-y-6">
        <h3 class="text-sm uppercase tracking-widest text-slate-400">年度表情包</h3>
        <div class="flex justify-center gap-8">
          <div
            v-for="(emoji, index) in data.keywords.topEmojis"
            :key="index"
            class="flex flex-col items-center gap-2 group"
          >
            <div
              class="text-4xl md:text-5xl transform group-hover:scale-125 transition-transform duration-300 cursor-pointer"
            >
              {{ emoji.char }}
            </div>
            <div class="text-xs text-slate-400">{{ emoji.count }}次</div>
          </div>
        </div>
      </div>
    </div>
  </YearlyReviewSlide>
</template>

<style scoped>
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}
</style>
