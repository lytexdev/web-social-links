<script setup lang="ts">
const props = defineProps<{
  label: string
  hint?: string
  error?: string
  optional?: boolean
}>()

const { t } = useAdminI18n()
const id = useId()
const hintId = `${id}-hint`
const errorId = `${id}-error`
const invalid = computed<'true' | undefined>(() => (props.error ? 'true' : undefined))
const describedby = computed(
  () =>
    [props.hint ? hintId : '', props.error ? errorId : ''].filter(Boolean).join(' ') || undefined,
)
</script>

<template>
  <div class="grid gap-1.5">
    <label :for="id" class="a-label">
      {{ label }}
      <span v-if="optional" class="font-normal text-muted">({{ t.common.optional }})</span>
    </label>
    <slot :id="id" :describedby="describedby" :invalid="invalid" />
    <p v-if="hint" :id="hintId" class="a-hint">{{ hint }}</p>
    <p v-if="error" :id="errorId" class="a-error">{{ error }}</p>
  </div>
</template>
