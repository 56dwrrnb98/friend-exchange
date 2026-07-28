const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");

function createElement() {
  return {
    classList: {
      add() {},
      contains() {
        return false;
      },
      remove() {},
      toggle() {},
    },
    addEventListener() {},
    appendChild() {},
    focus() {},
    querySelector() {
      return createElement();
    },
    setAttribute() {},
    textContent: "",
    innerHTML: "",
  };
}

function loadAppInternals() {
  const appPath = path.join(projectRoot, "app.js");
  const source = fs
    .readFileSync(appPath, "utf8")
    .replace(
      "  init();",
      "  globalThis.__friendExchangeTest = {" +
        " dom, state, parseWholeNumber, getLivePositionScenarios, renderLivePosition," +
        " renderPositionCard," +
        " renderMarkets, renderMarketDetail, renderCreateMarket, renderPortfolio, renderLeaderboard, openPredictionModal," +
        " openResolveModal," +
        " openEditMarketModal, openDeleteVoidMarketModal, openArchiveVoidMarketModal," +
        " openAdminPointsModal, openAccountModal, getSignupErrorMessage," +
        " buildAdminInvitationMarkup, updateCharacterCounter" +
        " };",
    );

  const elements = new Map();
  const document = {
    body: createElement(),
    createElement,
    addEventListener() {},
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, createElement());
      return elements.get(selector);
    },
    querySelectorAll() {
      return [];
    },
    title: "The Friend Exchange",
  };
  const window = {
    FRIEND_EXCHANGE_CONFIG: {},
    clearTimeout,
    history: { replaceState() {} },
    location: { hash: "", origin: "https://example.test", pathname: "/" },
    scrollTo() {},
    setTimeout,
  };
  const context = vm.createContext({
    clearTimeout,
    console,
    document,
    FormData,
    Intl,
    Map,
    Number,
    Set,
    URLSearchParams,
    window,
  });

  vm.runInContext(source, context, { filename: appPath });
  return context.__friendExchangeTest;
}

function getLeaderboardTableBody(dom) {
  return dom.main.innerHTML.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] || "";
}

test("whole-number parser rejects fractional and nonnumeric input", () => {
  const { parseWholeNumber } = loadAppInternals();

  assert.equal(parseWholeNumber("25"), 25);
  assert.equal(parseWholeNumber("-25"), -25);
  assert.equal(parseWholeNumber("10.9"), null);
  assert.equal(parseWholeNumber("not-a-number"), null);
});

test("signup errors explain when an email has not been approved", () => {
  const { getSignupErrorMessage } = loadAppInternals();

  assert.equal(
    getSignupErrorMessage({
      message: "This email address is not on the Friend Exchange invitation list.",
    }),
    "That email address has not been approved for The Friend Exchange.",
  );
  assert.equal(
    getSignupErrorMessage({ message: "Password should be at least 8 characters." }),
    "Password should be at least 8 characters.",
  );
});

test("admin invitation registry distinguishes approved, pending, and joined addresses", () => {
  const { buildAdminInvitationMarkup } = loadAppInternals();
  const html = buildAdminInvitationMarkup([
    {
      email: "ready@example.com",
      added_at: "2026-07-27T12:00:00Z",
      added_by_display_name: "Mike",
      registered_user_id: null,
      registered_at: null,
      registered_display_name: null,
      confirmed_at: null,
    },
    {
      email: "pending@example.com",
      added_at: "2026-07-27T12:00:00Z",
      added_by_display_name: "Mike",
      registered_user_id: "pending-user",
      registered_at: "2026-07-27T13:00:00Z",
      registered_display_name: "Pending Friend",
      confirmed_at: null,
    },
    {
      email: "joined@example.com",
      added_at: "2026-07-27T12:00:00Z",
      added_by_display_name: null,
      registered_user_id: "joined-user",
      registered_at: "2026-07-27T13:00:00Z",
      registered_display_name: "Joined Friend",
      confirmed_at: "2026-07-27T13:05:00Z",
    },
  ]);

  assert.match(html, /Ready to register[\s\S]*<strong>1<\/strong>/);
  assert.match(html, /Awaiting confirmation[\s\S]*<strong>1<\/strong>/);
  assert.match(html, /Joined traders[\s\S]*<strong>1<\/strong>/);
  assert.match(html, /data-remove-invitation="ready@example.com"/);
  assert.doesNotMatch(html, /data-remove-invitation="joined@example.com"/);
  assert.match(html, /Pending Friend/);
  assert.match(html, /Account retained/);
  assert.match(html, /id="admin-award-points"[^>]*>Adjust points/);
  assert.doesNotMatch(html, />Award points</);
});

