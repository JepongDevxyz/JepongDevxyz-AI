# PayMongo QR Ph Integration — Setup Guide (JepongDevxyz AI)

Tatanggap ka na ng totoong bayad via **QR Ph** (GCash / Maya / bank apps).
Gamitin muna ang **test keys** — palitan ng live keys kapag verified na ang account.

## 1. Files (i-copy sa repo)

| File | Punta sa |
|---|---|
| `api/paymongo-create.js` | `JepongDevxyz-AI/api/paymongo-create.js` |
| `api/paymongo-webhook.js` | `JepongDevxyz-AI/api/paymongo-webhook.js` |
| `api/paymongo-status.js` | `JepongDevxyz-AI/api/paymongo-status.js` |
| `supabase/migrations/20260930_paymongo_qrph.sql` | `JepongDevxyz-AI/supabase/migrations/` |
| `paymongo-topup.js` | `JepongDevxyz-AI/paymongo-topup.js` (root, static) |

Sa `index.html`, idagdag **pagkatapos** ng main scripts:
```html
<script src="/paymongo-topup.js"></script>
```
At ang top-up button kahit saan:
```html
<button onclick="JdPay.open()">Top up credits</button>
```

## 2. Database — patakbuhin ang migration

Supabase Dashboard → SQL Editor → i-paste ang buong
`supabase/migrations/20260930_paymongo_qrph.sql` → Run.
Gagawa ito ng `paymongo_payments` + `credit_ledger` tables (may RLS).

## 3. Vercel environment variables

Vercel Dashboard → project → Settings → Environment Variables:

| Name | Saan galing |
|---|---|
| `PAYMONGO_SECRET_KEY` | PayMongo Dashboard → Developers → API Keys → **Test Secret Key** (`sk_test_...`) |
| `PAYMONGO_WEBHOOK_SECRET` | PayMongo Dashboard → Developers → Webhooks → gagawa sa step 4 (i-copy ang signing secret) |
| `SUPABASE_URL` | Hal. `https://czjdygnhdojpqfdpfugo.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → **service_role** (secret — huwag i-commit) |

Pagkatapos magdagdag: **i-redeploy** ang Vercel project.

## 4. Webhook registration

PayMongo Dashboard → **Developers → Webhooks** → Add endpoint:
- URL: `https://<iyong-vercel-domain>/api/paymongo-webhook`
- Events: `payment.paid`, `payment.failed`, `qrph.expired`
- I-copy ang **webhook signing secret** → ilagay sa `PAYMONGO_WEBHOOK_SECRET`.

## 5. Test flow (test mode)

1. Buksan ang app → mag-sign in → i-click **Top up credits**.
2. Piliin ang plan → lalabas ang QR code + ₱ amount + 30:00 timer.
3. Sa test mode, walang totoong scan — i-simulate sa PayMongo Dashboard
   (Developers → Webhooks → piliin ang endpoint → **Send test webhook**,
   event `payment.paid` na may tamang `payment_intent_id`),
   o hintaying mag-expire ang QR para ma-test ang `qrph.expired`.
4. I-check sa Supabase: `paymongo_payments.status` → `paid`,
   `credit_ledger` → may +credits row.

## 6. Go live

Kapag **Activated** na ang PayMongo account:
1. Palitan ang `PAYMONGO_SECRET_KEY` ng **live** key (`sk_live_...`).
2. Gumawa ng **live webhook endpoint** (parehong URL) → palitan ang
   `PAYMONGO_WEBHOOK_SECRET` ng live signing secret.
3. I-redeploy.

## 7. Presyo

Ang plans ay nasa `api/paymongo-create.js` → `PLANS`
(halaga = **centavos**, ₱1 = 100). Baguhin doon kung iba ang gusto mo:

```js
starter: { name: 'Starter Pack', amount: 2900,  credits: 1000,  blurb: '₱29 — 1,000 credits' },
pro:     { name: 'Pro Pack',     amount: 9900,  credits: 5000,  blurb: '₱99 — 5,000 credits' },
max:     { name: 'Max Pack',     amount: 19900, credits: 12000, blurb: '₱199 — 12,000 credits' },
```

Panatilihing tugma ang `blurb` sa `paymongo-topup.js` → `PLANS` (display lang 'yon;
ang totoong presyo ay laging galing sa server).

## Security notes

- Ang presyo ay **never** galing sa client — `plan_id` lang ang pinapadala.
- Ang webhook ay vine-verify via `Paymongo-Signature` (HMAC-SHA256) **bago** mag-parse.
- Idempotent: kahit mag-retry ang PayMongo, isang beses lang madadagdagan ang credits.
- Ang user identity ay vine-verify server-side via Supabase Auth API.
