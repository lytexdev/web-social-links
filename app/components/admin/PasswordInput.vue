<script setup lang="ts">
import { IconEye, IconEyeOff } from '@tabler/icons-vue'

defineProps<{
  id: string
  describedby?: string
  invalid?: 'true'
  autocomplete: 'current-password' | 'new-password'
}>()

const model = defineModel<string>({ required: true })
const visible = ref(false)
const { t } = useAdminI18n()
</script>

<template>
  <div class="relative">
    <input
      :id="id"
      v-model="model"
      :type="visible ? 'text' : 'password'"
      class="a-input pr-12"
      :autocomplete="autocomplete"
      :aria-describedby="describedby"
      :aria-invalid="invalid"
      spellcheck="false"
      autocapitalize="off"
      maxlength="512"
    />
    <button
      type="button"
      class="a-btn a-btn-quiet a-btn-sm a-btn-icon absolute top-1.5 right-1.5"
      :aria-label="visible ? t.common.hide : t.common.show"
      :aria-pressed="visible"
      @click="visible = !visible"
    >
      <IconEyeOff v-if="visible" :size="18" aria-hidden="true" />
      <IconEye v-else :size="18" aria-hidden="true" />
    </button>
  </div>
</template>
