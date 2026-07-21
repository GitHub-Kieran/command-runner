<script setup lang="ts">
import type { ProfileDto } from '../services/api';

const props = defineProps<{
  profiles: ProfileDto[];
  selectedProfile: ProfileDto | null;
  compact?: boolean;
}>();

const emit = defineEmits<{
  change: [profile: ProfileDto | null];
}>();

function handleChange(event: Event) {
  const id = (event.target as HTMLSelectElement).value;
  emit('change', props.profiles.find((p) => p.id === id) ?? null);
}
</script>

<template>
  <div class="field profile-selector" :class="{ 'profile-selector--compact': compact }">
    <label class="field__label" for="profile-selector">Profile</label>
    <select
      id="profile-selector"
      class="field__control"
      :value="selectedProfile?.id ?? ''"
      @change="handleChange"
    >
      <option v-if="profiles.length === 0" value="" disabled>No profiles available</option>
      <option v-for="profile in profiles" :key="profile.id" :value="profile.id">
        {{ profile.name }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.profile-selector {
  width: 100%;
  max-width: 320px;
}
</style>