test("admin point adjustment uses a compact single-trader form", () => {
  const { dom, openAdminPointsModal, state } = loadAppInternals();
  state.profile = {
    id: "admin-user",
    display_name: "Admin",
    balance: 1000,
    is_admin: true,
  };
  state.profiles = [
    state.profile,
    {
      id: "friend-user",
      display_name: "Friend",
      balance: 875,
      is_admin: false,
    },
  ];

  openAdminPointsModal();

  assert.match(dom.modalRoot.innerHTML, /class="modal admin-points-modal"/);
  assert.match(dom.modalRoot.innerHTML, /<h2>Adjust points\.<\/h2>/);
  assert.match(dom.modalRoot.innerHTML, /id="admin-points-user"/);
  assert.match(dom.modalRoot.innerHTML, /Choose a trader…/);
  assert.match(dom.modalRoot.innerHTML, /id="admin-points-amount"/);
  assert.doesNotMatch(
    dom.modalRoot.innerHTML,
    /id="admin-points-amount"[^>]*value=/,
  );
  assert.match(dom.modalRoot.innerHTML, /id="admin-current-balance"/);
  assert.match(dom.modalRoot.innerHTML, /id="admin-new-balance"/);
  assert.match(dom.modalRoot.innerHTML, /type="submit" disabled>Apply adjustment/);
  assert.doesNotMatch(dom.modalRoot.innerHTML, /admin-user-row|data-award-user/);

  const styles = fs.readFileSync(path.join(projectRoot, "styles.css"), "utf8");
  assert.match(styles, /92dvh/);
  assert.match(styles, /env\(safe-area-inset-top\)/);
  assert.match(styles, /\.modal > form > \.modal-body/);
});

test("account modal leaves admin access in the navigation", () => {
  const { dom, openAccountModal, state } = loadAppInternals();
  state.user = { id: "admin-user", email: "admin@example.com" };
  state.profile = {
    id: "admin-user",
    display_name: "Admin",
    profile_icon: "robot",
    balance: 1000,
    is_admin: true,
  };

  openAccountModal();

  assert.match(dom.modalRoot.innerHTML, /<span>Account type<\/span>/);
  assert.match(dom.modalRoot.innerHTML, /<strong>Admin<\/strong>/);
  assert.match(dom.modalRoot.innerHTML, />Sign out<\/button>/);
  assert.match(dom.modalRoot.innerHTML, />Save changes<\/button>/);
  assert.match(dom.modalRoot.innerHTML, /class="modal account-modal"/);
  assert.match(dom.modalRoot.innerHTML, /<legend>Profile icon<\/legend>/);
  assert.equal(
    (dom.modalRoot.innerHTML.match(/name="profileIcon"/g) || []).length,
    35,
  );
  assert.match(
    dom.modalRoot.innerHTML,
    /value="robot"\s+checked[\s\S]*fa-solid fa-robot/,
  );
  assert.doesNotMatch(dom.modalRoot.innerHTML, /account-admin|>Administration<\/button>/);

  const index = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
  assert.match(index, /id="admin-nav-link"[^>]*href="#\/admin"/);
  assert.match(index, /id="admin-mobile-nav-link"[^>]*href="#\/admin"/);
});

test("admin market correction edits metadata but keeps outcomes immutable", () => {
  const { dom, openEditMarketModal, state } = loadAppInternals();
  const market = {
    id: 42,
    question: "Will the original plan happen?",
    description: "The original terms.",
    closes_at: "2099-08-01T20:30:00Z",
    status: "open",
  };

  state.profile = { id: "regular-user", is_admin: false };
  openEditMarketModal(market);
  assert.equal(dom.modalRoot.innerHTML, "");

  state.profile = { id: "admin-user", is_admin: true };
  openEditMarketModal(market);

  assert.match(dom.modalRoot.innerHTML, /Administrator correction/);
  assert.match(dom.modalRoot.innerHTML, /id="edit-market-question"/);
  assert.match(dom.modalRoot.innerHTML, /id="edit-market-description"/);
  assert.match(dom.modalRoot.innerHTML, /id="edit-market-description-count"/);
  assert.match(dom.modalRoot.innerHTML, /0 \/ 600/);
  assert.match(dom.modalRoot.innerHTML, /id="edit-market-closes"/);
  assert.match(dom.modalRoot.innerHTML, /Outcomes and prediction history remain unchanged/);
  assert.doesNotMatch(dom.modalRoot.innerHTML, /edit-market-outcome|name="outcomes"/);
});

test("market descriptions preserve line breaks and show a live character counter", () => {
  const { dom, renderCreateMarket, updateCharacterCounter } = loadAppInternals();
  renderCreateMarket();

  assert.match(dom.main.innerHTML, /aria-describedby="market-description-count"/);
  assert.match(dom.main.innerHTML, /id="market-description-count"/);
  assert.match(dom.main.innerHTML, /0 \/ 600/);

  const counter = createElement();
  updateCharacterCounter({ value: "Yes if:\n\nThis happens." }, counter);
  assert.equal(counter.textContent, "22 / 600");

  const styles = fs.readFileSync(path.join(projectRoot, "styles.css"), "utf8");
  assert.match(styles, /\.market-description[\s\S]*white-space: pre-wrap/);
});

test("only an empty voided market presents the permanent cleanup action", () => {
  const { dom, openDeleteVoidMarketModal, state } = loadAppInternals();
  state.profile = { id: "admin-user", is_admin: true };

  openDeleteVoidMarketModal({
    id: 43,
    question: "Mistaken market",
    status: "void",
    predictions: [],
  });

  assert.match(dom.modalRoot.innerHTML, /Administrative cleanup/);
  assert.match(dom.modalRoot.innerHTML, /no predictions were ever placed/);
  assert.match(dom.modalRoot.innerHTML, /id="confirm-delete-void"/);
  assert.match(dom.modalRoot.innerHTML, /Voided markets with predictions cannot be deleted/);

  dom.modalRoot.innerHTML = "";
  openDeleteVoidMarketModal({
    id: 44,
    question: "Refund-bearing market",
    status: "void",
    predictions: [{ id: 1 }],
  });
  assert.equal(dom.modalRoot.innerHTML, "");
});

