# Alert

Inline messages for status and errors, plus the ambient disclaimer.

- `.alert.alert-info|success|warning|danger` – Bootstrap alerts derived from the `info`, `success`, `warning` and `danger` theme colours, `radius-md`, `space-4` padding. Add an icon and a close control if dismissible.
- Errors say what went wrong and what to do next, in plain language.
- `.disclaimer` – the persistent "Illustrative projection, not financial advice…" line in `caption`, `text-secondary`, no fill, so it reads as ambient, not alarming. It sits with every result.
- Toasts (top right on desktop, full width on mobile, auto-dismiss after 5s unless an error) and modals (`bg-surface-raised`, `radius-lg`, `shadow-lg`, focus trapped) follow the same rules.

The consumer supplies the message, `role="alert"` for errors (`status` otherwise) and `data-cy="disclaimer-banner"` on the disclaimer.
