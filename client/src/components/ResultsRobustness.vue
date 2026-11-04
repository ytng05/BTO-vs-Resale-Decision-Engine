<script setup>
// "Would the answer change?": the heatmap in small (every growth combination tested, coloured by the path ahead),
// the server's break-even sentence, and the BTO price where the answer flips (D40). The full grid with its labels
// and the tap-to-explain squares is one click away ("See the full grid"), under More detail. Not a forecast.
import { computed } from 'vue';
import Term from './Term.vue';
import { gridSummary } from '../utils/resultsSummary.js';

const props = defineProps({
  grid: { type: Array, default: () => [] },
  breakEvenSentence: { type: String, default: '' },
  btoPriceSentence: { type: String, default: '' },
});
const emit = defineEmits(['open-grid']);
const g = computed(() => gridSummary(props.grid));
const label = computed(() => (g.value.total ? `${g.value.total} squares: BTO ahead in ${g.value.a}, resale in ${g.value.b}` : ''));
</script>

<template>
  <section class="rb" aria-labelledby="rb-title" data-cy="results-robustness">
    <h2 id="rb-title" class="rb__title">Would the answer change?</h2>
    <p v-if="g.line" class="rb__lead" data-cy="results-robustness-line">{{ g.line }}</p>
    <div class="rb__body">
      <div
        v-if="g.total"
        class="rb__grid"
        role="img"
        :aria-label="label"
        :style="{ gridTemplateColumns: `repeat(${g.cols}, 14px)` }"
        data-cy="results-mini-grid"
      >
        <template v-for="(row, r) in g.rows" :key="r">
          <span v-for="(w, c) in row" :key="c" class="rb__cell" :class="`rb__cell--${w.toLowerCase()}`"></span>
        </template>
      </div>
      <div class="rb__text">
        <p v-if="breakEvenSentence" class="rb__sentence" data-cy="results-breakeven-sentence">{{ breakEvenSentence }}</p>
        <p v-if="btoPriceSentence" class="rb__sentence" data-cy="results-bto-price-breakeven">{{ btoPriceSentence }}</p>
      </div>
    </div>
    <p class="rb__caption">
      Each square is one combination of flat price and income growth: dark for BTO ahead, pink for resale. The
      <Term id="break-even">break-even</Term> line is not a prediction of prices.
      <button type="button" class="rb__link d-print-none" data-cy="results-heatmap-open" @click="emit('open-grid')">See the full grid</button>
    </p>
  </section>
</template>

<style scoped>
.rb { display: flex; flex-direction: column; gap: var(--space-3); height: 100%; padding: clamp(20px, 3vw, 32px); border-radius: var(--radius-md); background: var(--indigo-tint); border: 1px solid var(--accent-fill-3); }
.rb__title { margin: 0; font-size: 1.375rem; font-weight: 600; }
.rb__lead { margin: 0; font-weight: 600; }
.rb__body { display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: flex-start; }
.rb__grid { display: grid; gap: 3px; flex: none; }
.rb__cell { width: 14px; height: 14px; border-radius: 3px; background: var(--border); }
.rb__cell--a { background: var(--accent-deep); }
.rb__cell--b { background: var(--accent-fill-1); }
.rb__text { flex: 1 1 240px; min-width: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.rb__sentence { margin: 0; font-size: 0.9375rem; line-height: 1.5; color: var(--text-secondary); }
.rb__caption { margin: auto 0 0; font-size: 0.8125rem; color: var(--text-secondary); }
.rb__link { padding: 0; border: 0; background: none; font: inherit; font-weight: 600; color: var(--text-primary); text-decoration: underline; cursor: pointer; }
.rb__link:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; border-radius: 2px; }
</style>
