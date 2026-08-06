# The Friend Exchange

*A fictional-points prediction exchange for questions that matter only to your friends.*

The Friend Exchange is a small, self-hosted prediction market for private
groups. Members commit fictional points to possible outcomes, community odds
respond to those predictions, and the point pool is distributed when a market
is resolved.

The application uses:

- Plain HTML, CSS, and JavaScript
- Supabase for the database and authentication
- An SMTP provider, such as Resend, for authentication emails
- GitHub Pages or any other static web host

There is no build step, package manager, framework, or custom server.

## Features

- Administrator-approved registration with email confirmation
- Password recovery and persistent accounts across devices
- 1,000 starting points for each member
- A monthly allowance for recently active members
- Immediate or next-launch monthly allowance announcements, with accumulated
  awards combined into one notice
- Markets with 2–10 outcomes, including simple Yes/No questions
- Scheduled markets and markets that remain open until the outcome becomes known
- Community odds based on the points committed to each outcome
- Per-outcome latest-trade movement and expandable soft-step odds history
- Multiple predictions per member and market
- Proportional pari-mutuel payouts
- Automatic refunds when nobody selected the winning outcome
- Creator- or administrator-controlled resolution with a permanent eligibility cutoff
- Automatic refunds for predictions submitted at or after the eligibility cutoff
- Permanent resolution notes
- Administrator controls for invitations, point adjustments, early resolution,
  voiding, corrections, and archiving
- Cross-market and per-market activity, leaderboard, market history, and personal portfolio views
- Optional real-time updates across open browsers
- Responsive desktop and mobile layouts

## How odds and payouts work

Displayed percentages are **community odds**, not contract prices. They are
calculated as:

```text
(outcome's real points + 25 seed points)
÷
(all real points + all seed points)
```

The 25-point seed softens early odds and is used only for display. It is never
included in payouts.

When a market resolves, predictions submitted before the eligibility cutoff
form the eligible pool. That complete pool is divided among members who
selected the winning outcome. Each winner receives the same proportion of the
pool as their proportion of the winning side. Predictions submitted at or
after the cutoff remain in the activity record but are voided and refunded.

```text
Total pool: 1,000 points
Points on the winning outcome: 300
Your points on the winner: 100

Your payout:
100 ÷ 300 × 1,000 = 333 points
```

Integer-rounding leftovers are distributed automatically so the entire pool is
paid out exactly.

---

# Setup

## Requirements

To run your own copy, you will need:

- A Supabase project
- A static web host such as GitHub Pages
- An SMTP provider for normal signup-confirmation and password-reset delivery
- A local web server for development

## 1. Create the database

1. Create a Supabase project and wait for it to finish provisioning.
2. Open **SQL Editor**.
3. Create a new query.
4. Copy the complete contents of `database.sql` into the editor.
5. Click **Run**.

The SQL file creates the tables, indexes, security policies, profile automation,
payout logic, database functions, monthly allowance schedule, and real-time
publication configuration. Run the complete file once on a new Supabase
project.

For an existing database, apply the files in `migrations/` in chronological
order. After the monthly allowance migrations, run
`migrations/20260731_allowance_notifications.sql` and
`migrations/20260804_outcome_cutoffs.sql` before deploying the matching front
end.

## 2. Configure email authentication

In the Supabase dashboard:

1. Open **Authentication**.
2. Open **Providers** or **Sign In / Providers**.
3. Open the **Email** provider.
4. Enable email/password sign-in.
5. Turn **Confirm email** on.
6. Save the provider settings.

Leave **Anonymous Sign-Ins** disabled. The application does not use anonymous
accounts.

### Configure outbound email

Configure a custom SMTP provider under **Authentication → Email → SMTP
Settings** before inviting members. Supabase's built-in mailer is intended for
testing and is not suitable for normal delivery to a group of users.

Test both a signup-confirmation message and a password-reset message after
configuration.

