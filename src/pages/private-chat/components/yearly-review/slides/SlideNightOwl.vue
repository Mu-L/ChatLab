<script setup lang="ts">
import type { YearlyReportData } from '@/types/yearly'
import YearlyReviewSlide from '../YearlyReviewSlide.vue'
import { format } from 'date-fns'

defineProps<{
  data: YearlyReportData
}>()
</script>

<template>
  <YearlyReviewSlide title="深夜的温柔" subtitle="当世界睡去，我们还在">
    <template #background>
      <!-- Moon glow -->
      <div class="absolute top-10 right-10 w-32 h-32 bg-pink-200/40 rounded-full blur-[60px]"></div>
    </template>

    <div class="space-y-12">
      <!-- Stats -->
      <div class="text-center space-y-4">
        <p class="text-lg text-slate-600">
          有
          <span class="text-4xl font-bold text-pink-500 mx-2">{{ data.nightOwl.lateNightCount }}</span>
          个深夜
        </p>
        <p class="text-slate-500">
          我们在
          <span class="px-2 py-1 rounded bg-slate-100 text-slate-700 font-mono border border-slate-200">
            23:00 - 05:00
          </span>
          互道晚安
        </p>
      </div>

      <!-- The Message Card -->
      <div class="relative group">
        <div
          class="absolute -inset-1 bg-linear-to-r from-pink-200 to-pink-300 rounded-2xl blur opacity-40 group-hover:opacity-60 transition duration-500"
        ></div>
        <div
          class="relative bg-white/80 backdrop-blur-xl p-8 rounded-xl border border-pink-100 text-left space-y-4 shadow-sm"
        >
          <div class="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider">
            <span>{{ format(data.nightOwl.latestMessage.timestamp, 'yyyy.MM.dd') }}</span>
            <span>{{ format(data.nightOwl.latestMessage.timestamp, 'HH:mm') }}</span>
          </div>

          <div class="text-xl md:text-2xl text-slate-800 font-serif italic leading-relaxed">
            “{{ data.nightOwl.latestMessage.content }}”
          </div>

          <div class="flex items-center gap-2 pt-2">
            <div class="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-xs text-pink-500">
              {{ data.nightOwl.latestMessage.senderName[0] }}
            </div>
            <span class="text-sm text-slate-500">{{ data.nightOwl.latestMessage.senderName }}</span>
          </div>
        </div>
      </div>

      <div class="text-center text-slate-400 text-sm font-light tracking-wide">那是这一年最漫长的陪伴</div>
    </div>
  </YearlyReviewSlide>
</template>
