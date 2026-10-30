<script setup lang="ts">
const model = defineModel<string | null>({ required: true })
defineProps<{ label: string; allowEmpty?: boolean }>()
const { t } = useAdminI18n()
const picker = ref(false)
</script>

<template>
  <div class="grid gap-1.5">
    <span class="a-label">{{ label }}</span>
    <div class="flex flex-wrap items-center gap-2">
      <span
        class="inline-flex h-11 w-11 items-center justify-center rounded-md border border-line bg-surface"
      >
        <IconPreview :icon-ref="model" />
      </span>
      <button type="button" class="a-btn a-btn-sm" @click="picker = true">
        {{ t.blockFields.chooseIcon }}
      </button>
      <button
        v-if="model && allowEmpty !== false"
        type="button"
        class="a-btn a-btn-sm a-btn-quiet"
        @click="model = null"
      >
        {{ t.blockFields.removeIcon }}
      </button>
      <span class="a-hint">{{ model ?? '' }}</span>
    </div>
    <IconPicker v-model:open="picker" :current="model" @select="model = $event" />
  </div>
</template>
