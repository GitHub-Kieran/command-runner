<script setup lang="ts">
import AppIcon from './AppIcon.vue';
import type { ProfileDto } from '../services/api';

defineProps<{
  profile: ProfileDto;
  isSelected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}>();

const emit = defineEmits<{
  select: [];
  editDetails: [];
  delete: [];
  moveUp: [];
  moveDown: [];
}>();
</script>

<template>
  <article class="profile-card" :class="{ 'profile-card--selected': isSelected }">
    <button type="button" class="profile-card__select" @click="emit('select')">
      <h3 class="profile-card__name">{{ profile.name }}</h3>
      <p class="profile-card__description">{{ profile.description || 'No description' }}</p>
      <div class="profile-card__meta">
        <span class="chip">{{ profile.commands.length }} commands</span>
        <span v-if="profile.isFavorite" class="chip chip--primary">★ Favorite</span>
      </div>
    </button>

    <div class="profile-card__actions">
      <div class="profile-card__reorder">
        <button type="button" class="btn btn--icon" :disabled="!canMoveUp" aria-label="Move profile up" @click="emit('moveUp')">
          <AppIcon name="arrow-up" />
        </button>
        <button type="button" class="btn btn--icon" :disabled="!canMoveDown" aria-label="Move profile down" @click="emit('moveDown')">
          <AppIcon name="arrow-down" />
        </button>
      </div>
      <button type="button" class="btn btn--sm" @click="emit('editDetails')">Edit</button>
      <button type="button" class="btn btn--icon btn--danger" aria-label="Delete profile" @click="emit('delete')">
        <AppIcon name="trash" />
      </button>
    </div>
  </article>
</template>

<style scoped>
.profile-card {
  display: flex;
  flex-direction: column;
  min-width: 260px;
  flex: 1 1 260px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-elevated);
  overflow: hidden;
}

.profile-card--selected {
  border-color: var(--color-primary);
  border-width: 2px;
}

.profile-card__select {
  all: unset;
  cursor: pointer;
  padding: var(--space-4);
  display: block;
}

.profile-card__name {
  font-size: 1rem;
  margin-bottom: var(--space-1);
}

.profile-card__description {
  margin: 0 0 var(--space-2);
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
}

.profile-card__meta {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.profile-card__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-border);
}

.profile-card__reorder {
  display: flex;
  gap: var(--space-1);
}
</style>
