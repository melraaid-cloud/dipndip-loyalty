# dipndip Morning Club

Production MVP for dipndip Libya Morning Club.

## Locked business rules
- 99 LYD per 30 days from activation/renewal.
- One selected coffee per member per local day.
- Every day of the week.
- Redemption only 08:00–10:00 Africa/Tripoli.
- No rollover.
- One daily redemption across all branches.
- Personal/non-transferable QR token.
- No food discount in v1.
- No orange/premium upgrade in v1.

## Customer flow
1. Customer registers at `/`.
2. Digital card is created immediately in `pending`.
3. Customer pays 99 LYD at a branch.
4. Staff opens `/staff`, looks up/scans card, records payment and activates.
5. Membership runs for 30 days.
6. Each morning the cashier redeems once; duplicate daily redemption is blocked by a database unique constraint.
7. Staff can record POS receipt and additional spend so Food Attach Rate is measurable.
8. Renewal adds 30 days from the current expiry if still active, otherwise from renewal time.

## Management
- `/admin`: active/pending members, 30-day membership revenue, redemptions, Food Attach Rate, average extra spend, usage chart and member list.
- CSV export for deeper analysis.
- Roles: super_admin, admin, manager, cashier.
- Audit log captures activation, renewal, redemption and suspension.

## Wallet
### Apple Wallet
Code supports signed `.pkpass` issuance once the required Apple Pass Type ID certificate, private key and WWDR certificate are supplied as base64 environment variables. It includes the Apple device registration/update web-service protocol and optional branch `locations` relevance.

### Google Wallet
Code creates a signed Generic pass JWT using a Google service-account RSA private key. The issuer must complete Google Wallet onboarding/publishing and provide Issuer ID + service-account credentials.

The public card page automatically hides wallet buttons until the corresponding credentials are configured.

## Deployment
Designed for Render:
- Runtime: Node
- Build: `cd morning-club && npm install && npm run check`
- Start: `cd morning-club && npm start`
- PostgreSQL required.
- Health check: `/health`

## Required production env
See `.env.example`.
