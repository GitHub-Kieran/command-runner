<script setup lang="ts">
import AppIcon from './AppIcon.vue';
import type { CommandDto } from '../services/api';

defineProps<{
  selectedCommand: CommandDto | null;
  isExecuting: boolean;
}>();

const emit = defineEmits<{
  execute: [];
  stop: [];
  clear: [];
}>();
</script>

<template>
  <div class="command-controls">
    <button
      v-if="isExecuting"
      type="button"
      class="btn btn--primary command-controls__run"
      style="background-color: var(--color-error)"
      @click="emit('stop')"
    >
      <AppIcon name="stop" />
      Stop
    </button>
    <button
      v-else
      type="button"
      class="btn btn--primary command-controls__run"
      :disabled="!selectedCommand"
      @click="emit('execute')"
    >
      <AppIcon name="play" />
      Run
    </button>
    <button
      type="button"
      class="btn btn--outline"
      :disabled="!selectedCommand"
      @click="emit('clear')"
    >
      <AppIcon name="clear" />
      Clear
    </button>
  </div>
</template>

<style scoped>
.command-controls {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-shrink: 0;
}

.command-controls__run {
  min-width: 6.5rem;
}
</style>
