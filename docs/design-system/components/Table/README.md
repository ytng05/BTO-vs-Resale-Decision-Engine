# Table

Bootstrap tables for side-by-side numbers, BTO against resale.

- `.table` with `border` rules; header row in `small`, `text-secondary`, semibold. Row headers are `<th scope="row">`.
- Every amount in `.text-numeric` (tabular figures) and formatted `S$9,600`; a source line ("paid from CPF OA") sits under it in `small text-secondary`.
- Wide tables scroll inside their own `overflow-x: auto` container (`.table-responsive`), never the page; long ones get a sticky header.
- Below md, `.dash-grants` stacks each row and writes the column name above each cell from its `data-label`.

The consumer supplies the rows, an empty state ("No cost breakdown in this result.") and `data-cy` hooks.
