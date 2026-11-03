<script setup>
// One labelled slider with its value pill and optional hint, used by the What-if panel.
// Optional extras (the flat price growth slider uses them): `strong` (a dark value pill), `presets`
// ([{ label, value }] in the slider's own units), `resetTo` (a button back to the saved plan's value), `mineAt`
// (0–1: a tick where the saved plan's value sits) and `zone` ({ at: 0–1, label }: from `at` to the end, the answer
// flips, e.g. "Resale wins above 6%"). The tick and the zone are decoration: the legend under the track says both.
import Term from '../Term.vue';

const props = defineProps({
  // { key, id, label, hint?, term? ({ id, lead, text }), link?, markAt? (0–1, D40), min, max, step, scale, value, text,
  //   strong?, presets?, resetTo?, mineAt?, mineText?, zone? }
  slider: { type: Object, required: true },
});
const pick = (value) => emit('change', props.slider.key, value, props.slider.scale);
const emit = defineEmits(['change']);
</script>

<template>
  <div class="mb-3">
    <div class="d-flex justify-content-between align-items-baseline gap-2 small">
      <label :for="slider.id" class="fw-semibold">{{ slider.label }}</label>
      <span class="d-inline-flex align-items-center gap-2">
        <output :for="slider.id" class="whatif-value text-numeric" :class="{ 'whatif-value--strong': slider.strong }" :data-cy="`${slider.id}-value`">{{ slider.text }}</output>
        <button
          v-if="slider.resetTo !== undefined && slider.resetTo !== null && slider.resetTo !== slider.value"
          type="button"
          class="whatif-reset-one"
          :aria-label="`Reset ${slider.label.toLowerCase()} to your input`"
          :data-cy="`${slider.id}-reset`"
          @click="pick(slider.resetTo)"
        ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg></button>
      </span>
    </div>
    <div v-if="slider.presets" class="whatif-presets" role="group" :aria-label="`${slider.label}: quick picks`">
      <button
        v-for="pr in slider.presets"
        :key="pr.value"
        type="button"
        :aria-pressed="pr.value === slider.value ? 'true' : 'false'"
        :data-cy="`${slider.id}-preset-${pr.value}`"
        @click="pick(pr.value)"
      >{{ pr.label }}</button>
    </div>
    <div class="whatif-track" :class="{ 'whatif-track--zoned': slider.zone }">
      <!-- Drawn under the slider (its own track is see-through here), so the thumb stays on top. -->
      <span v-if="slider.zone" class="whatif-track__base" aria-hidden="true"></span>
      <span v-if="slider.zone" class="whatif-track__zone" :class="`whatif-track__zone--${slider.zone.tone}`" :style="{ '--at': slider.zone.at }" aria-hidden="true"></span>
      <span v-if="typeof slider.mineAt === 'number'" class="whatif-track__mine" :style="{ '--at': slider.mineAt }" aria-hidden="true"></span>
      <input
        :id="slider.id"
        type="range"
        class="form-range"
        :min="slider.min"
        :max="slider.max"
        :step="slider.step"
        :value="slider.value"
        :aria-valuetext="slider.text"
        :data-cy="`${slider.id}-slider`"
        :aria-describedby="slider.hint ? `${slider.id}-hint` : undefined"
        @input="emit('change', slider.key, $event.target.value, slider.scale)"
      />
      <!-- D40: where the verdict flips. Decoration only: the hint says it in words. -->
      <span
        v-if="typeof slider.markAt === 'number'"
        class="whatif-track__mark"
        :style="{ '--at': slider.markAt }"
        aria-hidden="true"
        :data-cy="`${slider.id}-mark`"
      ></span>
    </div>
    <div v-if="slider.zone || slider.mineText" class="whatif-keys" :data-cy="`${slider.id}-keys`">
      <span v-if="slider.mineText"><i class="whatif-keys__mine" aria-hidden="true"></i>{{ slider.mineText }}</span>
      <span v-if="slider.zone"><i class="whatif-keys__zone" :class="`whatif-keys__zone--${slider.zone.tone}`" aria-hidden="true"></i>{{ slider.zone.label }}</span>
    </div>
    <div v-if="slider.hint" :id="`${slider.id}-hint`" class="form-text mt-0" :data-cy="`${slider.id}-hint`">
      {{ slider.hint }}
      <template v-if="slider.term">{{ slider.term.lead }}<Term :id="slider.term.id">{{ slider.term.text }}</Term>.</template>
      <a v-if="slider.link" :href="slider.link.href" target="_blank" rel="noopener noreferrer">{{ slider.link.text }}<span class="visually-hidden"> (opens in a new tab)</span> ↗</a>
    </div>
  </div>
</template>

<style scoped>
.whatif-value {
  background: var(--accent-fill-3);
  border-radius: var(--radius-pill);
  padding: 0 0.625rem;
  font-weight: 500;
  white-space: nowrap;
}
.whatif-value--strong { background: var(--primary); color: var(--on-primary); font-weight: 600; padding: 0.125rem 0.75rem; }
.whatif-reset-one { width: 30px; height: 30px; border: 0; border-radius: 50%; display: grid; place-items: center; background: var(--bg-page); color: var(--text-primary); cursor: pointer; }
.whatif-reset-one:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.whatif-presets { display: flex; flex-wrap: wrap; gap: var(--space-2); margin: var(--space-2) 0; }
.whatif-presets button {
  min-height: 36px; padding: 0 var(--space-3); border-radius: var(--radius-pill);
  border: 1.5px solid var(--border); background: var(--bg-surface); color: var(--text-primary); font-size: 0.8125rem; font-weight: 500; cursor: pointer;
}
.whatif-presets button[aria-pressed='true'] { border-color: var(--primary); background: var(--accent-fill-3); }
.whatif-presets button:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
/* --at is 0..1 along the range; the thumb's centre runs from 8px in to 8px from the end (a 16px thumb). */
.whatif-track__base, .whatif-track__zone { position: absolute; top: 50%; height: 6px; margin-top: -3px; border-radius: 3px; pointer-events: none; }
.whatif-track__base { left: 0; right: 0; background: var(--accent-fill-3); }
.whatif-track__zone { left: calc(8px + (100% - 16px) * var(--at)); right: 0; border-radius: 0 3px 3px 0; background: var(--accent-fill-1); }
.whatif-track__mine { position: absolute; top: 50%; left: calc(8px + (100% - 16px) * var(--at)); width: 2px; height: 18px; margin: -9px 0 0 -1px; border-radius: 1px; background: var(--text-secondary); pointer-events: none; }
.whatif-track--zoned .form-range { position: relative; z-index: 1; }
.whatif-track--zoned .form-range::-webkit-slider-runnable-track { background: transparent; }
.whatif-track--zoned .form-range::-moz-range-track { background: transparent; }
.whatif-keys { display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2); font-size: 0.75rem; color: var(--text-secondary); margin-top: var(--space-1); }
.whatif-keys span { display: inline-flex; align-items: center; gap: var(--space-2); }
.whatif-keys__mine { display: inline-block; width: 2px; height: 12px; border-radius: 1px; background: var(--text-secondary); }
.whatif-keys__zone { display: inline-block; width: 10px; height: 10px; border-radius: 3px; background: var(--accent-fill-1); }
/* The zone takes the colour of the path that wins in it: resale pink, BTO soft indigo. */
.whatif-track__zone--bto, .whatif-keys__zone--bto { background: #8e97c9; }
</style>
