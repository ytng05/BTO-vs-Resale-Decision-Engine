# Stepper

Progress through the multi-step plan flow: a centred numbered track from md up, "Step 2 of 4" with a progress bar below md.

- `ol.step-track` – centred `.step-track__item`s, each a 36px `.step-track__num` circle with the step name underneath (14px, weight 500), joined by 2px connectors.
- States: upcoming – white circle, `border` ring, slate number and label, `border` connector. `--done` – white circle with an ink ring and number, ink connector to the next step. `--current` – ink circle with a white number, a 5px `accent-soft` (blush) halo, ink label and `aria-current="step"`.
- Three to five steps, named by what the person does ("What matters", "About you", "Your BTO", "Resale flat"), not by system terms.
- `.stepper-mobile` – shown below md instead: a slate label and a 4px `border` track with a `primary` (ink) fill (`radius-pill`).
- The older boxed `.stepper` still exists in `bundle.css` for the current app.
- Back/Next sit at the bottom of the step; Next is the screen's one primary button (`.btn-wide` when centred).

The consumer supplies the step labels, the current index and `data-cy="stepper-step-N"` on each item. Add a visually hidden ", done" to finished steps for screen readers. (In this preview both versions are forced visible.)
