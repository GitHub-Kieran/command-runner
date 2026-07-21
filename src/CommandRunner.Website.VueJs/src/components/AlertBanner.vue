<script setup lang="ts">
import AppIcon from './AppIcon.vue';

defineProps<{
  message: string;
  retrying: boolean;
}>();

const emit = defineEmits<{
  retry: [];
}>();
</script>

<template>
  <div class="alert-banner" role="alert">
    <AppIcon name="error" class="alert-banner__icon" />
    <div class="alert-banner__content">
      <p class="alert-banner__title">API Connection Error</p>
      <p class="alert-banner__message">{{ message }}</p>
    </div>
    <button type="button" class="btn btn--sm btn--outline alert-banner__retry" :disabled="retrying" @click="emit('retry')">
      <AppIcon v-if="!retrying" name="refresh" />
      {{ retrying ? 'Retrying...' : 'Retry' }}
    </button>
  </div>
</template>

<style scoped>
.alert-banner {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  border: 1px solid var(--color-error);
  background-color: rgba(239, 68, 68, 0.08);
  border-radius: var(--radius-md);
}

.alert-banner__icon {
  color: var(--color-error);
  margin-top: 2px;
}

.alert-banner__content {
  flex-grow: 1;
  min-width: 0;
}

.alert-banner__title {
  margin: 0 0 var(--space-1);
  font-weight: 600;
}

.alert-banner__message {
  margin: 0;
  white-space: pre-line;
  color: var(--color-text-secondary);
}

.alert-banner__retry {
  flex-shrink: 0;
}
</style>
