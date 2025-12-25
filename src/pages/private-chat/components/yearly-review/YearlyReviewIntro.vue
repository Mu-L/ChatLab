<script setup lang="ts">
defineProps<{
  data?: any
}>()

defineEmits(['next'])
</script>

<template>
  <div class="absolute inset-0 z-30 flex flex-col items-center justify-center text-slate-900 p-6 text-center">
    <div class="space-y-8 max-w-lg animate-fade-in-up">
      <div class="relative">
        <div class="absolute -inset-4 bg-pink-200/50 rounded-full blur-3xl animate-pulse"></div>
        <UIcon name="i-heroicons-sparkles" class="w-24 h-24 text-pink-500 relative z-10" />
      </div>

      <div class="space-y-4">
        <h1
          class="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-linear-to-r from-pink-500 via-pink-600 to-pink-500"
        >
          2025
        </h1>
        <h2 class="text-2xl md:text-3xl font-light text-slate-700">我们的双向奔赴报告</h2>
        <p class="text-lg text-slate-500 font-light tracking-wide">这一年，每一条消息都是时间的刻度</p>
      </div>

      <button
        @click="$emit('next')"
        class="group relative px-8 py-4 bg-pink-500 text-white rounded-full font-bold text-lg shadow-lg shadow-pink-500/30 hover:shadow-xl hover:shadow-pink-500/40 hover:scale-105 transition-all duration-300 overflow-hidden"
      >
        <span class="relative z-10 flex items-center gap-2">
          开启回忆
          <UIcon name="i-heroicons-arrow-right" class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </span>
        <div
          class="absolute inset-0 bg-linear-to-r from-pink-400 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        ></div>
      </button>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.8s ease-out forwards;
}
</style>
