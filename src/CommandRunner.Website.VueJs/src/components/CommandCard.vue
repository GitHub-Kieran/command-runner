<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';
import type { CommandDto } from '../services/api';

const props = defineProps<{
  command: CommandDto;
  canMoveUp: boolean;
  canMoveDown: boolean;
}>();

const emit = defineEmits<{
  edit: [];
  delete: [];
  moveUp: [];
  moveDown: [];
}>();

const envVarCount = computed(() => Object.keys(props.command.environmentVariables || {}).length);
const createdLabel = computed(() => new Date(props.command.createdAt).toLocaleDateString());
</script>

<template>
  <article class="command-card">
    <div class="command-card__body">
      <h3 class="command-card__name">{{ command.name }}</h3>
      <code class="command-card__cmd">{{ command.executable }} {{ command.arguments }}</code>
      <p class="command-card__cwd">📁 {{ command.workingDirectory }}</p>

      <div class="command-card__meta">
        <span v-if="command.iterationEnabled" class="chip chip--info" title="Runs in subdirectories recursively">
          🔄 Iterative
        </span>
        <span v-if="command.requireConfirmation" class="chip chip--warning" title="Asks for confirmation before running">
          ⚠️ Requires Confirmation
        </span>
        <span v-if="command.shell && command.shell !== 'bash'" class="chip" :title="`Runs in ${command.shell} shell`">
          🐚 {{ command.shell }}
        </span>
        <span v-if="envVarCount > 0" class="chip chip--success" :title="`Has ${envVarCount} environment variables set`">
          🔧 {{ envVarCount }} env vars
        </span>
      </div>
      <p class="command-card__created">Created: {{ createdLabel }}</p>
    </div>

    <div class="command-card__actions">
      <div class="command-card__reorder">
        <button type="button" class="btn btn--icon" :disabled="!canMoveUp" aria-label="Move command up" @click="emit('moveUp')">
          <AppIcon name="arrow-up" />
        </button>
        <button type="button" class="btn btn--icon" :disabled="!canMoveDown" aria-label="Move command down" @click="emit('moveDown')">
          <AppIcon name="arrow-down" />
        </button>
      </div>
      <button type="button" class="btn btn--sm" @click="emit('edit')">Edit</button>
      <button type="button" class="btn btn--icon btn--danger" aria-label="Delete command" @click="emit('delete')">
        <AppIcon name="trash" />
      </button>
    </div>
  </article>
</template>

<style scoped>
.command-card {
  display: flex;
  flex-direction: column;
  min-width: 260px;
  flex: 1 1 260px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-elevated);
  overflow: hidden;
}

.command-card__body {
  padding: var(--space-4);
}

.command-card__name {
  font-size: 1rem;
  margin-bottom: var(--space-2);
}

.command-card__cmd {
  display: block;
  padding: var(--space-2);
  margin-bottom: var(--space-2);
  background-color: var(--color-bg-inset);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  overflow-wrap: anywhere;
}

.command-card__cwd {
  margin: 0 0 var(--space-2);
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
}

.command-card__meta {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.command-card__created {
  margin: var(--space-2) 0 0;
  font-size: 0.75rem;
  font-style: italic;
  color: var(--color-text-secondary);
  opacity: 0.8;
}

.command-card__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-border);
}

.command-card__reorder {
  display: flex;
  gap: var(--space-1);
}
</style>
