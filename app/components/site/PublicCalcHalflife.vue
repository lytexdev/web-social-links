<script setup lang="ts">
import type { CalculatorPageModel } from '#shared/types/public'
import { DOSE_UNITS, HALFLIFE_FIELDS } from '#shared/calc/halflife.js'

const props = defineProps<{ model: CalculatorPageModel }>()
const t = computed(() => props.model.labels.halflife)
const doseUnits = DOSE_UNITS as string[]
type Field = { min: number; max: number; step: number }
const fields = HALFLIFE_FIELDS as Record<'dose' | 'hours' | 'interval', Field>

function format(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '')
}

const range = computed(() => {
  const [head = '', rest = ''] = t.value.halfRange.split('{low}')
  const [mid = '', tail = ''] = rest.split('{high}')
  return { head, mid, tail }
})
</script>

<template>
  <div class="c-grid">
    <div class="c-inputs">
      <fieldset class="c-fieldset">
        <legend class="p-label">{{ model.labels.common.inputs }}</legend>
        <div class="c-fields">
          <p class="c-field c-field-wide" data-picker>
            <label for="c-substance">{{ t.substance }}</label>
            <select id="c-substance" name="substance" class="c-input" data-picker-select>
              <optgroup
                v-for="group in model.substances"
                :key="group.category"
                :label="t.categories[group.category]"
              >
                <option
                  v-for="item in group.items"
                  :key="item.key"
                  :value="item.key"
                  :selected="model.form.substance === item.key"
                >
                  {{ item.label }}
                </option>
              </optgroup>
            </select>
          </p>
          <p class="c-field" data-field="preparation" :hidden="!model.flags.hasPreparations">
            <label for="c-preparation">{{ t.preparation }}</label>
            <select id="c-preparation" name="preparation" class="c-input" data-preparation>
              <option
                v-for="item in model.preparations"
                :key="item.key"
                :value="item.key"
                :selected="model.form.preparation === item.key"
              >
                {{ item.label }}
              </option>
            </select>
          </p>
          <p class="c-field" data-field="route" :hidden="!model.flags.hasRoutes">
            <label for="c-route">{{ t.route }}</label>
            <select
              id="c-route"
              name="route"
              class="c-input"
              data-route
              aria-describedby="c-route-hint"
            >
              <option
                v-for="key in model.routeKeys"
                :key="key"
                :value="key"
                :selected="model.form.route === key"
              >
                {{ t.routes[key] }}
              </option>
            </select>
            <span id="c-route-hint" class="c-hint">{{ t.routeHint }}</span>
          </p>
          <p class="c-field">
            <label for="c-dose">{{ t.dose }}</label>
            <span class="c-pair">
              <input
                id="c-dose"
                class="c-input"
                type="number"
                name="dose"
                inputmode="decimal"
                :min="fields.dose.min"
                :max="fields.dose.max"
                :step="fields.dose.step"
                :value="model.form.dose"
              />
              <select name="unit" class="c-input c-unit" :aria-label="t.unit">
                <option
                  v-for="item in doseUnits"
                  :key="item"
                  :value="item"
                  :selected="model.form.unit === item"
                >
                  {{ item }}
                </option>
              </select>
            </span>
          </p>
          <p class="c-field">
            <label for="c-hours">{{ t.hours }}</label>
            <input
              id="c-hours"
              class="c-input"
              type="number"
              name="hours"
              inputmode="decimal"
              aria-describedby="c-hours-hint"
              :min="fields.hours.min"
              :max="fields.hours.max"
              :step="fields.hours.step"
              :value="model.form.hours"
            />
            <span id="c-hours-hint" class="c-hint">{{ t.hoursHint }}</span>
          </p>
          <p class="c-field c-field-wide">
            <label for="c-interval">{{ t.interval }}</label>
            <input
              id="c-interval"
              class="c-input"
              type="number"
              name="interval"
              inputmode="numeric"
              aria-describedby="c-interval-hint"
              :min="0"
              :max="fields.interval.max"
              :value="model.form.interval === '0' ? '' : model.form.interval"
            />
            <span id="c-interval-hint" class="c-hint">{{ t.intervalHint }}</span>
          </p>
        </div>
      </fieldset>
    </div>

    <section class="c-result" aria-live="polite">
      <h2 class="p-label c-result-label">{{ model.labels.common.result }}</h2>

      <p class="p-notice" data-calc-when="noModel" :hidden="!model.flags.noModel">
        {{ t.noModel }}
      </p>

      <div data-calc-when="model" :hidden="!model.flags.model">
        <p class="c-hero-value">
          <span class="c-hero-number" data-calc="percent">{{ model.values.percent }}</span>
          <span class="c-hero-unit">%</span>
          <span class="c-hero-name">{{ t.remaining }}</span>
        </p>
        <p class="c-hint" data-calc-when="hasShare" :hidden="!model.flags.hasShare">
          {{ t.active }}: <span data-calc="activeDose">{{ model.values.activeDose }}</span>
          {{ model.form.unit }}
        </p>
        <p class="c-hint">
          <span data-calc="remaining">{{ model.values.remaining }}</span> {{ model.form.unit }}
          {{ format(t.remainingOf, { dose: model.form.dose ?? '', unit: model.form.unit ?? '' }) }}
        </p>

        <figure class="c-chart">
          <svg viewBox="0 0 300 124" role="img" :aria-label="t.chart">
            <line x1="0" y1="100" x2="300" y2="100" class="c-axis" />
            <line x1="0" y1="50" x2="300" y2="50" class="c-axis c-axis-soft" />
            <polyline :points="model.curve" class="c-curve" data-calc-curve />
            <circle
              :cx="model.marker.x"
              :cy="model.marker.y"
              r="4"
              class="c-marker"
              data-calc-marker
            />
            <text x="0" y="116" class="c-scale-text">0</text>
            <text
              x="75"
              y="116"
              text-anchor="middle"
              class="c-scale-text"
              data-calc-duration="axis1"
            >
              {{ model.durations.axis1 }}
            </text>
            <text
              x="150"
              y="116"
              text-anchor="middle"
              class="c-scale-text"
              data-calc-duration="axis2"
            >
              {{ model.durations.axis2 }}
            </text>
            <text x="300" y="116" text-anchor="end" class="c-scale-text" data-calc-duration="axis4">
              {{ model.durations.axis4 }}
            </text>
          </svg>
        </figure>

        <dl class="c-stats">
          <div>
            <dt>{{ t.halfLife }}</dt>
            <dd>
              <span data-calc="half">{{ model.values.half }}</span> {{ t.duration.hours }}
            </dd>
          </div>
          <div>
            <dt>{{ t.t50 }}</dt>
            <dd data-calc-duration="t50">{{ model.durations.t50 }}</dd>
          </div>
          <div>
            <dt>{{ t.t25 }}</dt>
            <dd data-calc-duration="t25">{{ model.durations.t25 }}</dd>
          </div>
          <div>
            <dt>{{ t.t10 }}</dt>
            <dd data-calc-duration="t10">{{ model.durations.t10 }}</dd>
          </div>
          <div>
            <dt>{{ t.t97 }}</dt>
            <dd data-calc-duration="t97">{{ model.durations.t97 }}</dd>
          </div>
        </dl>
        <p class="c-hint">{{ t.t97Hint }}</p>

        <div data-calc-when="repeated" :hidden="!model.flags.repeated">
          <h3 class="p-label c-result-label">{{ t.repeatedTitle }}</h3>
          <dl class="c-stats c-stats-plain">
            <div>
              <dt>{{ t.accumulation }}</dt>
              <dd>
                <span data-calc="accumulation">{{ model.values.accumulation }}</span> ×
              </dd>
            </div>
            <div>
              <dt>{{ t.steadyPeak }}</dt>
              <dd>
                <span data-calc="steadyPeak">{{ model.values.steadyPeak }}</span>
                {{ model.form.unit }}
              </dd>
            </div>
            <div>
              <dt>{{ t.steadyTrough }}</dt>
              <dd>
                <span data-calc="steadyTrough">{{ model.values.steadyTrough }}</span>
                {{ model.form.unit }}
              </dd>
            </div>
          </dl>
          <p class="c-hint">{{ t.accumulationHint }}</p>
        </div>
      </div>

      <h3 class="p-label c-result-label">{{ t.reference }}</h3>
      <dl class="c-reference">
        <div data-calc-when="model" :hidden="!model.flags.model">
          <dt>{{ t.halfLife }}</dt>
          <dd>
            <span data-calc="half">{{ model.values.half }}</span> {{ t.duration.hours }},
            {{ range.head }}<span data-calc="low">{{ model.values.low }}</span
            >{{ range.mid }}<span data-calc="high">{{ model.values.high }}</span
            >{{ range.tail }}
          </dd>
        </div>
        <div>
          <dt>{{ t.metabolites }}</dt>
          <dd data-calc-text="metabolites">{{ model.reference.metabolites }}</dd>
        </div>
        <div>
          <dt>{{ t.blood }}</dt>
          <dd data-calc-text="blood">{{ model.reference.blood }}</dd>
        </div>
        <div>
          <dt>{{ t.urine }}</dt>
          <dd data-calc-text="urine">{{ model.reference.urine }}</dd>
        </div>
        <div data-calc-when="hasNote" :hidden="!model.flags.hasNote">
          <dt>{{ t.substanceNote }}</dt>
          <dd data-calc-text="note">{{ model.reference.note }}</dd>
        </div>
        <div data-calc-when="hasPreparationNote" :hidden="!model.flags.hasPreparationNote">
          <dt>{{ t.preparationNote }}</dt>
          <dd data-prep-note>{{ model.reference.preparationNote }}</dd>
        </div>
        <div data-calc-when="hasRoutes" :hidden="!model.flags.hasRoutes">
          <dt>{{ t.route }}</dt>
          <dd data-route-note>{{ t.routeNotes[model.form.route ?? 'oral'] }}</dd>
        </div>
      </dl>
      <p class="c-hint">{{ t.referenceHint }}</p>
      <p class="c-hint">{{ t.halfHint }}</p>

      <details class="r-legend c-steps" data-calc-when="model" :hidden="!model.flags.model">
        <summary>{{ model.labels.common.steps }}</summary>
        <ol class="c-step-list">
          <li>
            {{ t.stepHalf.split('{half}')[0] }}<span data-calc="half">{{ model.values.half }}</span
            >{{ t.stepHalf.split('{half}')[1] }}
          </li>
          <li>{{ t.stepRemaining }}</li>
          <li>{{ t.stepTimes }}</li>
          <li data-calc-when="repeated" :hidden="!model.flags.repeated">
            {{ t.stepAccumulation }}
          </li>
        </ol>
      </details>
    </section>
  </div>
</template>
