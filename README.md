# The Friend Exchange

*A fictional-points prediction exchange for questions that matter only to your friends.*

Last verified against the canonical workspace: **July 27, 2026**

This is the current static application built with:

- Plain HTML, CSS, and JavaScript
- Supabase for the database and email/password accounts
- GitHub Pages (or any static host) for publishing

There is no build step, package manager, framework, or custom server.

For the authoritative product rules, brand voice, visual system, architecture,
production status, and future-work guardrails, see `PROJECT_CONTEXT.md`.

## What is included

- Required display name, email, and password registration
- Registration restricted to administrator-approved email addresses
- Email confirmation before first sign-in
- Normal email/password login from multiple devices
- Password-reset emails and an in-app new-password screen
- 1,000 starting points per person
- 100-point monthly allowance for anyone signed in within the preceding 90 days
- Markets with 2–10 outcomes
- Yes/No questions are simply two-outcome markets
- Public community odds that respond to point totals
- 25 display-only seed points per outcome to soften early odds
- Multiple predictions per person, including on different outcomes
- No withdrawing or moving committed points
- Proportional pari-mutuel payouts from the full real-point pool
- Automatic refunds when nobody selected the winning outcome
- Creator-controlled resolution after the closing time
- Administration page for invitations and point adjustments
- Dedicated desktop and mobile Admin navigation; the account modal contains
  account actions only
- Administrator market controls for early resolution and voiding
- Activity feed, leaderboard, completed markets, and status-filtered personal
  prediction history
- Sortable leaderboard ranked by realized **Profit / loss** by default
- Leaderboard highlights for **Current robber baron**, the all-time **Largest wager**,
  and **Points wagered** during the rolling last 30 days
- Current balance, points currently committed, all-time committed, and
  **Profit / loss** on personal portfolios
- Portfolio filters for **All**, **Active**, **Won**, **Lost**, and **Refunded**
- **Profit / loss** on the leaderboard
- Optional real-time updates across open browsers
- Responsive desktop and mobile design

## Current production status

Confirmed in production:

- GitHub Pages hosting
- Registration restricted to approved email addresses
- Email confirmation before first sign-in
- Password reset
- Desktop date/time-field rendering
- Physical iPhone Safari date/time-field rendering

Configured but not yet exercised on a first-of-month run:

- The monthly active-trader allowance cron

Not yet verified:

- Real-time automatic refresh across multiple simultaneously open browsers

“Real-time” means that an open browser should refresh its displayed data after
another trader creates a market, commits points, resolves or voids a market, or
changes another published record. The subscription and database publication
configuration are present, but this behavior has not yet been confirmed in
production.

## Important model note

The displayed percentages are **community odds**, not true contract prices. They are calculated as:

```text
(outcome's real points + 25 seed points)
÷
(all real points + all seed points)
```

The 25-point seed is only used for the display. It is never included in payouts.

When a market resolves, the full pool of actual committed points is divided among people who selected the winning outcome. Each winner receives the same proportion of the total pool as their proportion of the winning side.

Example:

```text
Total pool: 1,000 points
Points on the winning outcome: 300
Your points on the winner: 100

Your payout:
100 ÷ 300 × 1,000 = 333 points
```

Integer rounding leftovers are distributed automatically so the entire pool is paid out exactly.

---

# Setup

## 1. Create a Supabase project

1. Create a new Supabase project.
2. Wait for the project to finish provisioning.
3. Open **SQL Editor**.
4. Create a new query.
5. Copy the entire contents of `database.sql` into the editor.
6. Click **Run**.

The SQL creates all tables, indexes, security policies, profile automation,
payout logic, database functions, and the monthly allowance schedule.

For a new Supabase project, run the complete file once.

For an existing live project, do **not** rerun `database.sql`. Back up the
database, inspect the live schema, and run only the migrations that have not
already been applied:

1. `migrations/20260724_monthly_allowance.sql` adds the retry-safe allowance
   ledger and schedules the award for 06:05 UTC on the first of each month,
   which is 00:05 CST or 01:05 CDT.
2. `migrations/20260727_email_allowlist.sql` adds the approved-email registry,
   grandfathers existing accounts, and creates the secure signup hook and
   administrator functions.

The email-allowlist migration does not enable the Auth hook automatically.
Complete the authentication steps below after publishing the matching front-end
files.

## 2. Configure email/password authentication

In the Supabase dashboard:

1. Open **Authentication**.
2. Open **Providers** or **Sign In / Providers**.
3. Open the **Email** provider.
4. Make sure email/password sign-in is enabled.
5. Turn **Confirm email** on.
6. Save the provider settings.

Leave **Anonymous Sign-Ins** disabled. This version does not use anonymous accounts.

New users must follow the confirmation link before they can enter the exchange.
Existing accounts remain active.

### Configure outbound authentication email

Configure a custom SMTP provider under **Authentication → Email → SMTP
Settings** before enabling confirmation. Supabase's built-in mailer is intended
only for testing, has a low rate limit, and ordinarily sends only to addresses
belonging to members of the Supabase project team. A custom SMTP provider is
therefore required for normal friend addresses. Test both a password-reset
message and a signup-confirmation message.

