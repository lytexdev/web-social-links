<script setup lang="ts">
import { IconGripVertical, IconTrash } from '@tabler/icons-vue'
import { VueDraggable } from 'vue-draggable-plus'

const { t, f } = useAdminI18n()
const store = useSettings()
const profile = computed(() => store.settings.value?.profile)

function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function addSocial(): void {
  profile.value?.social.push({ id: newId(), label: '', url: '', icon: 'tabler:world' })
  store.queue('profile')
}

function removeSocial(id: string): void {
  if (!profile.value) return
  profile.value.social = profile.value.social.filter((item) => item.id !== id)
  store.queue('profile')
}

const avatar = computed({
  get: () => profile.value?.avatar ?? null,
  set: (value: string | null) => {
    if (!profile.value) return
    profile.value.avatar = value
    store.queue('profile', 0)
  },
})
</script>

<template>
  <section v-if="profile" class="grid gap-4" aria-labelledby="profile-title">
    <h2 id="profile-title" class="a-subheading">{{ t.editor.profile }}</h2>
    <div class="grid gap-4 sm:grid-cols-2">
      <AdminField
        v-slot="field"
        :label="t.editor.displayName"
        :error="store.error('profile', 'displayName')"
      >
        <input
          :id="field.id"
          v-model="profile.displayName"
          class="a-input"
          maxlength="60"
          @input="store.queue('profile')"
        />
      </AdminField>
      <AdminField v-slot="field" :label="t.editor.handle" optional>
        <input
          :id="field.id"
          v-model="profile.handle"
          class="a-input"
          maxlength="40"
          @input="store.queue('profile')"
        />
      </AdminField>
    </div>
    <AdminField v-slot="field" :label="t.editor.bio" optional>
      <input
        :id="field.id"
        v-model="profile.bio"
        class="a-input"
        maxlength="160"
        @input="store.queue('profile')"
      />
    </AdminField>
    <MediaField v-model="avatar" :label="t.editor.avatar" />
    <div class="grid gap-2">
      <p class="a-label">{{ t.editor.social }}</p>
      <VueDraggable
        v-model="profile.social"
        tag="ul"
        class="grid gap-2"
        handle=".social-handle"
        @end="store.queue('profile', 0)"
      >
        <li
          v-for="(item, index) in profile.social"
          :key="item.id"
          class="grid gap-2 rounded-md border border-line p-3 sm:grid-cols-[auto_1fr_2fr_auto] sm:items-end"
        >
          <IconField
            v-model="item.icon"
            :label="t.blockFields.icon"
            :allow-empty="false"
            @update:model-value="store.queue('profile', 0)"
          />
          <AdminField v-slot="field" :label="t.editor.socialLabel">
            <input
              :id="field.id"
              v-model="item.label"
              class="a-input"
              maxlength="40"
              @input="store.queue('profile')"
            />
          </AdminField>
          <AdminField
            v-slot="field"
            :label="t.editor.socialUrl"
            :error="store.error('profile', `social.${index}.url`)"
          >
            <input
              :id="field.id"
              v-model="item.url"
              class="a-input"
              type="url"
              maxlength="2048"
              :aria-invalid="field.invalid"
              @input="store.queue('profile')"
            />
          </AdminField>
          <div class="flex gap-1">
            <button
              type="button"
              class="social-handle a-btn a-btn-sm cursor-grab"
              :aria-label="f(t.editor.handleLabel, { label: item.label || item.url })"
              @keydown.up.prevent="
                index > 0 &&
                (profile.social.splice(index - 1, 0, ...profile.social.splice(index, 1)),
                store.queue('profile', 0))
              "
              @keydown.down.prevent="
                index < profile.social.length - 1 &&
                (profile.social.splice(index + 1, 0, ...profile.social.splice(index, 1)),
                store.queue('profile', 0))
              "
            >
              <IconGripVertical :size="16" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="a-btn a-btn-sm a-btn-icon"
              :aria-label="t.editor.delete"
              @click="removeSocial(item.id)"
            >
              <IconTrash :size="16" aria-hidden="true" />
            </button>
          </div>
        </li>
      </VueDraggable>
      <button
        type="button"
        class="a-btn a-btn-sm w-fit"
        :disabled="profile.social.length >= 12"
        @click="addSocial"
      >
        {{ t.editor.socialAdd }}
      </button>
    </div>
  </section>
</template>
