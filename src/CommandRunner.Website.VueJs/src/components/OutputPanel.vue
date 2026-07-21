<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';
import FormattedOutput from './FormattedOutput.vue';
import { formatOutput } from '../composables/useOutputFormatter';

const props = defineProps<{
  output: string;
  isLoading: boolean;
  focusMode: boolean;
}>();

const emit = defineEmits<{
  clear: [];
  copy: [];
  save: [];
}>();

const formatted = computed(() => formatOutput(props.output));
const hasContent = computed(() => Boolean(props.output));
const hasFocusModeError = computed(() => props.focusMode && formatted.value.type === 'error' && hasContent.value);
</script>

<template>
  <!-- Compact focus-mode panel only ever appears to surface an error. -->
  <section
    v-if="focusMode"
    v-show="hasFocusModeError"
    class="panel output-panel output-panel--focus"
    aria-live="polite"
  >
    <div class="output-panel__header">
      <h2 class="output-panel__title output-panel__title--error">⚠️ Error Output</h2>
      <button type="button" class="btn btn--icon" aria-label="Clear output" @click="emit('clear')">
        <AppIcon name="clear" />
      </button>
    </div>
    <div class="output-panel__body">
      <FormattedOutput v-if="!isLoading" :formatted="formatted" />
    </div>
  </section>

  <section v-else class="panel output-panel" aria-labelledby="output-panel-heading">
    <div class="output-panel__header">
      <h2 id="output-panel-heading" class="output-panel__title">Output Window</h2>
      <div class="output-panel__actions">
        <button type="button" class="btn btn--sm btn--outline" :disabled="!hasContent" @click="emit('clear')">
          <AppIcon name="clear" /> Clear Output
        </button>
        <button type="button" class="btn btn--sm btn--outline" :disabled="!hasContent" @click="emit('copy')">
          <AppIcon name="copy" /> Copy Output
        </button>
        <button type="button" class="btn btn--sm btn--outline" :disabled="!hasContent" @click="emit('save')">
          <AppIcon name="save" /> Save Log
        </button>
      </div>
    </div>
    <hr class="output-panel__divider" />
    <div class="output-panel__body output-panel__body--full" aria-live="polite" :aria-busy="isLoading">
      <p v-if="isLoading" class="output-panel__status">
        <span class="output-panel__spinner" aria-hidden="true"></span>
        Running...
      </p>
      <FormattedOutput v-if="hasContent" :formatted="formatted" />
      <span v-else-if="!isLoading" class="output-panel__placeholder">Ready to execute commands...</span>
    </div>
  </section>
</template>

<style scoped>
.output-panel {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.output-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}

.output-panel__title {
  font-size: 1.05rem;
}

.output-panel__title--error {
  color: var(--color-error);
}

.output-panel__actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.output-panel__divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 0 0 var(--space-3);
}

.output-panel__body {
  background-color: var(--color-bg-inset);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  white-space: pre-wrap;
  overflow: auto;
  box-shadow: var(--shadow-inset);
}

.output-panel__body--full {
  flex-grow: 1;
  min-height: 300px;
}

.output-panel--focus .output-panel__body {
  max-height: 200px;
}

.output-panel__status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-2);
  color: var(--color-text-secondary);
}

.output-panel__placeholder {
  color: var(--color-text-secondary);
}

.output-panel__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border-strong);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: output-panel-spin 0.7s linear infinite;
}

@keyframes output-panel-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
