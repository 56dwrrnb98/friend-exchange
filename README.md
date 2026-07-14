# The Friend Exchange

*A fictional-points prediction exchange for questions that matter only to your friends.*

This is a complete starter app built with:

- Plain HTML, CSS, and JavaScript
- Supabase for the database and anonymous accounts
- GitHub Pages (or any static host) for publishing

There is no build step, package manager, framework, or custom server.

## What is included

- Anonymous, name-only sign-in
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

1. Go to Supabase and create a new project.
2. Wait for the project to finish provisioning.
3. Open **SQL Editor**.
4. Create a new query.
5. Copy the entire contents of `database.sql` into the editor.
6. Click **Run**.

The SQL creates all tables, indexes, security policies, profile automation, payout logic, and database functions.

## 2. Enable anonymous sign-ins

In the Supabase dashboard:

1. Open **Authentication**.
2. Open **Sign In / Providers**.
3. Find **Anonymous Sign-Ins**.
4. Turn on **Allow anonymous sign-ins**.
5. Save.

Anonymous users receive a unique authenticated user ID without entering an email address or password. Their account remains tied to that browser. Clearing browser data, signing out, or switching devices will make the account inaccessible unless a recoverable login method is added later.

## 3. Add your project information

In Supabase:

1. Open **Project Settings**.
2. Open **API Keys**.
3. Copy the **Project URL**.
4. Copy the **Publishable key**.

Open `config.js` and replace these placeholders:

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

## 4. Test it locally

Opening `index.html` directly may work, but a tiny local web server is more reliable.

### Easiest option in VS Code

1. Install the **Live Server** extension.
2. Open this project folder in VS Code.
3. Right-click `index.html`.
4. Choose **Open with Live Server**.

### Built-in Mac option

Open Terminal, move into this folder, and run:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## 5. Make yourself the administrator

1. Open the site.
2. Enter your display name and join once.
3. Return to the Supabase SQL Editor.
4. Run this query, replacing `Mike` with your exact display name:

```sql
update public.profiles
set is_admin = true
where display_name = 'Mike';
```

Refresh the website. You should now see administrator controls.

For a less ambiguous method, use Supabase **Table Editor → profiles**, find your account, and set `is_admin` to `true`.

## 6. Publish with GitHub Pages

1. Create a new GitHub repository.
2. Upload all five app files:
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

GitHub will provide a public URL after the Pages deployment completes.

Because anyone with the URL can join, share it only with the people you intend to invite. A shared invite code can be added in a later version if needed.

---

# Files

```text
friend-exchange/
├── index.html       App structure and screens
├── styles.css       Responsive visual design
├── app.js           Front-end behavior and Supabase calls
├── config.js        Your Supabase URL, Publishable key, and app name
├── database.sql     Tables, security, points, predictions, and payouts
└── README.md        Setup and usage instructions
```

# How the security works

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

- Anonymous accounts do not follow people across devices.
- A person can create a new account by clearing browser data or using another browser.
- There is no invite code yet.
- There are no comments, notifications, images, recurring point allowances, or market categories.
- Display names are not required to be unique.
- The app loads the full small-community dataset at once. That is simple and appropriate for a friend group, but it would need pagination and more selective queries for a large public community.

# Sensible next upgrades

1. Add email magic-link login so accounts work across devices.
2. Add a shared invite code or allowlist.
3. Add comments and market updates.
4. Add a weekly point allowance for low-balance users.
5. Add categories and search.
6. Add creator avatars or ridiculous profile statistics.
7. Add an admin resolution log or two-step confirmation for disputed results.

# Disclaimer

All points are fictional. They cannot be purchased, transferred for value, redeemed, withdrawn, or exchanged for money, goods, services, or prizes.
