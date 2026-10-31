# Heatmap

The decision surface: a DOM table of square cells showing which path ends ahead across two assumptions.

- `.heatmap__table` – separate borders with a `space-1` gap; axis labels in `text-secondary`, weight 500, tabular figures.
- Cells (`.heatmap__cell`, `radius-sm`): `--a` `data-bto` (ink) for BTO / path A, `--b` `data-resale` (pink) for resale / path B, `--tie` `border` for level. Ink and pink differ strongly in lightness, and every cell is labelled.
- The whole cell is a `.heatmap__hit` button, 48px tall (`space-8`), at least 32px wide on phones and 48px from sm, with a 2px `text-primary` focus outline. `--selected` adds a white inset ring; `.heatmap__you` marks the user's own position.
- Never colour alone: a legend (`.heatmap__legend` with `.heatmap__swatch`), a `title`/`aria-label` on every cell stating its value in words, and an `aria-label` on the figure.

The consumer supplies the axes, the cell outcomes, the selected cell and `data-cy` hooks (`heatmap`, `heatmap-cell-r0-c3`, `heatmap-legend`).
