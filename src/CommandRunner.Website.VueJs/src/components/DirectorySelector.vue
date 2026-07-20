<script setup lang="ts">
import type { FavoriteDirectoryDto } from '../services/api';

const props = defineProps<{
  directories: FavoriteDirectoryDto[];
  selectedDirectory: FavoriteDirectoryDto | null;
}>();

const emit = defineEmits<{
  change: [directory: FavoriteDirectoryDto | null];
}>();

function handleChange(event: Event) {
  const id = (event.target as HTMLSelectElement).value;
  emit('change', props.directories.find((d) => d.id === id) ?? null);
}
</script>

<template>
  <div class="field directory-selector">
    <label class="field__label" for="directory-selector">Directory</label>
    <select
      id="directory-selector"
      class="field__control"
      :value="selectedDirectory?.id ?? ''"
      @change="handleChange"
    >
      <option v-if="directories.length === 0" value="" disabled>No directories available</option>
      <option v-for="directory in directories" :key="directory.id" :value="directory.id">
        {{ directory.name }}{{ directory.id.startsWith('cmd-dir-') ? ' (from command)' : '' }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.directory-selector {
  width: 100%;
  max-width: 320px;
}
</style>
