<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useYearlyReport } from '@/composables/useYearlyReport'
import YearlyReviewIntro from './YearlyReviewIntro.vue'
import SlideOverview from './slides/SlideOverview.vue'
import SlideNightOwl from './slides/SlideNightOwl.vue'
import SlideKeywords from './slides/SlideKeywords.vue'
import SlideEmotions from './slides/SlideEmotions.vue'
import SlideAI from './slides/SlideAI.vue'
import SlideSummary from './slides/SlideSummary.vue'

const { isOpen, currentIndex, closeReport, nextSlide, prevSlide, data } = useYearlyReport()

const slides = [YearlyReviewIntro, SlideOverview, SlideNightOwl, SlideKeywords, SlideEmotions, SlideAI, SlideSummary]

const handleClose = () => {
  closeReport()
}

// Keyboard navigation
const handleKeydown = (e: KeyboardEvent) => {
  if (!isOpen.value) return

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
    if (currentIndex.value < slides.length - 1) nextSlide()
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    prevSlide()
  } else if (e.key === 'Escape') {
    handleClose()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 text-slate-900 overflow-hidden"
    >
      <!-- Background Animations -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-200/30 rounded-full blur-[100px] animate-blob"
        ></div>
        <div
          class="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-purple-200/30 rounded-full blur-[100px] animate-blob animation-delay-2000"
        ></div>
        <div
          class="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-rose-200/30 rounded-full blur-[100px] animate-blob animation-delay-4000"
        ></div>
      </div>

      <!-- Close Button -->
      <button
        @click="handleClose"
        class="absolute top-6 right-6 z-50 p-2 rounded-full bg-white/50 hover:bg-white/80 backdrop-blur-sm transition-colors shadow-sm"
      >
        <UIcon name="i-heroicons-x-mark" class="w-6 h-6 text-slate-600" />
      </button>

      <!-- Main Slides -->
      <div class="relative w-full h-full max-w-md mx-auto md:max-w-2xl flex flex-col">
        <!-- Progress Bar (Hidden on Intro) -->
        <div v-if="currentIndex > 0" class="absolute top-0 left-0 right-0 z-20 flex gap-1 p-4">
          <div
            v-for="(_, index) in slides.slice(1)"
            :key="index"
            class="h-1 flex-1 rounded-full bg-white/20 overflow-hidden"
          >
            <div
              class="h-full bg-white transition-all duration-300 ease-out"
              :style="{ width: index <= currentIndex - 1 ? '100%' : '0%' }"
            ></div>
          </div>
        </div>

        <!-- Slide Content -->
        <div class="flex-1 relative w-full h-full group">
          <Transition name="slide-fade" mode="out-in">
            <component
              :is="slides[currentIndex]"
              :data="data"
              class="w-full h-full"
              @next="nextSlide"
              @prev="prevSlide"
            />
          </Transition>

          <!-- Left Navigation Zone -->
          <div
            v-if="currentIndex > 0"
            class="absolute inset-y-0 left-0 w-32 z-20 group/left flex items-center justify-start pl-4"
            @click.self="prevSlide"
          >
            <button
              @click="prevSlide"
              class="p-3 rounded-full bg-white/80 hover:bg-white backdrop-blur-md opacity-0 group-hover/left:opacity-100 transition-opacity duration-300 shadow-lg text-slate-600 hidden md:block"
            >
              <UIcon name="i-heroicons-chevron-left" class="w-8 h-8" />
            </button>
          </div>

          <!-- Right Navigation Zone -->
          <div
            v-if="currentIndex < slides.length - 1"
            class="absolute inset-y-0 right-0 w-32 z-20 group/right flex items-center justify-end pr-4"
            @click.self="nextSlide"
          >
            <button
              @click="nextSlide"
              class="p-3 rounded-full bg-white/80 hover:bg-white backdrop-blur-md opacity-0 group-hover/right:opacity-100 transition-opacity duration-300 shadow-lg text-slate-600 hidden md:block"
            >
              <UIcon name="i-heroicons-chevron-right" class="w-8 h-8" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.5s ease;
}

.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-fade-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: scale(1.05) translateY(-20px);
}

@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}
</style>
