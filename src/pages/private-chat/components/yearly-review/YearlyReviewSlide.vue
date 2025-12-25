<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
}>()
</script>

<template>
  <div class="w-full h-full flex flex-col items-center justify-center p-6 md:p-12 text-center relative overflow-hidden">
    <!-- Background Decor -->
    <div class="absolute inset-0 z-0 pointer-events-none">
      <slot name="background"></slot>
    </div>

    <!-- Content -->
    <div class="relative z-10 w-full max-w-md flex flex-col items-center gap-8">
      <div v-if="title || subtitle" class="space-y-2 animate-fade-in-down">
        <h2 v-if="title" class="text-3xl md:text-4xl font-bold text-slate-900">{{ title }}</h2>
        <p v-if="subtitle" class="text-lg text-slate-500">{{ subtitle }}</p>
      </div>

      <div class="w-full animate-fade-in-up delay-200">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

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

.animate-fade-in-down {
  animation: fadeInDown 0.6s ease-out forwards;
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out forwards;
}

.delay-200 {
  animation-delay: 0.2s;
  opacity: 0; /* Initial state for delayed animation */
  animation-fill-mode: forwards;
}
</style>
