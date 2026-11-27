<script setup lang="ts">
import type { CalculatorPageModel } from '#shared/types/public'
import { DOSE_UNITS, HALFLIFE_FIELDS, SEXES } from '#shared/calc/halflife.js'

const props = defineProps<{ model: CalculatorPageModel }>()
const t = computed(() => props.model.labels.halflife)
const doseUnits = DOSE_UNITS as string[]
const sexes = SEXES as string[]
type Field = { min: number; max: number; step: number }
const fields = HALFLIFE_FIELDS as Record<
  'dose' | 'hours' | 'interval' | 'amount' | 'potency' | 'weight',
  Field
>

function area(curve: string): string {
  return curve ? `0,100 ${curve} 300,100` : ''
}

const ofParts = computed(() => {
  const [head = '', rest = ''] = t.value.remainingOf.split('{dose}')
  const [mid = '', tail = ''] = rest.split('{unit}')
  return { head, mid, tail }
})

const range = computed(() => {
  const [head = '', rest = ''] = t.value.halfRange.split('{low}')
  const [mid = '', tail = ''] = rest.split('{high}')
  return { head, mid, tail }
})
</script>

<template>
  <div class="c-grid">
    <div class="c-inputs">
      <p class="p-label c-inputs-label">{{ model.labels.common.inputs }}</p>
      <PublicCalcStep :index="1" :title="t.groupSubstance" :step="model.labels.common.step">
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
      </PublicCalcStep>
      <PublicCalcStep :index="2" :title="t.groupAmount" :step="model.labels.common.step">
        <p class="c-field" data-field="amount" :hidden="!model.flags.hasMaterial">
          <label for="c-amount" data-label="amount">{{ model.material?.amount }}</label>
          <input
            id="c-amount"
            class="c-input"
            type="number"
            name="amount"
            inputmode="decimal"
            :min="fields.amount.min"
            :max="fields.amount.max"
            :step="fields.amount.step"
            :value="model.form.amount"
          />
        </p>
        <p class="c-field" data-field="potency" :hidden="!model.flags.hasMaterial">
          <label for="c-potency" data-label="potency">{{ model.material?.potency }}</label>
          <input
            id="c-potency"
            class="c-input"
            type="number"
            name="potency"
            inputmode="decimal"
            :min="fields.potency.min"
            :max="fields.potency.max"
            :step="fields.potency.step"
            :value="model.form.potency"
          />
        </p>
        <p class="c-field" data-field="dose" :hidden="model.flags.hasMaterial">
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
        <p class="c-field" data-field="weight" :hidden="!model.flags.hasBody">
          <label for="c-weight">{{ t.weight }}</label>
          <input
            id="c-weight"
            class="c-input"
            type="number"
            name="weight"
            inputmode="numeric"
            aria-describedby="c-weight-hint"
            :min="fields.weight.min"
            :max="fields.weight.max"
            :step="fields.weight.step"
            :value="model.form.weight"
          />
          <span id="c-weight-hint" class="c-hint">{{ t.weightHint }}</span>
        </p>
        <p class="c-field" data-field="sex" :hidden="!model.flags.hasBody">
          <label for="c-sex">{{ t.sex }}</label>
          <select id="c-sex" name="sex" class="c-input">
            <option v-for="key in sexes" :key="key" :value="key" :selected="model.form.sex === key">
              {{ t.sexes[key] }}
            </option>
          </select>
        </p>
      </PublicCalcStep>
      <PublicCalcStep :index="3" :title="t.groupTime" :step="model.labels.common.step" wide>
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
        <p class="c-field c-field-wide" data-field="interval" :hidden="model.flags.zero">
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
      </PublicCalcStep>
    </div>

    <section class="c-result" aria-live="polite">
      <h2 class="p-label c-result-label">{{ model.labels.common.result }}</h2>
      <p class="c-short-note">{{ t.shortNote }}</p>

      <div data-calc-when="hasEffect" :hidden="!model.flags.hasEffect">
        <h3 class="p-label c-result-label c-first-label">{{ t.effectTitle }}</h3>
        <p class="c-hero-value">
          <span class="c-hero-number c-hero-effect" data-calc="effectNow">{{
            model.values.effectNow
          }}</span>
          <span class="c-hero-unit">%</span>
          <span class="c-hero-name">{{ t.effectNow }}</span>
        </p>

        <figure
          class="c-chart c-chart-effect"
          data-chart="effect"
          tabindex="0"
          role="group"
          :aria-label="t.effectChart"
          aria-describedby="c-effect-readout"
        >
          <svg viewBox="-6 -12 312 142" aria-hidden="true">
            <line x1="0" y1="100" x2="300" y2="100" class="c-axis" />
            <line x1="0" y1="50" x2="300" y2="50" class="c-axis c-axis-soft" />
            <polygon :points="area(model.effectCurve)" class="c-area" data-calc-area="effect" />
            <polyline :points="model.effectCurve" class="c-curve" data-calc-curve="effect" />
            <circle
              :cx="model.effectMarker.x"
              :cy="model.effectMarker.y"
              r="4"
              class="c-marker"
              data-calc-marker="effect"
            />
            <g data-probe hidden>
              <line x1="0" y1="0" x2="0" y2="100" class="c-probe-line" data-probe-line />
              <circle cx="0" cy="0" r="4.5" class="c-probe-dot" data-probe-dot />
            </g>
            <text x="0" y="118" class="c-scale-text">0</text>
            <text
              x="75"
              y="118"
              text-anchor="middle"
              class="c-scale-text"
              data-calc-duration="eAxis1"
            >
              {{ model.durations.eAxis1 }}
            </text>
            <text
              x="150"
              y="118"
              text-anchor="middle"
              class="c-scale-text"
              data-calc-duration="eAxis2"
            >
              {{ model.durations.eAxis2 }}
            </text>
            <text
              x="225"
              y="118"
              text-anchor="middle"
              class="c-scale-text"
              data-calc-duration="eAxis3"
            >
              {{ model.durations.eAxis3 }}
            </text>
            <text
              x="300"
              y="118"
              text-anchor="end"
              class="c-scale-text"
              data-calc-duration="eAxis4"
            >
              {{ model.durations.eAxis4 }}
            </text>
          </svg>
          <figcaption class="c-hint">
            <span id="c-effect-readout" data-chart-readout aria-live="polite">{{
              t.effectChartHint
            }}</span>
          </figcaption>
        </figure>

        <dl class="c-stats">
          <div>
            <dt>{{ t.onset }}</dt>
            <dd data-calc-duration="onset">{{ model.durations.onset }}</dd>
          </div>
          <div>
            <dt>{{ t.peak }}</dt>
            <dd data-calc-duration="peak">{{ model.durations.peak }}</dd>
          </div>
          <div>
            <dt>{{ t.effectEnd }}</dt>
            <dd data-calc-duration="effectEnd">{{ model.durations.effectEnd }}</dd>
          </div>
        </dl>
        <p class="c-hint">{{ t.effectHint }}</p>
      </div>

      <p class="p-notice" data-calc-when="noModel" :hidden="!model.flags.noModel">
        {{ t.noModel }}
      </p>

      <div data-calc-when="model" :hidden="!model.flags.model">
        <h3 class="p-label c-result-label">{{ t.decayTitle }}</h3>
        <p class="c-hero-value" data-calc-when="!zero" :hidden="model.flags.zero">
          <span class="c-hero-number" data-calc="percent">{{ model.values.percent }}</span>
          <span class="c-hero-unit">%</span>
          <span class="c-hero-name">{{ t.remaining }}</span>
        </p>
        <p class="c-hero-value" data-calc-when="zero" :hidden="!model.flags.zero">
          <span class="c-hero-number" data-calc="remaining">{{ model.values.remaining }}</span>
          <span class="c-hero-unit" data-calc-unit>{{ model.doseUnit }}</span>
          <span class="c-hero-name">{{ t.remaining }}</span>
        </p>
        <p class="c-hint" data-calc-when="hasShare" :hidden="!model.flags.hasShare">
          {{ t.active }}: <span data-calc="activeDose">{{ model.values.activeDose }}</span>
          <span data-calc-unit>{{ model.doseUnit }}</span>
        </p>
        <p class="c-hint" data-calc-when="!zero" :hidden="model.flags.zero">
          <span data-calc="remaining">{{ model.values.remaining }}</span>
          <span data-calc-unit>{{ model.doseUnit }}</span>
          {{ ofParts.head }}<span data-calc="activeDose">{{ model.values.activeDose }}</span
          >{{ ofParts.mid }}<span data-calc-unit>{{ model.doseUnit }}</span
          >{{ ofParts.tail }}
        </p>

        <dl
          class="c-stats c-stats-plain"
          data-calc-when="hasMaterial"
          :hidden="!model.flags.hasMaterial"
        >
          <div>
            <dt>{{ t.material.content }}</dt>
            <dd>
              <span data-calc="content">{{ model.values.content }}</span>
              <span data-calc-unit>{{ model.doseUnit }}</span>
            </dd>
          </div>
          <div data-calc-when="hasBio" :hidden="!model.flags.hasBio">
            <dt>{{ t.material.bio }}</dt>
            <dd>
              <span data-calc="bio">{{ model.values.bio }}</span> %
            </dd>
          </div>
          <div data-calc-when="hasBio" :hidden="!model.flags.hasBio">
            <dt>{{ t.material.absorbed }}</dt>
            <dd>
              <span data-calc="absorbed">{{ model.values.absorbed }}</span>
              <span data-calc-unit>{{ model.doseUnit }}</span>
            </dd>
          </div>
          <div data-calc-when="zero" :hidden="!model.flags.zero">
            <dt>{{ t.bac }}</dt>
            <dd>
              <span data-calc="bac">{{ model.values.bac }}</span>
              <span data-calc-unit>{{ model.doseUnit }}</span>
            </dd>
          </div>
        </dl>
        <p class="c-hint" data-calc-when="hasBio" :hidden="!model.flags.hasBio">
          {{ t.material.absorbedHint }}
        </p>

        <figure
          class="c-chart"
          data-chart="remaining"
          tabindex="0"
          role="group"
          :aria-label="t.chart"
          aria-describedby="c-chart-readout"
        >
          <svg viewBox="-6 -12 312 142" aria-hidden="true">
            <line x1="0" y1="100" x2="300" y2="100" class="c-axis" />
            <line x1="0" y1="50" x2="300" y2="50" class="c-axis c-axis-soft" />
            <polygon :points="area(model.curve)" class="c-area" data-calc-area="remaining" />
            <polyline :points="model.curve" class="c-curve" data-calc-curve="remaining" />
            <circle
              :cx="model.marker.x"
              :cy="model.marker.y"
              r="4"
              class="c-marker"
              data-calc-marker="remaining"
            />
            <g data-probe hidden>
              <line x1="0" y1="0" x2="0" y2="100" class="c-probe-line" data-probe-line />
              <circle cx="0" cy="0" r="4.5" class="c-probe-dot" data-probe-dot />
            </g>
            <text x="0" y="118" class="c-scale-text">0</text>
            <text
              x="75"
              y="118"
              text-anchor="middle"
              class="c-scale-text"
              data-calc-duration="axis1"
            >
              {{ model.durations.axis1 }}
            </text>
            <text
              x="150"
              y="118"
              text-anchor="middle"
              class="c-scale-text"
              data-calc-duration="axis2"
            >
              {{ model.durations.axis2 }}
            </text>
            <text
              x="225"
              y="118"
              text-anchor="middle"
              class="c-scale-text"
              data-calc-duration="axis3"
            >
              {{ model.durations.axis3 }}
            </text>
            <text x="300" y="118" text-anchor="end" class="c-scale-text" data-calc-duration="axis4">
              {{ model.durations.axis4 }}
            </text>
          </svg>
          <figcaption class="c-hint">
            <span id="c-chart-readout" data-chart-readout aria-live="polite">{{
              t.chartHint
            }}</span>
          </figcaption>
        </figure>

        <dl class="c-stats">
          <div data-calc-when="!zero" :hidden="model.flags.zero">
            <dt>{{ t.halfLife }}</dt>
            <dd>
              <span data-calc="half">{{ model.values.half }}</span> {{ t.duration.hours }}
            </dd>
          </div>
          <div data-calc-when="zero" :hidden="!model.flags.zero">
            <dt>{{ t.rate }}</dt>
            <dd>
              <span data-calc="rate">{{ model.values.rate }}</span> {{ t.rateUnit }}
            </dd>
          </div>
          <div>
            <dt>{{ t.t50 }}</dt>
            <dd>
              <span data-calc-duration="t50">{{ model.durations.t50 }}</span>
              <span class="c-range" data-calc-when="hasRange" :hidden="!model.flags.hasRange">
                <span data-calc-duration="t50Low">{{ model.durations.t50Low }}</span>
                {{ t.rangeTo }}
                <span data-calc-duration="t50High">{{ model.durations.t50High }}</span>
              </span>
            </dd>
          </div>
          <div>
            <dt>{{ t.t25 }}</dt>
            <dd data-calc-duration="t25">{{ model.durations.t25 }}</dd>
          </div>
          <div>
            <dt>{{ t.t10 }}</dt>
            <dd>
              <span data-calc-duration="t10">{{ model.durations.t10 }}</span>
              <span class="c-range" data-calc-when="hasRange" :hidden="!model.flags.hasRange">
                <span data-calc-duration="t10Low">{{ model.durations.t10Low }}</span>
                {{ t.rangeTo }}
                <span data-calc-duration="t10High">{{ model.durations.t10High }}</span>
              </span>
            </dd>
          </div>
          <div data-calc-when="!zero" :hidden="model.flags.zero">
            <dt>{{ t.t97 }}</dt>
            <dd>
              <span data-calc-duration="t97">{{ model.durations.t97 }}</span>
              <span class="c-range" data-calc-when="hasRange" :hidden="!model.flags.hasRange">
                <span data-calc-duration="t97Low">{{ model.durations.t97Low }}</span>
                {{ t.rangeTo }}
                <span data-calc-duration="t97High">{{ model.durations.t97High }}</span>
              </span>
            </dd>
          </div>
          <div data-calc-when="zero" :hidden="!model.flags.zero">
            <dt>{{ t.soberIn }}</dt>
            <dd data-calc-duration="soberIn">{{ model.durations.soberIn }}</dd>
          </div>
        </dl>
        <p class="c-hint" data-calc-when="!zero" :hidden="model.flags.zero">{{ t.t97Hint }}</p>
        <p class="c-hint" data-calc-when="zero" :hidden="!model.flags.zero">{{ t.zeroHint }}</p>

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
                <span data-calc-unit>{{ model.doseUnit }}</span>
              </dd>
            </div>
            <div>
              <dt>{{ t.steadyTrough }}</dt>
              <dd>
                <span data-calc="steadyTrough">{{ model.values.steadyTrough }}</span>
                <span data-calc-unit>{{ model.doseUnit }}</span>
              </dd>
            </div>
          </dl>
          <p class="c-hint">{{ t.accumulationHint }}</p>
        </div>
      </div>

      <h3 class="p-label c-result-label">{{ t.detection }}</h3>
      <dl class="c-detect">
        <div class="c-marked c-blood">
          <dt>{{ t.blood }}</dt>
          <dd data-calc-text="blood">{{ model.reference.blood }}</dd>
        </div>
        <div class="c-marked c-urine">
          <dt>{{ t.urine }}</dt>
          <dd data-calc-text="urine">{{ model.reference.urine }}</dd>
        </div>
      </dl>
      <p class="c-hint">{{ t.detectionHint }}</p>

      <h3 class="p-label c-result-label">{{ t.reference }}</h3>
      <dl class="c-reference">
        <div data-calc-when="firstOrder" :hidden="!model.flags.firstOrder">
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
      <p class="c-hint" data-calc-when="firstOrder" :hidden="!model.flags.firstOrder">
        {{ t.halfHint }}
      </p>

      <details class="r-legend c-steps" data-calc-when="model" :hidden="!model.flags.model">
        <summary>{{ model.labels.common.steps }}</summary>
        <ol class="c-step-list">
          <li data-calc-when="hasMaterial" :hidden="!model.flags.hasMaterial">
            {{ t.stepMaterial }}
          </li>
          <li data-calc-when="!zero" :hidden="model.flags.zero">
            {{ t.stepHalf.split('{half}')[0] }}<span data-calc="half">{{ model.values.half }}</span
            >{{ t.stepHalf.split('{half}')[1] }}
          </li>
          <li data-calc-when="!zero" :hidden="model.flags.zero">{{ t.stepRemaining }}</li>
          <li data-calc-when="!zero" :hidden="model.flags.zero">{{ t.stepTimes }}</li>
          <li data-calc-when="zero" :hidden="!model.flags.zero">{{ t.stepZero }}</li>
          <li data-calc-when="repeated" :hidden="!model.flags.repeated">
            {{ t.stepAccumulation }}
          </li>
        </ol>
      </details>
    </section>
  </div>
</template>
