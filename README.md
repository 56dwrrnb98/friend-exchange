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
- Editable display names and a curated set of profile icons
- 1,000 starting points for each member
- A 100-point monthly allowance for members who signed in during the preceding
  90 days
- Immediate or next-launch monthly allowance announcements, with accumulated
  awards combined into one notice
- A dedicated Settings page for profile, account access, push preferences, and
  enrolled-device cleanup
- Per-device, opt-in Web Push preferences for new markets, closing soon, and
  resolution or void alerts
- A focused administrator workspace with People and Notifications views,
  including a unified people registry, status-aware member actions, protected
  notification testing, and an expandable recent-delivery history
- Aggregated monthly allowance distributions in the exchange activity feed
- Market creation by any confirmed member, with optional details and 2–6
  outcomes, including simple Yes/No questions
- Scheduled markets and markets that remain open until the outcome becomes known
- Community odds based on the points committed to each outcome
- Per-outcome latest-trade movement and adaptive ribbon/row odds history
- Final predictions that cannot be withdrawn, with the option to add more
  points or back another outcome later
- Live position scenarios showing the potential return and net result for each
  outcome
- Proportional pari-mutuel payouts
- Automatic refunds when nobody selected the winning outcome
- Creator- or administrator-controlled resolution with a permanent note,
  optional source link, and market lifecycle timeline
- A permanent eligibility cutoff based on the scheduled close or the time the
  outcome became known
- Automatic refunds for predictions submitted at or after the eligibility cutoff
- Market voiding with automatic refunds
- Administrator controls for the invitation registry, trader profiles, point
  adjustments, open-market wording and outcome-label corrections, early
  resolution, voided-market archiving/restoration, and deletion of empty
  voided markets
- Active, resolved, voided, and archived market views
- Cross-market and per-market activity, sortable performance leaderboards,
  market history, and filterable/sortable personal portfolio views
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

For an existing installation, apply each newer file in `migrations/` instead
of re-running the complete setup. Notification support is installed by
`migrations/20260901_notifications.sql`; it leaves delivery **Off**.
Existing notification installations should also apply
`migrations/20260901_notification_test_history_cleanup.sql` to enable the
admin-only **Clear test history** action, followed by
`migrations/20260901_push_subscription_device_info.sql` so enrolled-device
icons can distinguish phones, tablets, and computers. Apply
`migrations/20260902_notification_live_impact.sql` to add the category-specific
member and device reach shown before enabling Live delivery. Apply
`migrations/20260902_admin_people_push_status.sql` to add the privacy-preserving
Push readiness column to the administrator People report.

## 2. Configure notification delivery

Notification and recipient records are stored in Postgres for delivery and
administrator auditing. Members use the Markets activity feed as the visible
event history and the Settings page to control push. Background delivery adds
one Supabase Edge Function, a database webhook, and a standard Web Push VAPID
key pair. Email is not used as a notification fallback.

### Generate the Web Push keys

Generate one VAPID key pair and preserve it for the lifetime of the deployment.
One option on a machine with Node.js is:

```bash
npx web-push generate-vapid-keys
```

Put only the generated **public** key in `config.js` as
`vapidPublicKey`. Never put the private key in a browser file or commit it to
the repository.

In **Supabase → Edge Functions → Secrets**, add:

- `VAPID_PUBLIC_KEY`: the generated public key
- `VAPID_PRIVATE_KEY`: the generated private key
- `VAPID_SUBJECT`: an administrative contact such as `mailto:you@example.com`
  or the published HTTPS site URL
- `NOTIFICATION_WEBHOOK_SECRET`: a long, randomly generated value used only by
  the database webhook and Edge Function

The placeholder names are documented in
`supabase/functions/.env.example`; the example file contains no live secrets.

### Deploy the delivery function

Link the repository to the existing Supabase project, then deploy the checked-in
function:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_ID
supabase functions deploy notification-delivery
```

The checked-in `supabase/config.toml` disables the platform JWT gate for this
one endpoint because the database webhook does not carry a member session. The
function still authenticates every request itself: it requires either the
private webhook secret or a signed-in administrator session.

### Connect the database webhook

In **Supabase → Database → Webhooks**, create a webhook with:

- Table: `public.notification_deliveries`
- Event: `INSERT`
- Method: `POST`
- Destination: the deployed `notification-delivery` Edge Function
- Header: `x-notification-secret` with the same value stored in
  `NOTIFICATION_WEBHOOK_SECRET`

The webhook dispatches each queued device delivery after the database
transaction commits. The Edge Function claims each delivery before sending, so
webhook retries and an administrator test dispatch cannot produce duplicate
pushes.

### Activate through the Notification Test lab

Publish the updated browser files, sign in as an administrator, and open
**Admin → Notifications**:

1. Leave the system **Off** while checking the configuration.
2. Open the gear, then enable push under **Settings → Push notifications** on
   each administrator device.
3. Expand **Test lab**, send self-only tests, then review **Notification history**.
4. Change the mode to **Test** to create shadow notifications for real market
   events while restricting recipients to administrators.
5. Change the mode to **Live** only after testing is complete.

Test and shadow records are never delivered retroactively when Live mode is
enabled. Turning the mode Off is the immediate delivery kill switch.

## 3. Configure email authentication

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

## 4. Approve the first administrator email

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

## 5. Configure application URLs

In Supabase:

1. Open **Authentication → URL Configuration**.
2. Set **Site URL** to your published application URL once you have one.
3. Add the exact local URL you use for development under **Redirect URLs**.
4. Add the exact published URL under **Redirect URLs** after deployment.

Examples:

```text
http://localhost:8000/
https://your-account.github.io/your-repository/
```

Use the actual address shown in your browser. Password-recovery links return to
the current application's origin and path.

See the [Supabase redirect URL
documentation](https://supabase.com/docs/guides/auth/redirect-urls) for supported
URL patterns.

## 6. Add your Supabase project information

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
  vapidPublicKey: "YOUR-PUBLIC-VAPID-KEY",
  appName: "The Friend Exchange",
  tagline: "Markets of consequence. Sort of.",
};
```

