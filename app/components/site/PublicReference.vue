<script setup lang="ts">
import type { ReferenceDocModel } from '#shared/types/public'

const props = defineProps<{ model: ReferenceDocModel }>()
const doc = computed(() => props.model.doc)
const labels = computed(() => props.model.labels)
const levels = ['high', 'moderate', 'low', 'preliminary', 'refuted'] as const

function jump(n: number): string {
  return labels.value.jump.replace('{n}', String(n))
}

let section = 0
const index = () => String(++section).padStart(2, '0')
const numbers = {
  claims: doc.value.claims.length > 0 ? index() : '',
  sources: doc.value.sourceGroups.length > 0 ? index() : '',
  sections: doc.value.sections.map(() => index()),
  changes: doc.value.changes.length > 0 ? index() : '',
}
</script>

<template>
  <div class="p-document r-page">
    <a :href="model.basePath" class="p-back">{{ labels.all }}</a>
    <main id="main" class="r-doc">
      <header class="r-hero">
        <p class="r-kicker">
          <span class="p-tag">{{ doc.kind }}</span>
          <time v-if="doc.datetime" :datetime="doc.datetime">{{ doc.date }}</time>
        </p>
        <h1 class="r-title">{{ doc.title }}</h1>
        <ul v-if="doc.topics.length > 0" class="r-chips" :aria-label="labels.topics">
          <li v-for="topic in doc.topics" :key="topic.name">
            <a class="r-chip" :href="topic.href">{{ topic.name }}</a>
          </li>
        </ul>
        <dl class="r-facts">
          <div v-if="doc.researched">
            <dt>{{ labels.researched }}</dt>
            <dd>{{ doc.researched }}</dd>
          </div>
          <div>
            <dt>{{ labels.scope }}</dt>
            <dd>{{ doc.counts }}</dd>
          </div>
        </dl>
        <ul v-if="doc.links.length > 0" class="r-links">
          <li v-for="link in doc.links" :key="link.href">
            <a class="p-button" :href="link.href" rel="noopener"
              >{{ link.label }}<span aria-hidden="true" v-html="model.icons.arrow"
            /></a>
          </li>
        </ul>
        <p v-if="doc.introHtml" class="r-intro" v-html="doc.introHtml" />
      </header>

      <section v-if="doc.claims.length > 0" class="r-section" aria-labelledby="r-claims">
        <h2 id="r-claims" class="p-label r-section-label">
          <span class="p-index">{{ numbers.claims }}</span
          >{{ labels.claimsHeading }}
        </h2>
        <details class="r-legend">
          <summary>{{ labels.legendTitle }}</summary>
          <dl>
            <div v-for="level in levels" :key="level" class="r-legend-row">
              <dt>
                <span class="r-level" :data-level="level"
                  ><span class="r-dot" aria-hidden="true" />{{ labels.levels[level] }}</span
                >
              </dt>
              <dd>{{ labels.legend[level] }}</dd>
            </div>
          </dl>
          <p class="r-legend-note">{{ labels.legendNote }}</p>
        </details>
        <ol class="r-claims">
          <li v-for="(claim, position) in doc.claims" :key="position" class="r-claim">
            <p class="r-claim-text" v-html="claim.html" />
            <div class="r-claim-meta">
              <span class="r-level" :data-level="claim.level">
                <span class="r-dot" aria-hidden="true" />
                <span class="sr-only">{{ labels.evidence }}: </span
                >{{ claim.evidence || labels.levels[claim.level] }}
              </span>
              <span v-if="claim.refs.length > 0" class="r-refs">
                <span class="r-refs-label">{{ labels.refs }}</span>
                <a
                  v-for="n in claim.refs"
                  :key="n"
                  class="r-ref"
                  :href="`#q-${n}`"
                  :aria-label="jump(n)"
                  >{{ n }}</a
                >
              </span>
            </div>
            <p v-if="claim.limitsHtml" class="r-limits">
              <span class="r-limits-label">{{ labels.limits }}</span>
              <span v-html="claim.limitsHtml" />
            </p>
          </li>
        </ol>
      </section>

      <section v-if="doc.sourceGroups.length > 0" class="r-section" aria-labelledby="r-sources">
        <h2 id="r-sources" class="p-label r-section-label">
          <span class="p-index">{{ numbers.sources }}</span
          >{{ labels.sourcesHeading }}
        </h2>
        <div v-for="(group, position) in doc.sourceGroups" :key="position" class="r-source-group">
          <h3 v-if="group.heading" class="r-subheading">{{ group.heading }}</h3>
          <ol class="r-sources">
            <li v-for="item in group.items" :id="`q-${item.n}`" :key="item.n" class="r-source">
              <span class="r-source-n" aria-hidden="true">{{ item.n }}</span>
              <p>
                <span class="sr-only">{{ item.n }}. </span><span v-html="item.html" />
              </p>
            </li>
          </ol>
        </div>
        <p
          v-for="(note, position) in doc.sourceNotes"
          :key="position"
          class="p-notice r-note"
          v-html="note"
        />
      </section>

      <section
        v-for="(item, position) in doc.sections"
        :key="position"
        class="r-section"
        :aria-labelledby="item.heading ? `r-extra-${position}` : undefined"
      >
        <h2 v-if="item.heading" :id="`r-extra-${position}`" class="p-label r-section-label">
          <span class="p-index">{{ numbers.sections[position] }}</span
          >{{ item.heading }}
        </h2>
        <div class="p-prose r-prose" v-html="item.html" />
      </section>

      <section v-if="doc.changes.length > 0" class="r-section" aria-labelledby="r-changes">
        <h2 id="r-changes" class="p-label r-section-label">
          <span class="p-index">{{ numbers.changes }}</span
          >{{ labels.changesHeading }}
        </h2>
        <ol class="r-changes">
          <li v-for="(change, position) in doc.changes" :key="position">
            <time v-if="change.date" :datetime="change.date">{{ change.label }}</time>
            <p v-html="change.html" />
          </li>
        </ol>
      </section>

      <aside v-if="doc.notes.length > 0" class="r-disclaimer" :aria-label="labels.notesHeading">
        <p v-for="(note, position) in doc.notes" :key="position" v-html="note" />
      </aside>
    </main>
    <PublicFooter :footer="model.footer" :text="model.text" />
  </div>
</template>