test("refund-bearing voids can be archived and restored only by an admin", () => {
  const { dom, openArchiveVoidMarketModal, state } = loadAppInternals();
  const market = {
    id: 45,
    question: "Refund-bearing market",
    status: "void",
    archived_at: null,
    predictions: [{ id: 1 }],
  };

  state.profile = { id: "regular-user", is_admin: false };
  openArchiveVoidMarketModal(market, true);
  assert.equal(dom.modalRoot.innerHTML, "");

  state.profile = { id: "admin-user", is_admin: true };
  openArchiveVoidMarketModal(market, true);
  assert.match(dom.modalRoot.innerHTML, /Archive voided market/);
  assert.match(dom.modalRoot.innerHTML, /Administrators and traders who participated/);
  assert.match(dom.modalRoot.innerHTML, /Archive record/);

  dom.modalRoot.innerHTML = "";
  openArchiveVoidMarketModal({ ...market, predictions: [] }, true);
  assert.equal(dom.modalRoot.innerHTML, "");

  openArchiveVoidMarketModal(
    { ...market, archived_at: "2026-07-28T12:00:00Z" },
    false,
  );
  assert.match(dom.modalRoot.innerHTML, /Restore archived market/);
  assert.match(dom.modalRoot.innerHTML, /Restore record/);
});

test("archived markets leave ordinary lists but remain in participant history", () => {
  const { dom, renderMarkets, state } = loadAppInternals();
  state.user = { id: "participant-user" };
  state.profile = {
    id: "participant-user",
    display_name: "Participant",
    balance: 1000,
    is_admin: false,
  };
  state.profiles = [
    state.profile,
    { id: "creator-user", display_name: "Creator", balance: 1000, is_admin: false },
  ];
  state.markets = [
    {
      id: 1,
      creator_id: "creator-user",
      question: "Visible resolved market",
      status: "resolved",
      winning_outcome_id: 11,
      closes_at: "2026-07-01T12:00:00Z",
      archived_at: null,
    },
    {
      id: 2,
      creator_id: "creator-user",
      question: "Archived refund record",
      status: "void",
      winning_outcome_id: null,
      closes_at: "2026-07-02T12:00:00Z",
      archived_at: "2026-07-28T12:00:00Z",
    },
  ];
  state.outcomes = [
    { id: 11, market_id: 1, label: "Yes", seed_points: 25 },
    { id: 21, market_id: 2, label: "No", seed_points: 25 },
  ];
  state.predictions = [
    {
      id: 1,
      user_id: "participant-user",
      market_id: 2,
      outcome_id: 21,
      amount: 50,
      created_at: "2026-07-02T10:00:00Z",
    },
  ];
  state.payouts = [];

  state.marketFilter = "all";
  renderMarkets();
  assert.match(dom.main.innerHTML, /Visible resolved market/);
  assert.doesNotMatch(dom.main.innerHTML, /Archived refund record/);
  assert.match(dom.main.innerHTML, /Archived · 1/);

  state.marketFilter = "archived";
  renderMarkets();
  assert.match(dom.main.innerHTML, /Archived refund record/);
  assert.doesNotMatch(dom.main.innerHTML, /Visible resolved market/);
  assert.match(dom.main.innerHTML, /Voided · archived record/);
});

test("homepage hero summarizes current market participation", () => {
  const { dom, renderMarkets, state } = loadAppInternals();
  state.user = { id: "current-user" };
  state.profile = {
    id: "current-user",
    display_name: "Current User",
    balance: 825,
    is_admin: false,
  };
  state.profiles = [
    state.profile,
    { id: "other-user", display_name: "Other User", balance: 900, is_admin: false },
  ];
  state.markets = [
    {
      id: 1,
      creator_id: "current-user",
      question: "Still accepting predictions?",
      status: "open",
      winning_outcome_id: null,
      closes_at: "2099-07-28T12:00:00Z",
      archived_at: null,
    },
    {
      id: 2,
      creator_id: "other-user",
      question: "Awaiting resolution?",
      status: "open",
      winning_outcome_id: null,
      closes_at: "2026-07-01T12:00:00Z",
      archived_at: null,
    },
    {
      id: 3,
      creator_id: "other-user",
      question: "Already settled?",
      status: "resolved",
      winning_outcome_id: 31,
      closes_at: "2026-06-01T12:00:00Z",
      archived_at: null,
    },
  ];
  state.outcomes = [
    { id: 11, market_id: 1, label: "Yes", seed_points: 25 },
    { id: 21, market_id: 2, label: "Yes", seed_points: 25 },
    { id: 31, market_id: 3, label: "Yes", seed_points: 25 },
  ];
  state.predictions = [
    { user_id: "current-user", market_id: 1, outcome_id: 11, amount: 100 },
    { user_id: "other-user", market_id: 1, outcome_id: 11, amount: 25 },
    { user_id: "current-user", market_id: 2, outcome_id: 21, amount: 50 },
    { user_id: "other-user", market_id: 3, outcome_id: 31, amount: 200 },
  ];
  state.payouts = [];

  renderMarkets();

  assert.match(dom.main.innerHTML, /Open markets[\s\S]*<strong>1<\/strong>/);
  assert.match(dom.main.innerHTML, /Points in play[\s\S]*<strong>175<\/strong>/);
  assert.match(dom.main.innerHTML, /Traders participating[\s\S]*<strong>2<\/strong>/);
  assert.match(dom.main.innerHTML, /Your live positions[\s\S]*<strong>2<\/strong>/);
  assert.doesNotMatch(dom.main.innerHTML, /Predictions placed|Your balance/);
});