Use the **Publishable key**, not a Secret key or legacy `service_role` key.
Publishable keys are designed to be visible in browser applications. The
included Row Level Security policies and database functions protect balances,
predictions, results, and administrator actions.

Never place a Secret key, `service_role` key, VAPID private key, or webhook
secret in `config.js`.

### Optional branding and metadata

`vapidPublicKey` is the browser-safe half of the Web Push key pair. `appName`
and `tagline` customize the name and tagline shown on the account
screen and in the application header. For a fully branded installation, also
update the page title, description, canonical URL, Open Graph metadata, icons,
and manifest links in `index.html`; update the name, colors, and icons in
`site.webmanifest`; and replace the files in `img/` as needed.

Set public metadata URLs to your own deployed address. Relative asset URLs are
the simplest choice when the site may be published below a repository path.

## 7. Run the application locally

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

## 8. Create the first administrator

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

## 9. Publish the site

The published site needs these runtime files:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `site.webmanifest`
- `service-worker.js`
- `favicon.ico`
- The `img/` directory

To publish with GitHub Pages:

1. Create a repository in your own GitHub account or organization. Any
   repository name works. A repository named `<account>.github.io` publishes
   at the account root; other names publish below a repository path.
2. Commit the runtime files to the `main` branch. Keeping the remaining source,
   documentation, and tests in the same repository is fine.
3. Open the repository's **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Choose the `main` branch and `/ (root)` folder, then save.
6. Open the URL shown by GitHub Pages and verify that the application loads.
7. Set Supabase's **Site URL** to that exact address and add it under
   **Redirect URLs**.

See the [GitHub Pages publishing
documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source)
for additional hosting instructions.

Only administrator-approved email addresses can register, although the public
site URL itself can be shared freely.

---

# Project files

```text
project/
├── img/                Icons, favicons, and link-preview artwork
├── migrations/         Existing-project database upgrades
├── supabase/
│   ├── config.toml     Edge Function authentication configuration
│   └── functions/      Server-side Web Push delivery
├── tests/
│   └── phase1.test.js Local front-end, SQL-definition, and calculation checks
├── index.html         Application structure, account screens, and metadata
├── styles.css         Responsive visual design
├── app.js             Front-end behavior and Supabase calls
├── config.js          Public Supabase configuration and visible app name
├── config.example.js  Placeholder configuration template
├── database.sql       Complete database setup for a new project
├── service-worker.js  Background push display and notification-click routing
├── site.webmanifest   Browser installation metadata
├── favicon.ico        Legacy browser icon
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

Market lifecycle triggers create notification and recipient audit records in
the same transaction as a successful market action. Members see those events
in the Markets activity feed instead of a duplicate inbox. Opt-in push
deliveries are queued per active device, sent by a Supabase Edge Function, and
retained with status and error details for the administrator. The private VAPID
key and webhook secret exist only in Supabase Function Secrets.

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

- Each deployment is one shared exchange. Confirmed members can see the other
  members' public profiles, markets, predictions, and payouts; there are no
  separate private groups within one installation.
- The invitation registry approves addresses but does not send invitation
  messages.
- Signup confirmation and password recovery depend on correctly configured
  SMTP and redirect URLs.
- Markets are resolved manually by their creator or an administrator; the
  application does not determine real-world outcomes automatically.
- Display names are not required to be unique.
- There are no comments, notification email fallback, images, market
  categories, or search.
- The application loads the complete small-community dataset at once. A large
  public deployment would require pagination and more selective queries.
- The application depends on hosted Supabase, font, icon, and JavaScript assets
  and does not provide offline operation.
- Modals do not currently trap keyboard focus or restore focus when closed.
- External CDN assets do not currently use Subresource Integrity or a Content
  Security Policy.

# Disclaimer

All points are fictional. They cannot be purchased, transferred for value,
redeemed, withdrawn, or exchanged for money, goods, services, or prizes.
