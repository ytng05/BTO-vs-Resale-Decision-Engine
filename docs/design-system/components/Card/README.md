# Card

The surface for summaries, panels and scenarios: white on the mist page, lifted by a soft shadow.

- `.card` – `bg-surface`, `radius-md`, `shadow-sm` at rest, stepping up to `shadow-md` on hover or focus-within.
- Feature card – the one highlighted card on a screen: `bg-feature` (periwinkle), `radius-lg`, a 1px white edge, usually holding a line drawing.
- `.hero-statement` – the one most important sentence on a results page, in `h2` and `text-primary`, above any chart and with no card chrome.
- `.dash-card--bto` / `.dash-card--resale` – a 4px top border in `data-bto` (ink) / `data-resale` (pink) marking the path, paired with a `.dash-dot` and a text label.
- `.compare-card--winner` – a `primary` border ring for the scenario that is ahead overall. Inside it, `.compare-path` rows (`radius-sm`, `space-3` padding, tabular `__value`); `--ahead` tints the row `bg-feature`, and an "Ahead" badge carries the meaning.

The consumer supplies the content, headings in the right level and money formatted as `S$120,000`.
