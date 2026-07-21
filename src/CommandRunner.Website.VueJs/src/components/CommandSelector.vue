<script setup lang="ts">
import type { CommandDto, ProfileDto } from '../services/api';

defineProps<{
  selectedProfile: ProfileDto | null;
  selectedCommand: CommandDto | null;
}>();

const emit = defineEmits<{
  change: [commandId: string];
}>();

function handleChange(event: Event) {
  emit('change', (event.target as HTMLSelectElement).value);
}
</script>

<template>
  <div class="field command-selector">
    <label class="field__label" for="command-selector">Command</label>
    <select
      id="command-selector"
      class="field__control"
      :disabled="!selectedProfile"
      :value="selectedCommand?.id ?? ''"
      @change="handleChange"
    >
      <option v-if="!selectedProfile" value="" disabled>Select a profile first</option>
      <option v-else-if="selectedProfile.commands.length === 0" value="" disabled>
        No commands in this profile
      </option>
      <option v-for="command in selectedProfile?.commands ?? []" :key="command.id" :value="command.id">
        {{ command.name }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.command-selector {
  width: 100%;
  max-width: 320px;
}
</style>
