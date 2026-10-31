# HeroScene

An ambient, full-width illustration of an HDB estate: residents walk, cycle and scoot along a gently rolling ground line in front of slab blocks, a void deck and a rain tree.

- **When to use:** once, on the home page, under or beside the hero copy to set a friendly, local tone. Never on task screens (plan, results, dashboard), never behind text and never more than once per page.
- **Look:** the Calm palette. White back blocks outlined in ink with `color-periwinkle` windows; a `color-periwinkle` front block with `color-pink` windows and a void deck; a `color-pink` rain tree with `color-blush` highlights on an ink trunk; periwinkle ground on `bg-page`. People are ink line work with pink and blush clothing and white faces. No semantic colours. The Vue file carries hex fallbacks so it renders before the app's tokens are updated.
- **Cast:** an aunty pulling a market trolley (slow, turns at the edges), an office worker with a lanyard (turns at the edges), a kid on a scooter and an uncle on a bicycle (both leave one side and re-enter from the other, tilting with the slope), and a void-deck cat flicking its tail.
- **Motion:** pure CSS, no script. Each resident follows the ground curve on a CSS motion path (`offset-path`); legs, wheels and the cat's tail animate with keyframes. Under `prefers-reduced-motion: reduce` everything holds still in place; browsers without `offset-path` hide the residents and keep the estate.
- **Accessibility:** decorative. The SVG carries one `aria-label` describing the scene; nothing in it is interactive or needed to complete a task.
- **Sizing:** `viewBox="0 0 1200 400"`, `width: 100%`, height follows the 3:1 ratio. Figures are about 45 units tall, so below ~600px wide consider hiding it or cropping it with a fixed-height container and `preserveAspectRatio="xMidYMax slice"`.

The consumer supplies only a full-width container. In the Vue app, drop `HeroScene.vue` (in this folder) into `client/src/components/` and render `<HeroScene />`. It reads the CSS custom properties from `_tokens.scss` and carries `data-cy="hero-scene"`.

Intentional addition, not from the repository: inspired by an ambient hillside hero, redrawn for an HDB estate.
