<script setup lang="ts">
import type { CommandDto, FavoriteDirectoryDto } from '../services/api';

defineProps<{
  selectedCommand: CommandDto;
  selectedDirectory: FavoriteDirectoryDto | null;
}>();
</script>

<template>
  <section class="panel command-details" aria-labelledby="command-details-heading">
    <div class="command-details__header">
      <h2 id="command-details-heading" class="command-details__title">Command Details</h2>
      <div class="command-details__badges">
        <span
          v-if="selectedCommand.iterationEnabled"
          class="chip chip--info"
          title="This command runs in subdirectories recursively"
        >
          🔄 Iterative
        </span>
        <span
          v-if="selectedCommand.requireConfirmation"
          class="chip chip--warning"
          title="This command will ask for confirmation before running"
        >
          ⚠️ Requires Confirmation
        </span>
      </div>
    </div>

    <div class="command-details__grid">
      <div class="field">
        <label class="field__label" for="detail-executable">Executable</label>
        <input
          id="detail-executable"
          class="field__control field__control--readonly"
          type="text"
          readonly
          tabindex="-1"
          :value="selectedCommand.executable"
        />
      </div>
      <div class="field">
        <label class="field__label" for="detail-arguments">Arguments</label>
        <input
          id="detail-arguments"
          class="field__control field__control--readonly"
          type="text"
          readonly
          tabindex="-1"
          :value="selectedCommand.arguments"
        />
      </div>
      <div class="field">
        <label class="field__label" for="detail-working-dir">Working Directory</label>
        <input
          id="detail-working-dir"
          class="field__control field__control--readonly"
          type="text"
          readonly
          tabindex="-1"
          :value="selectedDirectory?.path || selectedCommand.workingDirectory || ''"
        />
      </div>
      <div class="field">
        <label class="field__label" for="detail-shell">Shell</label>
        <input
          id="detail-shell"
          class="field__control field__control--readonly"
          type="text"
          readonly
          tabindex="-1"
          :value="selectedCommand.shell || ''"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.command-details__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-4);
  gap: var(--space-2);
}

.command-details__title {
  font-size: 1.05rem;
}

.command-details__badges {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.command-details__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
}
</style>