test("generic prediction flow requires an explicit outcome and amount", () => {
  const { dom, openPredictionModal, state } = loadAppInternals();
  state.profile = { balance: 1000 };
  const market = {
    actualTotal: 0,
    displayStatus: "open",
    question: "Will it happen?",
    outcomes: [
      { id: 11, label: "Yes", percent: 50, actualPoints: 0, seed_points: 25 },
      { id: 12, label: "No", percent: 50, actualPoints: 0, seed_points: 25 },
    ],
  };

  openPredictionModal(market);

  assert.match(dom.modalRoot.innerHTML, /id="prediction-outcome"/);
  assert.match(dom.modalRoot.innerHTML, /value="" selected>Choose an outcome…/);
  assert.doesNotMatch(dom.modalRoot.innerHTML, /value="11" selected/);
  assert.doesNotMatch(dom.modalRoot.innerHTML, /id="prediction-amount"[^>]*value=/);
  assert.match(dom.modalRoot.innerHTML, /type="submit" disabled>Commit points/);
});

test("outcome-specific prediction flow preselects an editable outcome", () => {
  const { dom, openPredictionModal, state } = loadAppInternals();
  state.profile = { balance: 1000 };
  const market = {
    actualTotal: 0,
    displayStatus: "open",
    question: "Will it happen?",
    outcomes: [
      { id: 11, label: "Yes", percent: 50, actualPoints: 0, seed_points: 25 },
      { id: 12, label: "No", percent: 50, actualPoints: 0, seed_points: 25 },
    ],
  };

  openPredictionModal(market, 12);

  assert.match(dom.modalRoot.innerHTML, /<select id="prediction-outcome"/);
  assert.match(dom.modalRoot.innerHTML, /value="12" selected/);
  assert.doesNotMatch(dom.modalRoot.innerHTML, /value="" selected/);
});

test("market resolution requires a short permanent note", () => {
  const { dom, openResolveModal } = loadAppInternals();
  openResolveModal({
    id: 46,
    question: "When will the power return?",
    outcomes: [
      { id: 461, label: "Back on or before 11pm" },
      { id: 462, label: "Back after 11pm" },
    ],
  });

  assert.match(dom.modalRoot.innerHTML, /<h2>What actually happened\?<\/h2>/);
  assert.match(dom.modalRoot.innerHTML, /id="resolution-note"/);
  assert.match(dom.modalRoot.innerHTML, /name="resolutionNote"/);
  assert.match(dom.modalRoot.innerHTML, /maxlength="280"/);
  assert.match(dom.modalRoot.innerHTML, /placeholder="Power was restored at 10:40pm\."/);
  assert.match(dom.modalRoot.innerHTML, /This becomes part of the permanent settlement record/);
  assert.match(dom.modalRoot.innerHTML, /id="resolution-note-count"/);
  assert.match(dom.modalRoot.innerHTML, /0 \/ 280/);
  assert.match(dom.modalRoot.innerHTML, /id="resolution-note"[\s\S]*required/);
});

test("resolved market snapshot shows the winner and escaped resolution context", () => {
  const { dom, renderMarketDetail, state } = loadAppInternals();
  state.user = { id: "current-user" };
  state.profile = {
    id: "current-user",
    display_name: "Current User",
    balance: 950,
    is_admin: false,
  };
  state.profiles = [state.profile];
  state.markets = [{
    id: 47,
    creator_id: "current-user",
    question: "When will the power return?",
    description: null,
    status: "resolved",
    winning_outcome_id: 471,
    resolution_note: "Power was restored at 10:40pm <confirmed>.",
    closes_at: "2026-07-28T22:00:00Z",
    archived_at: null,
  }];
  state.outcomes = [
    { id: 471, market_id: 47, label: "Back on or before 11pm", seed_points: 25 },
    { id: 472, market_id: 47, label: "Back after 11pm", seed_points: 25 },
  ];
  state.predictions = [];
  state.payouts = [];

  renderMarketDetail(47);

  assert.match(
    dom.main.innerHTML,
    /Resolution[\s\S]*Back on or before 11pm[\s\S]*Power was restored at 10:40pm &lt;confirmed&gt;\./,
  );
  assert.doesNotMatch(dom.main.innerHTML, /<confirmed>/);
  assert.match(dom.main.innerHTML, /class="resolution-summary"/);
});

test("no-winner refund positions are labeled as refunded", () => {
  const { renderPositionCard } = loadAppInternals();
  const html = renderPositionCard({
    market: {
      displayStatus: "resolved",
      id: 7,
      question: "Did the thing happen?",
      winning_outcome_id: 99,
    },
    outcome: { id: 10, label: "No", percent: 40 },
    amount: 75,
    payout: { amount: 75, kind: "no_winner_refund" },
  });

  assert.match(html, />Refunded</);
  assert.match(html, /75 pts refunded/);
  assert.doesNotMatch(html, />Lost</);
});

