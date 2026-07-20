<script setup lang="ts">
import { watch } from 'vue';
import AppIcon from './AppIcon.vue';

const props = defineProps<{
  open: boolean;
  message: string;
  autoHideMs?: number;
}>();

const emit = defineEmits<{
  close: [];
}>();

let hideTimeout: ReturnType<typeof setTimeout> | undefined;

watch(
  () => props.open,
  (isOpen) => {
    clearTimeout(hideTimeout);
    if (isOpen) {
      hideTimeout = setTimeout(() => emit('close'), props.autoHideMs ?? 3000);
    }
  },
);
</script>

<template>
  <div class="toast-notification" role="status" aria-live="polite">
    <div v-if="open" class="toast-notification__card">
      <AppIcon name="check-circle" class="toast-notification__icon" />
      <span>{{ message }}</span>
      <button
        type="button"
        class="toast-notification__close"
        aria-label="Dismiss notification"
        @click="emit('close')"
      >
        <AppIcon name="clear" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.toast-notification {
  position: fixed;
  top: var(--space-4);
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
}

.toast-notification__card {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-success);
  color: #ffffff;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  font-weight: 500;
}

.toast-notification__icon {
  flex-shrink: 0;
}

.toast-notification__close {
  display: inline-flex;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.85;
  padding: 0;
  margin-left: var(--space-2);
}

.toast-notification__close:hover {
  opacity: 1;
}
</style>
