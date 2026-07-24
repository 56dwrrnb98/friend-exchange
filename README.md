# The Friend Exchange

*A fictional-points prediction exchange for questions that matter only to your friends.*

This is the current static application built with:

- Plain HTML, CSS, and JavaScript
- Supabase for the database and email/password accounts
- GitHub Pages (or any static host) for publishing

There is no build step, package manager, framework, or custom server.

## What is included

- Required display name, email, and password registration
- Normal email/password login from multiple devices
- Password-reset emails and an in-app new-password screen
- Email verification intentionally disabled for immediate access
- 1,000 starting points per person
- Markets with 2–10 outcomes
- Yes/No questions are simply two-outcome markets
- Public community odds that respond to point totals
- 25 display-only seed points per outcome to soften early odds
- Multiple predictions per person, including on different outcomes
- No withdrawing or moving committed points
- Proportional pari-mutuel payouts from the full real-point pool
- Automatic refunds when nobody selected the winning outcome
- Creator-controlled resolution after the closing time
- Administrator controls for early resolution, voiding, and point adjustments
- Activity feed, leaderboard, completed markets, and personal prediction history
- Sortable leaderboard ranked by **Total account value** by default
- **Profit / loss** on personal portfolios and the leaderboard
- Optional real-time updates across open browsers
- Responsive desktop and mobile design

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

The SQL creates all tables, indexes, security policies, profile automation, payout logic, and database functions.

For a new Supabase project, run the complete file once.

For an existing live project, do **not** rerun `database.sql` as part of a
front-end deployment. Treat future database changes as separately reviewed,
transactional migrations made only after a backup and read-only live-schema
inspection. The current Phase 1 front-end changes require no database changes.

## 2. Configure email/password authentication

In the Supabase dashboard:

1. Open **Authentication**.
2. Open **Providers** or **Sign In / Providers**.
3. Open the **Email** provider.
4. Make sure email/password sign-in is enabled.
5. Turn **Confirm email** off.
6. Save the provider settings.

Leave **Anonymous Sign-Ins** disabled. This version does not use anonymous accounts.

With email confirmation disabled, a new user receives a session immediately after registration and can enter the exchange without opening a confirmation email.

> Security note: disabling email confirmation is convenient for a small friends-only site, but it means the app does not verify that a person owns the email address entered during registration. Password-reset emails still go to that address.

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
4. You should enter the app immediately and receive 1,000 points.
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
2. Upload these files:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `config.js`
   - `database.sql` is optional on the published site, but useful to keep in the repository
3. Commit the files to the `main` branch.
4. Open the repository's **Settings**.
5. Select **Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Choose the `main` branch and `/ (root)` folder.
8. Save.
9. Copy the published URL into Supabase's **Site URL** and **Redirect URLs** settings.

Because anyone with the URL can create an account, share it only with the people you intend to invite. A shared invite code can be added later if needed.

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
├── PROJECT_CONTEXT.md Product decisions, handoff, and known limitations
├── tests/
│   └── phase1.test.js Focused front-end and calculation regression tests
└── README.md        Full setup and usage instructions
```

`START-HERE.txt` is not part of the current source set.

# Phase 1 regression checks

Phase 1 intentionally makes no database changes. It:

- Rejects fractional prediction and administrator-adjustment inputs instead of
  silently rounding them down.
- Labels no-winner-refund positions as **Refunded**.
- Preserves the existing payout, balance, and **Profit / loss**
  calculations.
- Verifies the sortable leaderboard's default **Total account value** ranking
  and its realized-performance calculations.

Run the focused checks with a current Node.js runtime:

```bash
node --check app.js
node --test tests/phase1.test.js
```

The tests are local and do not connect to Supabase.

# How authentication works

- Registration calls Supabase email/password sign-up and sends the display name as user metadata.
- The database trigger creates the matching public profile and grants 1,000 starting points.
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

Instead, the front end calls PostgreSQL functions through Supabase RPC. Those functions check the signed-in user, available balance, market status, closing time, outcome ownership, creator permissions, and administrator permissions inside the database.

The critical balance-changing functions also use row locks, so two simultaneous actions cannot spend the same points twice.

# Current limitations

This is intentionally a small friends-only first version.

- Anyone who has the public site URL can register.
- Email verification is disabled, so registration does not prove ownership of the entered email address.
- There is no invite code or email allowlist yet.
- The default Supabase email service may have sending limits; custom SMTP can be configured later if the group grows or password-reset delivery becomes unreliable.
- There are no comments, notifications, images, recurring point allowances, or market categories.
- Display names are not required to be unique.
- “All-time payouts” currently includes winner payouts and refunds.
- The app loads the full small-community dataset at once. That is simple and appropriate for a friend group, but it would need pagination and more selective queries for a large public community.
- The final date/time-field styling still requires acceptance testing on
  physical iPhone Safari and supported desktop browsers.

# Sensible next upgrades

1. Add a shared invite code or email allowlist.
2. Add comments and market updates.
3. Add a weekly point allowance for low-balance users.
4. Add categories and search.
5. Add creator avatars or ridiculous profile statistics.
6. Add an admin resolution log or two-step confirmation for disputed results.

# Disclaimer

All points are fictional. They cannot be purchased, transferred for value, redeemed, withdrawn, or exchanged for money, goods, services, or prizes.