test("normal resolved winner and loser labels are preserved", () => {
  const { renderPositionCard } = loadAppInternals();
  const market = {
    displayStatus: "resolved",
    id: 8,
    question: "Who won?",
    winning_outcome_id: 20,
  };

  const winner = renderPositionCard({
    market,
    outcome: { id: 20, label: "A", percent: 60 },
    amount: 50,
    payout: { amount: 120, kind: "winner" },
  });
  const loser = renderPositionCard({
    market,
    outcome: { id: 21, label: "B", percent: 40 },
    amount: 40,
    payout: null,
  });

  assert.match(winner, />Won</);
  assert.match(winner, /120 pts paid/);
  assert.match(loser, />Lost</);
  assert.match(loser, /40 pts committed/);
});

test("live position groups equivalent outcomes and preserves refund scenarios", () => {
  const { getLivePositionScenarios } = loadAppInternals();
  const market = {
    status: "open",
    outcomes: [
      { id: 11, label: "Alex" },
      { id: 12, label: "Jordan" },
      { id: 13, label: "Morgan" },
      { id: 14, label: "Riley" },
      { id: 15, label: "Casey" },
    ],
    predictions: [
      { user_id: "current-user", outcome_id: 11, amount: 100 },
      { user_id: "other-user", outcome_id: 11, amount: 50 },
      { user_id: "current-user", outcome_id: 12, amount: 100 },
      { user_id: "second-user", outcome_id: 12, amount: 100 },
      { user_id: "other-user", outcome_id: 13, amount: 25 },
      { user_id: "second-user", outcome_id: 14, amount: 25 },
    ],
  };

  const scenarios = getLivePositionScenarios(market, "current-user");

  assert.equal(scenarios.length, 4);
  assert.deepEqual(
    scenarios.map(({ kind, payout, net }) => ({ kind, payout, net })),
    [
      { kind: "backed", payout: 267, net: 67 },
      { kind: "backed", payout: 200, net: 0 },
      { kind: "other", payout: 0, net: -200 },
      { kind: "refund", payout: 200, net: 0 },
    ],
  );
  assert.equal(scenarios[2].title, "If any other backed outcome wins");
  assert.equal(scenarios[3].title, "If “Casey” wins");
});

test("live position only appears for unresolved markets with a commitment", () => {
  const { renderLivePosition } = loadAppInternals();
  const market = {
    status: "open",
    outcomes: [
      { id: 11, label: "Yes" },
      { id: 12, label: "No" },
    ],
    predictions: [
      { user_id: "current-user", outcome_id: 11, amount: 100 },
      { user_id: "other-user", outcome_id: 12, amount: 100 },
    ],
  };

  const html = renderLivePosition(market, "current-user");
  assert.match(html, /Your live position/);
  assert.match(html, /If resolved now/);
  assert.match(html, /\+100 pts/);
  assert.match(html, /200 pts returned/);
  assert.match(html, /-100 pts/);

  assert.equal(renderLivePosition(market, "uninvolved-user"), "");
  assert.equal(renderLivePosition({ ...market, status: "resolved" }, "current-user"), "");
});

test("portfolio shows current commitments and Profit / loss excludes open and void markets", () => {
  const { dom, renderPortfolio, state } = loadAppInternals();
  state.user = { id: "user-a" };
  state.profile = {
    id: "user-a",
    display_name: "Alex",
    balance: 832,
    is_admin: false,
  };
  state.profiles = [state.profile];
  state.markets = [
    { id: 1, question: "Resolved winner", creator_id: "user-a", status: "resolved", winning_outcome_id: 11, closes_at: "2026-01-01T00:00:00Z" },
    { id: 2, question: "Active question", creator_id: "user-a", status: "open", winning_outcome_id: null, closes_at: "2099-01-01T00:00:00Z" },
    { id: 3, question: "Voided question", creator_id: "user-a", status: "void", winning_outcome_id: null, closes_at: "2026-01-01T00:00:00Z", archived_at: "2026-07-28T12:00:00Z" },
    { id: 4, question: "Refunded question", creator_id: "user-a", status: "resolved", winning_outcome_id: 41, closes_at: "2026-01-01T00:00:00Z" },
  ];
  state.outcomes = [
    { id: 11, market_id: 1, label: "Yes", seed_points: 25 },
    { id: 21, market_id: 2, label: "Yes", seed_points: 25 },
    { id: 31, market_id: 3, label: "Yes", seed_points: 25 },
    { id: 41, market_id: 4, label: "Unbacked", seed_points: 25 },
    { id: 42, market_id: 4, label: "Backed", seed_points: 25 },
  ];
  state.predictions = [
    { user_id: "user-a", market_id: 1, outcome_id: 11, amount: 200, created_at: "2026-01-01T00:00:00Z" },
    { user_id: "user-a", market_id: 2, outcome_id: 21, amount: 50, created_at: "2026-01-02T00:00:00Z" },
    { user_id: "user-a", market_id: 3, outcome_id: 31, amount: 30, created_at: "2026-01-03T00:00:00Z" },
    { user_id: "user-a", market_id: 4, outcome_id: 42, amount: 40, created_at: "2026-01-04T00:00:00Z" },
  ];
  state.payouts = [
    { user_id: "user-a", market_id: 1, amount: 112, kind: "winner" },
    { user_id: "user-a", market_id: 3, amount: 30, kind: "void_refund" },
    { user_id: "user-a", market_id: 4, amount: 40, kind: "no_winner_refund" },
  ];

  renderPortfolio();

  assert.match(
    dom.main.innerHTML,
    /Points currently committed[\s\S]*<strong>50 pts<\/strong>/,
  );
  assert.match(dom.main.innerHTML, /All · 4/);
  assert.match(dom.main.innerHTML, /Active · 1/);
  assert.match(dom.main.innerHTML, /Won · 1/);
  assert.match(dom.main.innerHTML, /Lost · 0/);
  assert.match(dom.main.innerHTML, /Refunded · 2/);
  assert.ok(
    dom.main.innerHTML.indexOf("Active question") <
      dom.main.innerHTML.indexOf("Refunded question"),
    "active positions should appear before settled history in the All view",
  );
  assert.doesNotMatch(dom.main.innerHTML, /All-time payouts/);
  assert.match(dom.main.innerHTML, /Profit \/ loss/);
  assert.match(dom.main.innerHTML, /-88 pts/);
  assert.match(dom.main.innerHTML, /Voided · Archived/);
  assert.match(dom.main.innerHTML, /Preserved in your archived history/);
  assert.match(dom.main.innerHTML, />Refunded</);

  state.portfolioFilter = "refunded";
  renderPortfolio();
  assert.equal((dom.main.innerHTML.match(/class="position-card"/g) || []).length, 2);
  assert.doesNotMatch(dom.main.innerHTML, /Active question/);

  state.portfolioFilter = "lost";
  renderPortfolio();
  assert.match(dom.main.innerHTML, /No losing positions/);
  assert.doesNotMatch(dom.main.innerHTML, /class="position-card"/);
});