Reference: [Supabase custom SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).

One option is [Resend](https://resend.com):

1. Create a Resend account and add a domain you control.
2. Add the DNS records supplied by Resend, then wait for SPF and DKIM to show as
   verified. Configure DMARC as recommended by your email provider.
3. Create a Resend API key for SMTP and keep it private.
4. In Supabase, open **Authentication → Email → SMTP Settings** and enter:
   - **Host:** `smtp.resend.com`
   - **Port:** `465` or `587`
   - **Username:** `resend`
   - **Password:** the Resend API key
   - **Sender email:** an address on the verified domain, such as
     `friendexchange@yourdomain.com`
   - **Sender name:** a recognizable name for the exchange
5. Save the SMTP settings and send both a password-reset email and a new-account
   confirmation email to verify delivery.

### Enable the approved-email hook

After running the migration:

1. On a brand-new project with no accounts, add the first administrator email
   before enabling the hook:

   ```sql
   insert into public.approved_signup_emails (email)
   values (lower('you@example.com'));
   ```

   Existing-project migrations already grandfather all current accounts.
2. Open **Authentication → Hooks**.
3. Find **Before User Created**.
4. Choose the Postgres function
   `public.hook_require_approved_email`.
5. Enable and save the hook.

The hook rejects unapproved addresses before an Auth user or public profile is
created. Do not substitute a browser-only email check; the database hook is the
security boundary.

Reference: [Supabase Before User Created hook documentation](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook).

## 3. Configure the site and password-reset URLs

Password-reset emails must be allowed to redirect back to your app.

In Supabase:

1. Open **Authentication → URL Configuration**.
2. Set **Site URL** to your published site URL once you have one.
3. Under **Redirect URLs**, add the exact local URL you use while testing.
4. Also add the exact published GitHub Pages URL after deployment.

Examples:

```text
http://127.0.0.1:5500/friend-exchange/index.html
https://YOUR-GITHUB-NAME.github.io/friend-exchange/
```

Use the actual URL shown in your browser. The app sends password-reset users back to the current page's origin and path.

If your local server opens a different address, such as `http://localhost:8000/`, add that address instead. You may keep both local and published URLs in the allowlist.

Reference: [Supabase redirect URL documentation](https://supabase.com/docs/guides/auth/redirect-urls).

## 4. Add your project information

In Supabase:

1. Open **Project Settings**.
2. Open **API Keys**.
3. Copy the **Project URL**.
4. Copy the **Publishable key**.

Copy `config.example.js` to `config.js`, then replace these placeholders:

```js
window.FRIEND_EXCHANGE_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabasePublishableKey: "YOUR-PUBLISHABLE-KEY",
  appName: "The Friend Exchange",
  tagline: "Markets of consequence. Sort of.",
};
```

Use the **Publishable key**, not a Secret key or legacy `service_role` key.

The Publishable key is expected to be visible in browser code. The included Row Level Security rules and database functions are what prevent visitors from editing balances, changing results, or bypassing the prediction rules.

Do not paste the live configuration into documentation, support messages, test
fixtures, or transfer archives. Preserve an existing production `config.js`
unchanged unless you are intentionally moving the site to a different Supabase
project.

## 5. Test it locally

Opening `index.html` directly is not recommended because authentication redirects work more reliably through a local web server.

### Easiest option in VS Code

1. Install the **Live Server** extension.
2. Open this project folder in VS Code.
3. Right-click `index.html`.
4. Choose **Open with Live Server**.
5. Copy the exact address from the browser and add it to Supabase's **Redirect URLs** as described above.

### Built-in Mac option

Open Terminal, move into this folder, and run:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Add that URL to the Supabase redirect allowlist before testing password recovery.

## 6. Create your account and make yourself administrator

1. Open the site.
2. Choose **Create account**.
3. Enter your display name, email, and a password of at least eight characters.
4. Follow the confirmation email and enter the app with 1,000 points.
5. Return to the Supabase SQL Editor.
6. Run this query with your real login email:

```sql
update public.profiles as profile
set is_admin = true
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = lower('you@example.com');
```

Refresh the website. You should now see administrator controls.

Using the email address is safer than using a display name because display names do not have to be unique.

Open **Administration**, add a test email to the invitation registry, and
confirm that only that address can register. Existing accounts appear
automatically as joined records after the allowlist migration.

## 7. Test password recovery

1. Open your account menu and choose **Sign out**.
2. Click **Forgot password?** on the login screen.
3. Enter your account email.
4. Open the reset email and follow its link.
5. The site should display the **Choose a new password** screen.
6. Save a new password.
7. You should return to the exchange with the same balance, predictions, markets, and account history.

If the email link opens the wrong page, check **Authentication → URL Configuration** and make sure the exact current site URL is included under Redirect URLs.

## 8. Publish with GitHub Pages

1. Create a new GitHub repository.
2. Upload the canonical project folder. The files required by the browser are:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `config.js`
3. Keep the following source and operational files in the repository as well:
   - `config.example.js`
   - `database.sql`
   - `migrations/`
   - `tests/`
   - `README.md`
   - `PROJECT_CONTEXT.md`
4. Commit the files to the `main` branch.
5. Open the repository's **Settings**.
6. Select **Pages**.
7. Under **Build and deployment**, choose **Deploy from a branch**.
8. Choose the `main` branch and `/ (root)` folder.
9. Save.
10. Copy the published URL into Supabase's **Site URL** and **Redirect URLs** settings.

Only addresses in the administrator-managed invitation registry can create an
account, but the public site URL may still be shared freely.

Reference: [GitHub Pages publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

---

# Files

```text
friend-exchange/
├── index.html       App structure, login, registration, and reset screens
├── styles.css       Responsive visual design
├── app.js           Front-end behavior, authentication, and Supabase calls
├── config.js        Your Supabase URL, Publishable key, and app name
├── config.example.js Placeholder-only configuration template
├── database.sql     Tables, security, points, predictions, and payouts
├── migrations/
│   ├── 20260724_monthly_allowance.sql Existing-database allowance migration
│   └── 20260727_email_allowlist.sql Existing-database allowlist migration
├── PROJECT_CONTEXT.md Authoritative product, brand, architecture, and status specification
├── tests/
│   └── phase1.test.js Focused front-end and calculation regression tests
└── README.md        Full setup and usage instructions
```

# Regression checks

The focused checks:

- Rejects fractional prediction and administrator-adjustment inputs instead of
  silently rounding them down.
- Labels no-winner-refund positions as **Refunded**.
- Preserves the existing payout, balance, and **Profit / loss**
  calculations.
- Verifies the sortable leaderboard's default **Profit / loss** ranking,
  tie-breakers, and realized-performance calculations.
- Verifies that the allowance remains restricted to recent sign-ins and has
  one ledger entry per trader and month.
- Verifies the approved-email hook, admin invitation registry, and
  confirmation-aware signup interface remain present.
- Verifies cumulative largest-wager, rolling 30-day activity, tie, and empty-state
  calculations for the leaderboard highlights.

Run the focused checks with a current Node.js runtime:

```bash
node --check app.js
node --test tests/phase1.test.js
```

The tests are local and do not connect to Supabase.

As of July 27, 2026, all 18 focused tests pass. Measured `app.js` line
coverage is 49.17%, so these checks are regression protection rather than a
complete integration suite. The SQL checks verify that critical definitions are
present; they do not execute PostgreSQL or prove live RLS behavior.

# How authentication works

- Registration calls Supabase email/password sign-up and sends the display name as user metadata.
- The Before User Created hook rejects addresses that are not in
  `approved_signup_emails`.
- The database trigger creates the matching public profile and grants 1,000 starting points.
- Supabase sends a confirmation link through the configured custom SMTP
  provider; the account can sign in after following it.
- Supabase Cron grants 100 points on the first of each month to accounts whose
  latest sign-in was within the preceding 90 days.
- Supabase stores the login session in the browser and refreshes it automatically.
- Logging into another device with the same email and password returns the same Supabase user ID, so the same profile, balance, predictions, and markets are loaded.
- Password recovery sends an email through Supabase. The link returns to the app, opens the new-password screen, and updates the logged-in user's password.
- The browser never receives or stores readable passwords. Password handling is managed by Supabase Auth.

# How the app's database security works

The browser is allowed to read public exchange information, including markets, predictions, display names, balances, and payouts.

The browser is **not** allowed to directly:

- Edit a point balance
- Insert a prediction row
- Change a market result
- Create outcomes outside the validated market-creation process
- Award itself points
- Read or edit the approved-email registry

Instead, the front end calls PostgreSQL functions through Supabase RPC. Those functions check the signed-in user, available balance, market status, closing time, outcome ownership, creator permissions, and administrator permissions inside the database.

The critical balance-changing functions also use row locks, so two simultaneous actions cannot spend the same points twice.

# Current limitations

This is intentionally a small friends-only first version.

- The invitation registry approves addresses but does not send a separate
  invitation message; the administrator still tells friends when they may
  register.
- Confirmation and password recovery depend on the configured custom SMTP
  provider and correct Supabase redirect URLs.
- There are no comments, notifications, images, or market categories.
- Display names are not required to be unique.
- The app loads the full small-community dataset at once. That is simple and appropriate for a friend group, but it would need pagination and more selective queries for a large public community.
- Real-time cross-browser refresh is configured but has not been verified in
  production.
- The first scheduled monthly allowance run has not occurred yet.
- Modals do not currently trap keyboard focus or restore focus when closed.
- The compact Adjust points sheet and dynamic-viewport fix should be
  rechecked on physical iPhone Safari after deployment.
- The Supabase browser library is pinned only to major version 2, and external
  CDN assets do not currently use Subresource Integrity or a Content Security
  Policy.

# Sensible next upgrades

1. Add comments and market updates.
2. Add categories and search.
3. Add creator avatars or ridiculous profile statistics.
4. Add an admin resolution log or two-step confirmation for disputed results.

# Disclaimer

All points are fictional. They cannot be purchased, transferred for value, redeemed, withdrawn, or exchanged for money, goods, services, or prizes.
