<script setup lang="ts">
import type { CalculatorPageModel } from '#shared/types/public'
import { DOSE_UNITS, PEPTIDE_FIELDS, SYRINGE_SCALES } from '#shared/calc/peptide.js'

const props = defineProps<{ model: CalculatorPageModel }>()
const t = computed(() => props.model.labels.peptide)
const scales = SYRINGE_SCALES as Array<{ key: string; unitsPerMl: number }>
const doseUnits = DOSE_UNITS as string[]
type Field = { min: number; max: number; step: number }
const fields = PEPTIDE_FIELDS as Record<'vial' | 'solvent' | 'dose', Field>
const ticks = [1, 2, 3, 4, 5, 6, 7, 8, 9]

function format(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '')
}
</script>

<template>
  <div class="c-grid">
    <div class="c-inputs">
      <p class="p-label c-inputs-label">{{ model.labels.common.inputs }}</p>
      <PublicCalcStep :index="1" :title="t.groupVial" :step="model.labels.common.step">
        <p class="c-field">
          <label for="c-vial">{{ t.vial }}</label>
          <input
            id="c-vial"
            class="c-input"
            type="number"
            name="vial"
            inputmode="decimal"
            aria-describedby="c-vial-hint"
            :min="fields.vial.min"
            :max="fields.vial.max"
            :step="fields.vial.step"
            :value="model.form.vial"
          />
          <span id="c-vial-hint" class="c-hint">{{ t.vialHint }}</span>
        </p>
        <p class="c-field">
          <label for="c-solvent">{{ t.solvent }}</label>
          <input
            id="c-solvent"
            class="c-input"
            type="number"
            name="solvent"
            inputmode="decimal"
            aria-describedby="c-solvent-hint"
            :min="fields.solvent.min"
            :max="fields.solvent.max"
            :step="fields.solvent.step"
            :value="model.form.solvent"
          />
          <span id="c-solvent-hint" class="c-hint">{{ t.solventHint }}</span>
        </p>
      </PublicCalcStep>
      <PublicCalcStep :index="2" :title="t.groupDose" :step="model.labels.common.step">
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
                {{ t.units[item] }}
              </option>
            </select>
          </span>
        </p>
      </PublicCalcStep>
      <PublicCalcStep :index="3" :title="t.groupDevice" :step="model.labels.common.step" wide>
        <p class="c-field c-field-wide" data-calc-when="isSyringe" :hidden="model.flags.isSpray">
          <label for="c-scale">{{ t.syringe }}</label>
          <span class="c-pair">
            <select id="c-scale" name="scale" class="c-input" aria-describedby="c-scale-hint">
              <option
                v-for="item in scales"
                :key="item.key"
                :value="item.key"
                :selected="model.form.scale === item.key"
              >
                {{ t.scales[item.key] }}
              </option>
            </select>
            <select name="size" class="c-input" :aria-label="t.size">
              <option
                v-for="item in model.sizes"
                :key="item.value"
                :value="item.value"
                :selected="Number(model.form.size) === item.value"
              >
                {{
                  format(t.sizeOption, {
                    ml: item.label,
                    units: String(item.value * Number(model.form.unitsPerMl ?? 100)),
                  })
                }}
              </option>
            </select>
          </span>
          <span id="c-scale-hint" class="c-hint">{{ t.scaleHint }}</span>
        </p>
        <p class="c-field" data-calc-when="isSpray" :hidden="!model.flags.isSpray">
          <label for="c-spray">{{ t.sprayVolume }}</label>
          <input
            id="c-spray"
            class="c-input"
            type="number"
            name="spray"
            inputmode="numeric"
            aria-describedby="c-spray-hint"
            :min="20"
            :max="250"
            :step="10"
            :value="model.form.spray"
          />
          <span id="c-spray-hint" class="c-hint">{{ t.sprayVolumeHint }}</span>
        </p>
      </PublicCalcStep>
    </div>

    <section class="c-result" aria-live="polite">
      <h2 class="p-label c-result-label">{{ model.labels.common.result }}</h2>
      <div class="c-headline">
        <div class="c-headline-text">
          <p class="c-hero-value" data-calc-when="isSyringe" :hidden="model.flags.isSpray">
            <span class="c-hero-number" data-calc="units">{{ model.values.units }}</span>
            <span class="c-hero-unit">{{ t.drawUnit }}</span>
            <span class="c-hero-name">{{ t.draw }}</span>
          </p>
          <p class="c-hero-value" data-calc-when="isSpray" :hidden="!model.flags.isSpray">
            <span class="c-hero-number" data-calc="spraysPerDose">{{
              model.values.spraysPerDose
            }}</span>
            <span class="c-hero-unit">{{ t.sprays }}</span>
            <span class="c-hero-name">{{ t.drawSpray }}</span>
          </p>
          <p class="p-notice" data-calc-when="overCapacity" :hidden="!model.flags.overCapacity">
            {{ t.overCapacity }}
          </p>
          <p class="p-notice" data-calc-when="tooSmall" :hidden="!model.flags.tooSmall">
            {{ t.tooSmall }}
          </p>
        </div>
        <div class="c-headline-art">
          <figure class="c-syringe" data-calc-when="isSyringe" :hidden="model.flags.isSpray">
            <svg viewBox="0 0 320 60" role="img" :aria-label="`${t.draw}: ${model.values.units}`">
              <rect x="24" y="16" width="240" height="24" rx="3" class="c-barrel" />
              <rect
                x="24"
                y="16"
                :width="Math.round(model.fill * 240)"
                height="24"
                rx="3"
                class="c-fill"
                data-calc-fill
              />
              <line
                v-for="tick in ticks"
                :key="tick"
                :x1="24 + tick * 24"
                y1="16"
                :x2="24 + tick * 24"
                :y2="tick === 5 ? 40 : 26"
                class="c-tick"
              />
              <rect x="264" y="20" width="26" height="16" rx="2" class="c-barrel" />
              <rect x="290" y="24" width="22" height="8" rx="2" class="c-barrel" />
              <rect x="8" y="26" width="16" height="4" rx="2" class="c-barrel" />
              <text x="24" y="56" class="c-scale-text">0</text>
              <text x="264" y="56" text-anchor="end" class="c-scale-text" data-calc="capacityUnits">
                {{ model.values.capacityUnits }}
              </text>
            </svg>
            <figcaption class="c-hint">{{ t.scales[model.form.scale ?? 'u100'] }}</figcaption>
          </figure>

          <figure class="c-spray" data-calc-when="isSpray" :hidden="!model.flags.isSpray">
            <svg viewBox="0 0 190 264" role="img" :aria-label="t.sprayPicture">
              <g class="c-plume" data-plume>
                <circle cx="70" cy="20" r="3.5" />
                <circle cx="56" cy="13" r="2.5" />
                <circle cx="84" cy="13" r="2.5" />
                <circle cx="70" cy="5" r="2" />
              </g>
              <rect x="62" y="28" width="16" height="22" rx="2" class="c-barrel" />
              <rect x="54" y="50" width="32" height="14" rx="3" class="c-barrel" />
              <rect x="46" y="64" width="48" height="188" rx="14" class="c-barrel" />
              <rect x="52" y="88" width="36" height="156" rx="9" class="c-liquid" />
              <rect
                x="52"
                y="88"
                width="36"
                :height="Math.max(2, Math.round(model.doseShare * 156))"
                rx="6"
                class="c-dose-slice"
                data-calc-dose
              />
              <line x1="90" y1="96" x2="100" y2="96" class="c-tick" />
              <line x1="96" y1="212" x2="100" y2="212" class="c-tick" />
              <text x="104" y="100" class="c-scale-text">{{ t.sprayDose }}</text>
              <text x="104" y="216" class="c-scale-text">{{ t.sprayVial }}</text>
            </svg>
            <figcaption class="c-hint">{{ t.sprayPictureHint }}</figcaption>
          </figure>

          <p class="c-dots" data-calc-when="isSpray" :hidden="!model.flags.isSpray">
            <span class="sr-only" data-spray-text
              >{{ t.drawSpray }}: {{ model.values.spraysPerDose }}</span
            >
            <span
              v-for="(level, index) in model.sprayDots"
              :key="index"
              class="c-dot-spray"
              :data-level="level"
              :data-dot="index"
              aria-hidden="true"
            />
          </p>
        </div>
      </div>

      <dl class="c-stats">
        <div>
          <dt>{{ t.concentration }}</dt>
          <dd>
            <span data-calc="concentrationMgMl">{{ model.values.concentrationMgMl }}</span> mg/ml
          </dd>
        </div>
        <div>
          <dt>{{ t.volume }}</dt>
          <dd>
            <span data-calc="volumeMl">{{ model.values.volumeMl }}</span> ml
          </dd>
        </div>
        <div data-calc-when="isSyringe" :hidden="model.flags.isSpray">
          <dt>{{ t.mcgPerUnit }}</dt>
          <dd>
            <span data-calc="mcgPerUnit">{{ model.values.mcgPerUnit }}</span> mcg
          </dd>
        </div>
        <div data-calc-when="isSpray" :hidden="!model.flags.isSpray">
          <dt>{{ t.perSpray }}</dt>
          <dd>
            <span data-calc="mcgPerSpray">{{ model.values.mcgPerSpray }}</span> mcg
          </dd>
        </div>
        <div data-calc-when="isSpray" :hidden="!model.flags.isSpray">
          <dt>{{ t.spraysPerVial }}</dt>
          <dd data-calc="spraysPerVial">{{ model.values.spraysPerVial }}</dd>
        </div>
        <div>
          <dt>{{ t.coverage }}</dt>
          <dd>
            {{ t.coverageValue.split('{whole}')[0]
            }}<span data-calc="wholeDoses">{{ model.values.wholeDoses }}</span
            >{{ t.coverageValue.split('{whole}')[1] }}
          </dd>
        </div>
        <div>
          <dt>{{ t.rest }}</dt>
          <dd>
            <span data-calc="restMcg">{{ model.values.restMcg }}</span> mcg
          </dd>
        </div>
      </dl>

      <h3 id="c-alt" class="p-label c-result-label">{{ t.alternatives }}</h3>
      <p class="c-hint">{{ t.alternativesHint }}</p>
      <div class="c-table-wrap" tabindex="0" role="group" aria-labelledby="c-alt">
        <table class="c-table">
          <thead>
            <tr>
              <th scope="col">{{ t.columnSolvent }}</th>
              <th scope="col">{{ t.columnConcentration }}</th>
              <th scope="col">{{ t.columnUnits }}</th>
              <th scope="col">{{ t.columnFits }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in model.alternatives"
              :key="item.index"
              :data-alt="item.index"
              :data-current="item.current ? 'true' : undefined"
            >
              <th scope="row">{{ item.solvent }} ml</th>
              <td>
                <span data-alt-conc>{{ item.conc }}</span> mg/ml
              </td>
              <td data-alt-units>{{ item.units }}</td>
              <td>
                <span data-alt-fits :hidden="!item.fits">{{ t.fits }}</span>
                <span data-alt-unfit class="c-muted" :hidden="item.fits">{{ t.unsuitable }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <details class="r-legend c-steps">
        <summary>{{ model.labels.common.steps }}</summary>
        <ol class="c-step-list">
          <li>
            {{ t.stepConcentration }}
            <span class="c-mono"
              >{{ model.form.vial }} mg / {{ model.form.solvent }} ml =
              <span data-calc="concentrationMgMl">{{ model.values.concentrationMgMl }}</span>
              mg/ml</span
            >
          </li>
          <li>
            {{ t.stepDose }}
            <span class="c-mono"
              ><span data-calc="doseMcg">{{ model.values.doseMcg }}</span> mcg</span
            >
          </li>
          <li>
            {{ t.stepVolume }}
            <span class="c-mono"
              ><span data-calc="doseMcg">{{ model.values.doseMcg }}</span> mcg /
              <span data-calc="concentrationMcgMl">{{ model.values.concentrationMcgMl }}</span>
              mcg/ml = <span data-calc="volumeMl">{{ model.values.volumeMl }}</span> ml</span
            >
          </li>
          <li data-calc-when="isSpray" :hidden="!model.flags.isSpray">
            {{ t.stepSpray }}
          </li>
          <li data-calc-when="isSyringe" :hidden="model.flags.isSpray">
            {{ format(t.stepUnits, { unitsPerMl: model.form.unitsPerMl ?? '' }) }}
            <span class="c-mono"
              ><span data-calc="volumeMl">{{ model.values.volumeMl }}</span> ml ×
              {{ model.form.unitsPerMl }} =
              <span data-calc="units">{{ model.values.units }}</span></span
            >
          </li>
          <li>
            {{ t.stepCoverage }}
            <span class="c-mono"
              ><span data-calc="vialMcg">{{ model.values.vialMcg }}</span> mcg /
              <span data-calc="doseMcg">{{ model.values.doseMcg }}</span> mcg =
              <span data-calc="dosesPerVial">{{ model.values.dosesPerVial }}</span></span
            >
          </li>
        </ol>
      </details>
    </section>
  </div>
</template>
