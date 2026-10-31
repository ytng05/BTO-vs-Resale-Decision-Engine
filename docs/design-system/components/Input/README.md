# Input

Text inputs, selects and sliders on Bootstrap's form classes: label above, helper text below, specific errors.

- Label above every field (`.form-label`, `label` style, `text-primary`); a placeholder is never the only label. Mark optional fields with a `text-secondary` "(optional)".
- Field: `.form-control` / `.form-select` on `color-white`, `1px border`, `radius-sm`, placeholder in `text-tertiary`, disabled on `surface-disabled`. Money fields use an `.input-group-text` "S$" prefix.
- Focus: `focus-ring` border and a 2px `focus-ring` ring with a 2px `bg-page` offset.
- Helper text below in `.form-text` (`caption`, `text-secondary`). On error, add `.is-invalid` and an `.invalid-feedback` in `danger` that says what is wrong and how to fix it.
- For a short set of options use `Chip`; for floor bands use `FloorPicker`.
- Sliders show a live numeric readout with units and carry `aria-valuenow`/`min`/`max`.

The consumer supplies the `id`/`for` pair, value, validation message and a `data-cy` such as `situation-buyer-1-age-error`.
