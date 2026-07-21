<script setup lang="ts">
import AppIcon from './AppIcon.vue';
import type { FormattedOutput } from '../composables/useOutputFormatter';

defineProps<{
  formatted: FormattedOutput;
}>();
</script>

<template>
  <span v-if="formatted.type === 'plain'">{{ formatted.content }}</span>

  <div v-else class="formatted-error">
    <div class="formatted-error__heading">
      <AppIcon name="error" class="formatted-error__icon" />
      <h3 class="formatted-error__title">{{ formatted.title }}</h3>
    </div>

    <p class="formatted-error__message">{{ formatted.message }}</p>

    <div class="formatted-error__suggestions">
      <p class="formatted-error__suggestions-title">💡 Suggestions:</p>
      <ul>
        <li v-for="suggestion in formatted.suggestions" :key="suggestion">{{ suggestion }}</li>
      </ul>
    </div>

    <details class="formatted-error__details">
      <summary>Full details</summary>
      <pre class="formatted-error__pre">{{ formatted.fullDetails }}</pre>
    </details>
  </div>
</template>

<style scoped>
.formatted-error__heading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.formatted-error__icon {
  color: var(--color-error);
}

.formatted-error__title {
  color: var(--color-error);
  font-size: 1rem;
}

.formatted-error__message {
  margin: 0 0 var(--space-3);
}

.formatted-error__suggestions {
  margin-bottom: var(--space-3);
}

.formatted-error__suggestions-title {
  color: var(--color-info);
  margin: 0 0 var(--space-1);
}

.formatted-error__suggestions ul {
  margin: 0;
  padding-left: var(--space-5);
  color: var(--color-text-secondary);
}

.formatted-error__details summary {
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
}

.formatted-error__pre {
  margin-top: var(--space-2);
  padding: var(--space-3);
  background-color: var(--color-bg-inset);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  max-height: 300px;
  overflow: auto;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  white-space: pre-wrap;
  color: var(--color-text-secondary);
}
</style>