test("leaderboard defaults to realized profit/loss instead of account value", () => {
  const { dom, renderLeaderboard, state } = loadAppInternals();
  state.user = { id: "winner" };
  state.profile = { id: "winner", display_name: "Winner", balance: 100, is_admin: false };
  state.profiles = [
    state.profile,
    { id: "wealthy", display_name: "Wealthy", balance: 1950, is_admin: false },
  ];
  state.markets = [
    { id: 1, creator_id: "wealthy", status: "resolved", winning_outcome_id: 11, closes_at: "2026-01-01T00:00:00Z" },
  ];
  state.outcomes = [
    { id: 11, market_id: 1, label: "Yes", seed_points: 25 },
    { id: 12, market_id: 1, label: "No", seed_points: 25 },
  ];
  state.predictions = [
    { user_id: "winner", market_id: 1, outcome_id: 11, amount: 100 },
    { user_id: "wealthy", market_id: 1, outcome_id: 12, amount: 50 },
  ];
  state.payouts = [
    { user_id: "winner", market_id: 1, amount: 150, kind: "winner" },
  ];

  renderLeaderboard();
  const tableBody = getLeaderboardTableBody(dom);

  assert.ok(
    tableBody.indexOf("Winner") < tableBody.indexOf("Wealthy"),
    "realized profit/loss should determine the default rank",
  );
  assert.match(dom.main.innerHTML, /Ranked by profit \/ loss on resolved markets/);
  assert.match(dom.main.innerHTML, /Total account value/);
  assert.match(dom.main.innerHTML, /data-leaderboard-sort="profitLoss"/);
  assert.match(dom.main.innerHTML, /data-leaderboard-sort="realizedReturn"/);
  assert.match(dom.main.innerHTML, /data-leaderboard-sort="activity"/);
  state.profile.is_admin = true;
  renderLeaderboard();
  assert.doesNotMatch(dom.main.innerHTML, /id="admin-points"|>Award points</);

  state.leaderboardSortKey = "balance";
  state.leaderboardSortDirection = "asc";
  renderLeaderboard();
  const balanceSortedTableBody = getLeaderboardTableBody(dom);
  assert.ok(
    balanceSortedTableBody.indexOf("Winner") < balanceSortedTableBody.indexOf("Wealthy"),
    "available balance should remain available as an independent sort",
  );
});

test("profit/loss ties use realized return and resolved stake", () => {
  const { dom, renderLeaderboard, state } = loadAppInternals();
  state.user = { id: "efficient" };
  state.profile = { id: "efficient", display_name: "Efficient", balance: 1000, is_admin: false };
  state.profiles = [
    state.profile,
    { id: "volume", display_name: "Volume", balance: 1000, is_admin: false },
    { id: "new", display_name: "New", balance: 1000, is_admin: false },
  ];
  state.markets = [
    { id: 1, creator_id: "new", status: "resolved", winning_outcome_id: 11, closes_at: "2026-01-01T00:00:00Z" },
  ];
  state.outcomes = [
    { id: 11, market_id: 1, label: "Yes", seed_points: 25 },
  ];
  state.predictions = [
    { user_id: "efficient", market_id: 1, outcome_id: 11, amount: 50 },
    { user_id: "volume", market_id: 1, outcome_id: 11, amount: 100 },
  ];
  state.payouts = [
    { user_id: "efficient", market_id: 1, amount: 100, kind: "winner" },
    { user_id: "volume", market_id: 1, amount: 150, kind: "winner" },
  ];

  renderLeaderboard();
  const tableBody = getLeaderboardTableBody(dom);
  assert.ok(tableBody.indexOf("Efficient") < tableBody.indexOf("Volume"));
  assert.ok(tableBody.indexOf("Volume") < tableBody.indexOf("New"));
});

