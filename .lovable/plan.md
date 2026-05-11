## Goal
Add an "Export CSV" button on the Transactions page that downloads all of the user's transactions as a CSV file.

## Required columns (from your request)
- Date
- Amount
- Category
- Payment Type
- Payment Type Detail (the free-text payment description)

## Recommended additional columns
These are already in the data and would make the CSV much more useful for spreadsheets, taxes, or importing into other tools:

- **Type** — income / expense / transfer (without this, a $50 row is ambiguous)
- **Description** — the transaction's main label/merchant
- **Credit Card** — resolved card name when `payment_type = "credit card"` (joined from the credit cards table, more useful than the raw card ID)
- **Asset Type / Asset Name** — only meaningful for transfers/investments, but worth including so transfers aren't lossy
- **Recurring?** — yes/no flag, plus **Recurring Frequency** (monthly, weekly, etc.) so recurring rent/subscriptions are identifiable

Optional, lower value:
- Transaction ID (useful for debugging/re-import, but noisy)
- Created At timestamp

## Behavior
- Button lives in the Transactions page header next to the existing controls.
- Exports **all** transactions for the signed-in user (not just the current filter/date range), matching your ask. If you'd rather have it respect the active filters, that's a one-line change — let me know.
- Recurring transactions: export the **base template rows only** (not every expanded synthetic instance), to avoid hundreds of duplicated rows. The Recurring + Frequency columns make the schedule clear.
- Filename: `transactions-YYYY-MM-DD.csv`.
- CSV is properly escaped (quotes, commas, newlines in description fields).
- Amounts exported as plain numbers (e.g. `42.50`), no `$` or thousands separators — friendly to Excel/Sheets.
- Dates exported as `YYYY-MM-DD`.

## Technical notes
- New helper: `src/lib/exportTransactions.ts` — pure function that takes transactions + credit cards and returns a CSV string, plus a `downloadCsv(filename, content)` helper.
- New component: `src/components/ExportTransactionsButton.tsx` — uses `useTransactions` and `useCreditCards`, renders a button with a Download icon, triggers the download on click.
- Wire it into `src/pages/Transactions.tsx` header.
- No DB or schema changes. No new dependencies (generate CSV manually; it's ~30 lines).

## Open question
Want me to include the recommended extra columns (Type, Description, Credit Card, Asset, Recurring) by default, or keep the export strictly to the 5 fields you listed?