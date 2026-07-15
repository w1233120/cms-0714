# Inline table editing

The pattern used by the Course list (`features/courses/course-list/`). PrimeNG's built-in
`pEditableColumn` opens a cell on a **single** click; when a feature needs double-click (and
single-click must not edit), roll it manually instead of using `pEditableColumn`.

> `spec/inline-edit.md` is referenced by `spec/feature-spec.template.md` but does not exist;
> this doc is the actual pattern.

## Mechanics

- Each editable `<td>` has `(dblclick)="startEdit(row, field)"`. Read-only columns have no handler,
  and `startEdit` also guards against non-editable fields via an allow-list (defence in depth).
- One cell edits at a time: the component holds `editing = { pk, field }`, `editValue`, `editError`.
- Editor type matches the column: text / number / date / `p-select` / `p-checkbox`. The
  `appAutofocus` directive focuses the editor so blur-to-save is usable.
- Commit trigger: **blur** for text/number/date; **change** for `p-select`/`p-checkbox` (PrimeNG
  blur is unreliable there). A `saving` re-entrancy guard prevents a double PUT.

## `commit()` contract

1. **Validate** `editValue`. On failure: set `editError`, keep the cell open in edit mode, do **not**
   call the server.
2. On success: build the full write DTO from the row, apply the edited field, call the update endpoint.
3. **Server success** → replace the row with the response (so joined FK labels refresh), clear edit state.
4. **Server failure** → the row was never mutated, so exit edit mode (value reverts) and toast the error.

## Validation examples (Course)

Required text not blank; numbers finite and non-negative where required; dates valid; cross-field
(`ScheduleOn ≤ ScheduleOff`). FK-label columns (原廠, 課程群組) and the PK stay read-only; the 上架狀態
dropdown edits `publishStatusPkid` and the returned row carries the refreshed description label.

## Tests

Drive `startEdit` / `commit` directly (not DOM events): assert read-only fields are no-ops, a valid
commit calls `update` and swaps in the response, each validation rule blocks the PUT and keeps the cell
open, and a failed save reverts the row. See `course-list.spec.ts`.