test("leaderboard can rank by profit/loss and realized return", () => {
  const { dom, renderLeaderboard, state } = loadAppInternals();
  state.user = { id: "winner" };
  state.profile = { id: "winner", display_name: "Winner", balance: 1100, is_admin: false };
  state.profiles = [
    state.profile,
    { id: "new", display_name: "Newcomer", balance: 1000, is_admin: false },
    { id: "loser", display_name: "Loser", balance: 900, is_admin: false },
  ];
  state.markets = [
    { id: 1, creator_id: "new", status: "resolved", winning_outcome_id: 11, closes_at: "2026-01-01T00:00:00Z" },
  ];
  state.outcomes = [
    { id: 11, market_id: 1, label: "Yes", seed_points: 25 },
    { id: 12, market_id: 1, label: "No", seed_points: 25 },
  ];
  state.predictions = [
    { user_id: "winner", market_id: 1, outcome_id: 11, amount: 100 },
    { user_id: "loser", market_id: 1, outcome_id: 12, amount: 100 },
  ];
  state.payouts = [
    { user_id: "winner", market_id: 1, amount: 200, kind: "winner" },
  ];

  state.leaderboardSortKey = "profitLoss";
  state.leaderboardSortDirection = "desc";
  renderLeaderboard();
  const profitLossTableBody = getLeaderboardTableBody(dom);
  assert.ok(profitLossTableBody.indexOf("Winner") < profitLossTableBody.indexOf("Newcomer"));
  assert.ok(profitLossTableBody.indexOf("Newcomer") < profitLossTableBody.indexOf("Loser"));
  assert.match(dom.main.innerHTML, /\+100 pts/);
  assert.match(dom.main.innerHTML, /\+100\.0%/);

  state.leaderboardSortKey = "realizedReturn";
  state.leaderboardSortDirection = "asc";
  renderLeaderboard();
  const returnTableBody = getLeaderboardTableBody(dom);
  assert.ok(
    returnTableBody.indexOf("Loser") < returnTableBody.indexOf("Newcomer"),
    "an account without a resolved stake should sort below measured returns",
  );
  assert.match(dom.main.innerHTML, />—</);

  state.leaderboardSortKey = "activity";
  state.leaderboardSortDirection = "desc";
  renderLeaderboard();
  const activityTableBody = getLeaderboardTableBody(dom);
  assert.ok(
    activityTableBody.indexOf("Winner") < activityTableBody.indexOf("Newcomer"),
    "participants with predictions should rank above inactive accounts when sorted by activity",
  );
});

test("leaderboard highlights cumulative wagers, rolling activity, and tied leaders", () => {
  const { dom, renderLeaderboard, state } = loadAppInternals();
  const now = Date.now();
  const daysAgo = (days) => new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

  state.user = { id: "alex" };
  state.profile = { id: "alex", display_name: "Alex", balance: 500, is_admin: false };
  state.profiles = [
    state.profile,
    { id: "sam", display_name: "Sam", balance: 500, is_admin: false },
  ];
  state.markets = [
    { id: 1, creator_id: "alex", status: "resolved", winning_outcome_id: 11, closes_at: daysAgo(1) },
    { id: 2, creator_id: "sam", status: "resolved", winning_outcome_id: 21, closes_at: daysAgo(1) },
    { id: 3, creator_id: "sam", status: "void", winning_outcome_id: null, closes_at: daysAgo(1) },
  ];
  state.outcomes = [
    { id: 11, market_id: 1, label: "Yes", seed_points: 25 },
    { id: 21, market_id: 2, label: "Yes", seed_points: 25 },
    { id: 31, market_id: 3, label: "Yes", seed_points: 25 },
  ];
  state.predictions = [
    { user_id: "alex", market_id: 1, outcome_id: 11, amount: 100, created_at: daysAgo(40) },
    { user_id: "alex", market_id: 1, outcome_id: 11, amount: 400, created_at: daysAgo(5) },
    { user_id: "sam", market_id: 2, outcome_id: 21, amount: 500, created_at: daysAgo(10) },
    { user_id: "sam", market_id: 3, outcome_id: 31, amount: 900, created_at: daysAgo(2) },
  ];
  state.payouts = [
    { user_id: "alex", market_id: 1, amount: 500, kind: "no_winner_refund" },
    { user_id: "sam", market_id: 2, amount: 500, kind: "no_winner_refund" },
  ];

  renderLeaderboard();

  assert.match(dom.main.innerHTML, /Current robber baron/);
  assert.match(dom.main.innerHTML, /Alex &amp; Sam/);
  assert.match(dom.main.innerHTML, /0 points realized/);
  assert.match(dom.main.innerHTML, /Largest wager/);
  assert.match(dom.main.innerHTML, /500 points/);
  assert.match(dom.main.innerHTML, /<small>Alex &amp; Sam<\/small>/);
  assert.match(dom.main.innerHTML, /Points wagered/);
  assert.match(dom.main.innerHTML, /900 points/);
  assert.match(dom.main.innerHTML, /last 30 days/);
  assert.doesNotMatch(dom.main.innerHTML, /1,800 points/);
});

