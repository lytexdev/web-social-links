<script setup lang="ts">
import type { CalculatorPageModel } from '#shared/types/public'
import { ACTIVITY_LEVELS, CALORIES_FIELDS, SPORT_INTENSITIES } from '#shared/calc/calories.js'

const props = defineProps<{ model: CalculatorPageModel }>()
const t = computed(() => props.model.labels.calories)
const levels = ACTIVITY_LEVELS as Array<{ key: string; pal: number }>
const intensities = SPORT_INTENSITIES as Array<{ key: string; met: number }>
type Field = { min: number; max: number; step: number }
const fields = CALORIES_FIELDS as Record<
  'age' | 'height' | 'weight' | 'fat' | 'sessions' | 'minutes',
  Field
>
</script>

<template>
  <div class="c-grid">
    <div class="c-inputs">
      <p class="p-label c-inputs-label">{{ model.labels.common.inputs }}</p>
      <PublicCalcStep :index="1" :title="t.groupBody" :step="model.labels.common.step">
        <p class="c-field">
          <label for="c-sex">{{ t.sex }}</label>
          <select id="c-sex" name="sex" class="c-input">
            <option value="male" :selected="model.form.sex === 'male'">{{ t.sexes.male }}</option>
            <option value="female" :selected="model.form.sex === 'female'">
              {{ t.sexes.female }}
            </option>
          </select>
        </p>
        <p class="c-field">
          <label for="c-age">{{ t.age }}</label>
          <input
            id="c-age"
            class="c-input"
            type="number"
            name="age"
            inputmode="numeric"
            :min="fields.age.min"
            :max="fields.age.max"
            :step="fields.age.step"
            :value="model.form.age"
          />
        </p>
        <p class="c-field">
          <label for="c-height">{{ t.height }}</label>
          <input
            id="c-height"
            class="c-input"
            type="number"
            name="height"
            inputmode="numeric"
            :min="fields.height.min"
            :max="fields.height.max"
            :step="fields.height.step"
            :value="model.form.height"
          />
        </p>
        <p class="c-field">
          <label for="c-weight">{{ t.weight }}</label>
          <input
            id="c-weight"
            class="c-input"
            type="number"
            name="weight"
            inputmode="decimal"
            :min="fields.weight.min"
            :max="fields.weight.max"
            :step="fields.weight.step"
            :value="model.form.weight"
          />
        </p>
        <p class="c-field c-field-wide">
          <label for="c-fat">{{ t.fat }}</label>
          <input
            id="c-fat"
            class="c-input"
            type="number"
            name="fat"
            inputmode="decimal"
            aria-describedby="c-fat-hint"
            :min="0"
            :max="fields.fat.max"
            :step="fields.fat.step"
            :value="model.form.fat === '0' ? '' : model.form.fat"
          />
          <span id="c-fat-hint" class="c-hint">{{ t.fatHint }}</span>
        </p>
        <p class="c-field c-field-wide">
          <label for="c-activity">{{ t.activity }}</label>
          <select id="c-activity" name="activity" class="c-input" aria-describedby="c-act-hint">
            <option
              v-for="level in levels"
              :key="level.key"
              :value="level.key"
              :selected="model.form.activity === level.key"
            >
              {{ t.levels[level.key] }} ({{ t.levelHints[level.key] }})
            </option>
          </select>
          <span id="c-act-hint" class="c-hint">{{ t.activityHint }}</span>
        </p>
      </PublicCalcStep>

      <PublicCalcStep :index="2" :title="t.groupSport" :step="model.labels.common.step">
        <p class="c-field">
          <label for="c-sessions">{{ t.sessions }}</label>
          <input
            id="c-sessions"
            class="c-input"
            type="number"
            name="sessions"
            inputmode="numeric"
            :min="fields.sessions.min"
            :max="fields.sessions.max"
            :value="model.form.sessions"
          />
        </p>
        <p class="c-field">
          <label for="c-minutes">{{ t.minutes }}</label>
          <input
            id="c-minutes"
            class="c-input"
            type="number"
            name="minutes"
            inputmode="numeric"
            :min="fields.minutes.min"
            :max="fields.minutes.max"
            :step="fields.minutes.step"
            :value="model.form.minutes"
          />
        </p>
        <p class="c-field">
          <label for="c-intensity">{{ t.intensity }}</label>
          <select id="c-intensity" name="intensity" class="c-input">
            <option
              v-for="item in intensities"
              :key="item.key"
              :value="item.key"
              :selected="model.form.intensity === item.key"
            >
              {{ t.intensities[item.key] }}
            </option>
          </select>
        </p>
      </PublicCalcStep>
    </div>

    <section class="c-result" aria-live="polite">
      <h2 class="p-label c-result-label">{{ model.labels.common.result }}</h2>
      <p class="c-hero-value">
        <span class="c-hero-number" data-calc="tdee">{{ model.values.tdee }}</span>
        <span class="c-hero-unit">{{ t.perDay }}</span>
        <span class="c-hero-name">{{ t.tdee }}</span>
      </p>
      <p class="c-hint">{{ t.tdeeHint }}</p>
      <dl class="c-stats">
        <div>
          <dt>{{ t.bmr }}</dt>
          <dd>
            <span data-calc="bmr">{{ model.values.bmr }}</span> {{ t.perDay }}
          </dd>
        </div>
        <div data-calc-when="usesKatch">
          <dt>{{ t.lbm }}</dt>
          <dd>
            <span data-calc="lbm">{{ model.values.lbm }}</span> kg
          </dd>
        </div>
        <div>
          <dt>{{ t.activityKcal }}</dt>
          <dd>
            <span data-calc="activityKcal">{{ model.values.activityKcal }}</span> {{ t.perDay }}
          </dd>
        </div>
        <div>
          <dt>{{ t.sportKcal }}</dt>
          <dd>
            <span data-calc="sportKcal">{{ model.values.sportKcal }}</span> {{ t.perDay }}
          </dd>
        </div>
        <div>
          <dt>{{ t.bmi }}</dt>
          <dd data-calc="bmi">{{ model.values.bmi }}</dd>
        </div>
      </dl>

      <h3 class="p-label c-result-label">{{ t.targets }}</h3>
      <ul class="c-targets">
        <li>
          <span>{{ t.cut20 }}</span>
          <strong
            ><span data-calc="cut20">{{ model.values.cut20 }}</span> {{ t.perDay }}</strong
          >
        </li>
        <li>
          <span>{{ t.cut10 }}</span>
          <strong
            ><span data-calc="cut10">{{ model.values.cut10 }}</span> {{ t.perDay }}</strong
          >
        </li>
        <li class="c-target-hold">
          <span>{{ t.hold }}</span>
          <strong
            ><span data-calc="tdee">{{ model.values.tdee }}</span> {{ t.perDay }}</strong
          >
        </li>
        <li>
          <span>{{ t.gain10 }}</span>
          <strong
            ><span data-calc="gain10">{{ model.values.gain10 }}</span> {{ t.perDay }}</strong
          >
        </li>
      </ul>
      <p class="c-hint">
        {{ t.weeklyLoss.split('{value}')[0]
        }}<span data-calc="weeklyLoss">{{ model.values.weeklyLoss }}</span
        >{{ t.weeklyLoss.split('{value}')[1] }}
      </p>

      <details class="r-legend c-steps">
        <summary>{{ model.labels.common.steps }}</summary>
        <ol class="c-step-list">
          <li data-calc-when="mifflin">{{ t.stepMifflin }}</li>
          <li data-calc-when="usesKatch">{{ t.stepKatch }}</li>
          <li>
            {{ t.stepActivity.split('{value}')[0]
            }}<span data-calc="pal">{{ model.values.pal }}</span
            >{{ t.stepActivity.split('{value}')[1] }}
          </li>
          <li data-calc-when="hasSport">
            {{ t.stepSport.split('{met}')[0] }}<span data-calc="met">{{ model.values.met }}</span
            >{{ t.stepSport.split('{met}')[1] }}
          </li>
          <li>{{ t.stepTotal }}</li>
        </ol>
      </details>
    </section>
  </div>
</template>