See the [Supabase custom SMTP
documentation](https://supabase.com/docs/guides/auth/auth-smtp) for provider
requirements. [Resend](https://resend.com) is one available SMTP provider, but
the application does not depend on a particular service.

## 3. Approve the first administrator email

Registration is restricted to email addresses recorded in the invitation
registry. Before enabling the registration hook, add the email address you will
use for the first administrator account:

```sql
insert into public.approved_signup_emails (email)
values (lower('you@example.com'));
```

Then:

1. Open **Authentication → Hooks**.
2. Find **Before User Created**.
3. Choose the Postgres function
   `public.hook_require_approved_email`.
4. Enable and save the hook.

The hook rejects unapproved addresses before an Auth user or public profile is
created. The database hook—not a browser-only check—is the registration
security boundary.

See the [Supabase Before User Created hook
documentation](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook)
for additional details.

## 4. Configure application URLs

In Supabase:

1. Open **Authentication → URL Configuration**.
2. Set **Site URL** to your published application URL once you have one.
3. Add the exact local URL you use for development under **Redirect URLs**.
4. Add the exact published URL under **Redirect URLs** after deployment.

Examples:

```text
http://localhost:8000/
https://friendexchange.github.io/
```

Use the actual address shown in your browser. Password-recovery links return to
the current application's origin and path.

See the [Supabase redirect URL
documentation](https://supabase.com/docs/guides/auth/redirect-urls) for supported
URL patterns.

## 5. Add your Supabase project information

In Supabase:

1. Open **Project Settings**.
2. Open **API Keys**.
3. Copy the **Project URL**.
4. Copy the **Publishable key**.

Copy `config.example.js` to `config.js`, then replace the placeholders:

```js
window.FRIEND_EXCHANGE_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabasePublishableKey: "YOUR-PUBLISHABLE-KEY",
  appName: "The Friend Exchange",
  tagline: "Markets of consequence. Sort of.",
};
```

Use the **Publishable key**, not a Secret key or legacy `service_role` key.
Publishable keys are designed to be visible in browser applications. The
included Row Level Security policies and database functions protect balances,
predictions, results, and administrator actions.

Never place a Secret key or `service_role` key in `config.js`.

## 6. Run the application locally

Opening `index.html` directly is not recommended because authentication
redirects work more reliably through a local web server.

One option is Python's built-in server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

Alternatively, use a local static-server tool such as the VS Code Live Server
extension. Add the exact local address to Supabase's redirect allowlist before
testing authentication or password recovery.

## 7. Create the first administrator

1. Open the application and choose **Create account**.
2. Register with the email address approved earlier.
3. Follow the confirmation email.
4. Return to the Supabase SQL Editor.
5. Run the following query with the same email address:

```sql
update public.profiles as profile
set is_admin = true
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = lower('you@example.com');
```

Refresh the application. The Administration area should now be available.
Use it to approve additional member email addresses and manage the exchange.

## 8. Publish the site

The browser requires these files:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`

To publish with GitHub Pages:

1. Use the GitHub account named `friendexchange`.
2. Name the repository `friendexchange.github.io`.
3. Commit the application files to the `main` branch.
4. Open the repository's **Settings → Pages**.
5. Under **Build and deployment**, select **Deploy from a branch**.
6. Choose the `main` branch and `/ (root)` folder.
7. Save the settings and verify `https://friendexchange.github.io/` loads.
8. Set Supabase's **Site URL** to that address and add the exact address under
   **Redirect URLs**.

See the [GitHub Pages publishing
documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source)
for additional hosting instructions.

Only administrator-approved email addresses can register, although the public
site URL itself can be shared freely.

---

# Project files

```text
friendexchange.github.io/
├── index.html         Application structure and account screens
├── styles.css         Responsive visual design
├── app.js             Front-end behavior and Supabase calls
├── config.js          Your public Supabase configuration and app name
├── config.example.js  Placeholder configuration template
├── database.sql       Complete database setup for a new project
├── migrations/        Ordered changes for an existing database
├── tests/
│   └── phase1.test.js Local front-end and calculation checks
└── README.md          Setup, architecture, and usage instructions
```

# Development checks

With a current Node.js runtime:

```bash
node --check app.js
node --test tests/phase1.test.js
```

These checks run locally and do not connect to Supabase. Database-oriented
checks confirm that important SQL definitions are present; they do not execute
PostgreSQL or verify live Row Level Security behavior.

# Architecture and security

Supabase Auth manages account registration, email confirmation, sessions, and
password recovery. The browser never receives or stores readable passwords.

The database creates a public profile for each confirmed member and grants the
starting balance. A scheduled database job grants the monthly allowance to
members whose latest sign-in was within the preceding 90 days. Open browsers
announce the award after the real-time balance refresh; browsers that were
closed or offline announce unseen allowances on the next launch.

The browser may read the exchange information needed for markets, activity,
leaderboards, and portfolios. It cannot directly change balances, insert
predictions, resolve markets, award points, or read the invitation registry.
Those actions use protected PostgreSQL functions that validate the signed-in
member, balance, market status, closing time, ownership, and administrator
permissions.

Balance-changing functions also use row locks so simultaneous actions cannot
spend the same points twice.

# Limitations

The Friend Exchange is designed for a small, trusted community.

- The invitation registry approves addresses but does not send invitation
  messages.
- Signup confirmation and password recovery depend on correctly configured
  SMTP and redirect URLs.
- Display names are not required to be unique.
- There are no comments, general-purpose notifications, images, market
  categories, or search.
- The application loads the complete small-community dataset at once. A large
  public deployment would require pagination and more selective queries.
- Modals do not currently trap keyboard focus or restore focus when closed.
- External CDN assets do not currently use Subresource Integrity or a Content
  Security Policy.

# Disclaimer

All points are fictional. They cannot be purchased, transferred for value,
redeemed, withdrawn, or exchanged for money, goods, services, or prizes.
