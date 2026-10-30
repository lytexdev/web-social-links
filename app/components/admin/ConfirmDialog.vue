<script setup lang="ts">
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'

defineProps<{
  title: string
  body: string
  confirmLabel: string
  danger?: boolean
  busy?: boolean
}>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ confirm: [] }>()
const { t } = useAdminI18n()
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="a-dialog-overlay" />
      <DialogContent class="a-dialog">
        <DialogTitle class="a-subheading">{{ title }}</DialogTitle>
        <DialogDescription class="mt-2 text-sm text-muted">{{ body }}</DialogDescription>
        <slot />
        <div class="mt-6 flex justify-end gap-2">
          <button type="button" class="a-btn" @click="open = false">{{ t.common.cancel }}</button>
          <button
            type="button"
            class="a-btn"
            :class="danger ? 'a-btn-danger' : 'a-btn-primary'"
            :disabled="busy"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