test("leaderboard highlight cards have friendly empty states", () => {
  const { dom, renderLeaderboard, state } = loadAppInternals();

  state.user = { id: "alex" };
  state.profile = { id: "alex", display_name: "Alex", balance: 1000, is_admin: false };
  state.profiles = [state.profile];
  state.markets = [];
  state.outcomes = [];
  state.predictions = [];
  state.payouts = [];

  renderLeaderboard();

  assert.match(dom.main.innerHTML, /Current robber baron/);
  assert.match(dom.main.innerHTML, /<strong title="Alex">Alex<\/strong>/);
  assert.match(dom.main.innerHTML, /0 points realized/);
  assert.equal((dom.main.innerHTML.match(/no wagers yet/g) || []).length, 2);
});

test("database payout and security definitions remain present", () => {
  const sql = fs.readFileSync(path.join(projectRoot, "database.sql"), "utf8");
  const allowlistMigration = fs.readFileSync(
    path.join(projectRoot, "migrations", "20260727_email_allowlist.sql"),
    "utf8",
  );
  const marketCorrectionMigration = fs.readFileSync(
    path.join(projectRoot, "migrations", "20260728_admin_market_corrections.sql"),
    "utf8",
  );
  const marketArchivingMigration = fs.readFileSync(
    path.join(projectRoot, "migrations", "20260728_void_market_archiving.sql"),
    "utf8",
  );
  const resolutionNotesMigration = fs.readFileSync(
    path.join(projectRoot, "migrations", "20260728_resolution_notes.sql"),
    "utf8",
  );
  const profileIconsMigration = fs.readFileSync(
    path.join(projectRoot, "migrations", "20260728_profile_icons.sql"),
    "utf8",
  );
  const app = fs.readFileSync(path.join(projectRoot, "app.js"), "utf8");
  const index = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");

  assert.match(sql, /fractional_remainder desc, user_id/);
  assert.match(sql, /v_payout_total <> v_total_pool/);
  assert.match(sql, /'no_winner_refund'/);
  assert.match(sql, /revoke all on table public\.predictions from anon, authenticated/);
  assert.match(sql, /grant execute on function public\.place_prediction/);
  assert.match(sql, /public\.grant_monthly_allowance/);
  assert.match(sql, /last_sign_in_at >= v_period_start - interval '90 days'/);
  assert.match(sql, /point_transactions_monthly_allowance_unique/);
  assert.match(sql, /friend-exchange-monthly-allowance/);
  assert.match(sql, /create table if not exists public\.approved_signup_emails/);
  assert.match(sql, /public\.hook_require_approved_email\(event jsonb\)/);
  assert.match(sql, /to supabase_auth_admin/);
  assert.match(sql, /public\.list_approved_signup_emails\(\)/);
  assert.match(sql, /public\.add_approved_signup_email\(text\)/);
  assert.match(sql, /public\.remove_approved_signup_email\(text\)/);
  assert.match(sql, /public\.edit_market\(bigint, text, text, timestamptz\)/);
  assert.match(sql, /public\.delete_empty_void_market\(bigint\)/);
  assert.match(sql, /public\.set_void_market_archived\(bigint, boolean\)/);
  assert.match(sql, /resolution_note text/);
  assert.match(sql, /resolved_by uuid references public\.profiles/);
  assert.match(sql, /public\.resolve_market\(bigint, bigint, text\)/);
  assert.match(sql, /profile_icon text/);
  assert.match(sql, /public\.update_profile\(text, text\)/);
  assert.match(sql, /A resolution note is required/);
  assert.match(sql, /markets_archive_requires_void/);
  assert.match(sql, /Only an administrator can edit a market/);
  assert.match(sql, /This market has prediction history and cannot be deleted/);
  assert.match(sql, /Empty voided markets should be deleted rather than archived/);
  assert.match(allowlistMigration, /Existing accounts are preserved/);
  assert.match(allowlistMigration, /from auth\.users as auth_user/);
  assert.match(allowlistMigration, /Auth hook can read approved signup emails/);
  assert.match(marketCorrectionMigration, /Only an administrator can edit a market/);
  assert.match(marketCorrectionMigration, /where market_id = p_market_id/);
  assert.match(marketArchivingMigration, /add column if not exists archived_at/);
  assert.match(marketArchivingMigration, /Only an administrator can archive or restore/);
  assert.match(marketArchivingMigration, /p_archived then now\(\) else null/);
  assert.match(resolutionNotesMigration, /add column if not exists resolution_note text/);
  assert.match(resolutionNotesMigration, /add column if not exists resolved_by uuid/);
  assert.match(resolutionNotesMigration, /drop function if exists public\.resolve_market\(bigint, bigint\)/);
  assert.match(resolutionNotesMigration, /A resolution note is required/);
  assert.match(resolutionNotesMigration, /resolution_note = btrim\(p_resolution_note\)/);
  assert.match(resolutionNotesMigration, /resolved_by = v_user_id/);
  assert.match(profileIconsMigration, /add column if not exists profile_icon text/);
  assert.match(profileIconsMigration, /profiles_profile_icon_allowed/);
  assert.match(profileIconsMigration, /public\.update_profile\(text, text\)/);
  assert.match(profileIconsMigration, /to authenticated/);
  assert.match(app, /p_resolution_note: resolutionNote/);
  assert.match(app, /p_profile_icon: profileIcon/);
  assert.match(app, /emailRedirectTo: getAuthRedirectUrl\(\)/);
  assert.doesNotMatch(app, /Disable Confirm email/);
  assert.match(index, /id="signup-confirmation"/);
  assert.match(index, /href="#\/admin"/);
});
