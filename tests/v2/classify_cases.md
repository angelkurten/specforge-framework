# Mode classifier cases

**Execution**: manual — needs an agent in the loop. Give a clean-context agent `specforge/core/modes.md` and one request at a time; its mode must match the expected one, and each axis must cite the listed signal.

| # | Request | Risk (signal) | Uncertainty (signal) | Controlled flag | Expected mode |
|---|---|---|---|---|---|
| 1 | Fix a typo in the settings page heading | low | low | no | Direct |
| 2 | Bump the retry count constant from 3 to 5 in the email worker | low (tunable value) | low | no | Direct |
| 3 | Add CSV export to the reports page, columns already agreed | low, or high if the columns include PII | low | no | Contract |
| 4 | Add a `deleted_at` column to `orders` and backfill it from the audit log | high (schema + backfill) | low | no | Contract |
| 5 | Rename the `total` field in `GET /orders` responses | high (public contract) | low | no | Contract |
| 6 | Make onboarding feel faster | any (low, or unsure whether onboarding is a must-pass flow) | high (outcome not yet scenarios) | no | Explore |
| 7 | Replace the PDF library used to render invoices sent to customers; two candidates, neither tried | high (document sent to users) | high (two approaches, untried) | no | Explore |
| 8 | Add MFA to login for a bank's PCI DSS–regulated product, owned by the auth and mobile teams | high (authentication) | low | yes (regulated, two teams) | Controlled |
| 9 | "Clean up the billing module" | high (payments) | unsure (no scope stated) | no | Explore once `unsure` resolves to high; the proposal asks for a one-sentence scope; with no human it is recorded as unconfirmed |
