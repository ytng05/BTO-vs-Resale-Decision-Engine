<script setup>
// The disclaimer on every page. If the ruleset has NOT been checked against its sources, an amber warning shows here
// on every page. (When it is verified, the "checked" status shows on Home, under Good to know.)
// If the ruleset can't be loaded, nothing extra is shown rather than something wrong.
import { computed, onMounted, ref } from 'vue';
import { getRuleset } from '../api/client.js';

const ruleset = ref(null);
const rulesetDate = computed(() => {
  const d = ruleset.value?.version ? new Date(`${ruleset.value.version}T00:00:00`) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
});
const verified = computed(() => ruleset.value?.status === 'VERIFIED');

onMounted(async () => {
  try {
    ruleset.value = await getRuleset();
  } catch {
    ruleset.value = null;
  }
});
</script>

<template>
  <p class="disclaimer mb-0" data-cy="disclaimer-banner">
    Illustrative projection, not financial advice. Results depend on the assumptions and the ruleset version shown.
    <span v-if="rulesetDate && !verified" class="disclaimer__ruleset disclaimer__ruleset--warn" data-cy="disclaimer-ruleset-status">
      <span class="disclaimer__dot" aria-hidden="true"></span>
      Ruleset {{ rulesetDate }} · not yet verified against its sources
    </span>
  </p>
</template>

<style scoped>
.disclaimer__ruleset {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: var(--space-2);
  padding: 2px var(--space-3);
  border-radius: var(--radius-pill);
  font-weight: 500;
  white-space: nowrap;
}
.disclaimer__dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
/* The warning is the part that matters: amber pill, so it is noticed on every page. */
.disclaimer__ruleset--warn { background: var(--warning-fill); color: var(--warning); }
/* Narrow screens: the pill drops onto its own line instead of overflowing. */
@media (max-width: 575.98px) {
  .disclaimer__ruleset { display: flex; width: fit-content; margin: var(--space-2) 0 0; white-space: normal; }
}
</style>