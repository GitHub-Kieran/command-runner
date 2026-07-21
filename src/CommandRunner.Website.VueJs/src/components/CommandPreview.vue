<script setup lang="ts">
import { computed } from 'vue';
import type { CommandDto, FavoriteDirectoryDto } from '../services/api';

const props = defineProps<{
  selectedCommand: CommandDto;
  selectedDirectory: FavoriteDirectoryDto | null;
  focusMode: boolean;
}>();

const workingDirectory = computed(() => props.selectedDirectory?.path || props.selectedCommand.workingDirectory || '~/');
</script>

<template>
  <div v-if="focusMode" class="command-preview command-preview--focus">
    <p class="command-preview__line">
      <span class="command-preview__cwd">{{ workingDirectory }}</span>
      <span class="command-preview__prompt"> $ </span>
      <span class="command-preview__cmd">{{ selectedCommand.executable }} {{ selectedCommand.arguments }}</span>
    </p>
  </div>

  <section v-else class="panel command-preview" aria-labelledby="command-preview-heading">
    <h2 id="command-preview-heading" class="command-preview__title">Command Preview</h2>
    <div class="command-preview__terminal">
      <span class="command-preview__dot" aria-hidden="true"></span>
      <p class="command-preview__line">
        <span class="command-preview__cwd">{{ workingDirectory }}</span>
        <span class="command-preview__prompt"> $ </span>
        <span class="command-preview__cmd">{{ selectedCommand.executable }}</span>
        <span v-if="selectedCommand.arguments" class="command-preview__args"> {{ selectedCommand.arguments }}</span>
      </p>
    </div>
  </section>
</template>

<style scoped>
.command-preview--focus {
  padding: 0 var(--space-1);
  margin-bottom: var(--space-1);
}

.command-preview--focus .command-preview__line {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  opacity: 0.85;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.command-preview__title {
  font-size: 1.05rem;
  margin-bottom: var(--space-3);
}

.command-preview__terminal {
  position: relative;
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-6);
  background-color: var(--color-bg-inset);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.875rem;
}

.command-preview__dot {
  position: absolute;
  top: 14px;
  left: 16px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-success);
}

.command-preview__line {
  margin: 0;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.command-preview__cwd {
  color: var(--color-success);
}

.command-preview__prompt {
  color: var(--color-text-secondary);
}

.command-preview__cmd {
  color: var(--color-primary);
  font-weight: bold;
}

.command-preview__args {
  color: var(--color-text-secondary);
}
</style>
