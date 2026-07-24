/* global supabase */

(() => {
  "use strict";

  const config = window.FRIEND_EXCHANGE_CONFIG || {};
  const dom = {
    app: document.querySelector("#app"),
    main: document.querySelector("#main-content"),
    setup: document.querySelector("#setup-screen"),
    auth: document.querySelector("#auth-screen"),
    authTabs: document.querySelector(".auth-tabs"),
    authModeButtons: document.querySelectorAll("[data-auth-mode]"),
    loginForm: document.querySelector("#login-form"),
    signupForm: document.querySelector("#signup-form"),
    resetRequestForm: document.querySelector("#reset-request-form"),
    passwordReset: document.querySelector("#password-reset-screen"),
    passwordResetForm: document.querySelector("#password-reset-form"),
    forgotPasswordButton: document.querySelector("#forgot-password-button"),
    backToLoginButton: document.querySelector("#back-to-login-button"),
    modalRoot: document.querySelector("#modal-root"),
    toastRoot: document.querySelector("#toast-root"),
    headerBalance: document.querySelector("#header-balance"),
    balanceButton: document.querySelector("#balance-button"),
  };

  const state = {
    client: null,
    user: null,
    profile: null,
    profiles: [],
    markets: [],
    outcomes: [],
    predictions: [],
    payouts: [],
    marketFilter: "active",
    leaderboardSortKey: "profitLoss",
    leaderboardSortDirection: "desc",
    loading: false,
    realtimeChannel: null,
    realtimeTimer: null,
    authSubscription: null,
    passwordRecovery: false,
  };

  document.querySelector("#join-app-name").textContent = config.appName || "The Friend Exchange";
  document.querySelector("#header-app-name").textContent = config.appName || "The Friend Exchange";
  document.querySelector("#join-tagline").textContent = config.tagline || "Markets of consequence. Sort of.";
  document.querySelector("#header-tagline").textContent = config.tagline || "Markets of consequence. Sort of.";

  function isConfigured() {
    return (
      typeof window.supabase !== "undefined" &&
      config.supabaseUrl &&
      config.supabasePublishableKey &&
      !config.supabaseUrl.includes("YOUR-PROJECT") &&
      !config.supabasePublishableKey.includes("YOUR-PUBLISHABLE-KEY")
    );
  }

  async function init() {
    if (!isConfigured()) {
      dom.setup.classList.remove("hidden");
      return;
    }

    state.client = window.supabase.createClient(
      config.supabaseUrl,
      config.supabasePublishableKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );

    bindGlobalEvents();

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);
    state.passwordRecovery =
      hashParams.get("type") === "recovery" || queryParams.get("type") === "recovery";

    const { data: authListener } = state.client.auth.onAuthStateChange((event, session) => {
      state.user = session?.user || null;

      if (event === "PASSWORD_RECOVERY") {
        state.passwordRecovery = true;
        window.setTimeout(showPasswordReset, 0);
      }

      if (event === "SIGNED_OUT") {
        window.setTimeout(() => {
          resetAppState();
          showAuth("login");
        }, 0);
      }
    });
    state.authSubscription = authListener.subscription;

    const { data, error } = await state.client.auth.getSession();
    if (error) {
      showToast(error.message, "error");
      showAuth("login");
      return;
    }

    state.user = data.session?.user || null;
    if (!state.user) {
      showAuth("login");
      return;
    }

    if (state.passwordRecovery) {
      showPasswordReset();
      return;
    }

    await enterApp();
  }

  function bindGlobalEvents() {
    dom.loginForm.addEventListener("submit", handleLogin);
    dom.signupForm.addEventListener("submit", handleSignup);
    dom.resetRequestForm.addEventListener("submit", handleResetRequest);
    dom.passwordResetForm.addEventListener("submit", handlePasswordReset);

    dom.authModeButtons.forEach((button) => {
      button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
    });

    dom.forgotPasswordButton.addEventListener("click", () => {
      const loginEmail = document.querySelector("#login-email").value.trim();
      document.querySelector("#reset-email").value = loginEmail;
      dom.authTabs.classList.add("hidden");
      dom.loginForm.classList.add("hidden");
      dom.signupForm.classList.add("hidden");
      dom.resetRequestForm.classList.remove("hidden");
      setTimeout(() => document.querySelector("#reset-email")?.focus(), 50);
    });

    dom.backToLoginButton.addEventListener("click", () => setAuthMode("login"));
    window.addEventListener("hashchange", renderRoute);

    dom.balanceButton.addEventListener("click", () => {
      openAccountModal();
    });

    dom.modalRoot.addEventListener("click", (event) => {
      if (event.target.matches("[data-modal-close], .modal-backdrop")) {
        closeModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && dom.modalRoot.firstElementChild) {
        closeModal();
      }
    });
  }

  function setAuthMode(mode = "login") {
    const isSignup = mode === "signup";

    dom.authTabs.classList.remove("hidden");
    dom.resetRequestForm.classList.add("hidden");
    dom.loginForm.classList.toggle("hidden", isSignup);
    dom.signupForm.classList.toggle("hidden", !isSignup);

    dom.authModeButtons.forEach((button) => {
      const isActive = button.dataset.authMode === mode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    const focusTarget = isSignup ? "#signup-display-name" : "#login-email";
    setTimeout(() => document.querySelector(focusTarget)?.focus(), 50);
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const button = event.currentTarget.querySelector("button[type='submit']");

    setButtonLoading(button, true, "Opening the exchange…");
    const { data, error } = await state.client.auth.signInWithPassword({ email, password });
    setButtonLoading(button, false);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    state.user = data.user;
    await enterApp();
    showToast("Welcome back. The markets remained irrational without you.", "success");
  }

  async function handleSignup(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const displayName = String(form.get("displayName") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const passwordConfirm = String(form.get("passwordConfirm") || "");
    const button = event.currentTarget.querySelector("button[type='submit']");

    if (displayName.length < 2) {
      showToast("Please use a display name with at least two characters.", "error");
      return;
    }

    if (password.length < 8) {
      showToast("Please use a password with at least eight characters.", "error");
      return;
    }

    if (password !== passwordConfirm) {
      showToast("Those passwords do not match.", "error");
      return;
    }

    setButtonLoading(button, true, "Creating your account…");
    const { data, error } = await state.client.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });
    setButtonLoading(button, false);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    if (!data.session) {
      setAuthMode("login");
      document.querySelector("#login-email").value = email;
      showToast(
        "Account created, but Supabase is still requiring email confirmation. Disable Confirm email in the Email provider settings, then log in.",
        "error",
      );
      return;
    }

    state.user = data.user;
    await enterApp();
    showToast("Account created. You received 1,000 points of absolutely no value.", "success");
  }

  async function handleResetRequest(event) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") || "").trim();
    const button = event.currentTarget.querySelector("button[type='submit']");

    setButtonLoading(button, true, "Sending…");
    const { error } = await state.client.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordResetRedirectUrl(),
    });
    setButtonLoading(button, false);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    setAuthMode("login");
    document.querySelector("#login-email").value = email;
    showToast("Password-reset link sent. Check your email.", "success");
  }

  async function handlePasswordReset(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const passwordConfirm = String(form.get("passwordConfirm") || "");
    const button = event.currentTarget.querySelector("button[type='submit']");

    if (password.length < 8) {
      showToast("Please use a password with at least eight characters.", "error");
      return;
    }

    if (password !== passwordConfirm) {
      showToast("Those passwords do not match.", "error");
      return;
    }

    setButtonLoading(button, true, "Updating…");
    const { data, error } = await state.client.auth.updateUser({ password });
    setButtonLoading(button, false);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    state.passwordRecovery = false;
    state.user = data.user || state.user;
    cleanAuthUrl();
    await enterApp();
    showToast("Password updated. Your fictional assets are secure again.", "success");
  }

  function getPasswordResetRedirectUrl() {
    return `${window.location.origin}${window.location.pathname}`;
  }

  function cleanAuthUrl() {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  function showAuth(mode = "login") {
    dom.setup.classList.add("hidden");
    dom.app.classList.add("hidden");
    dom.passwordReset.classList.add("hidden");
    dom.auth.classList.remove("hidden");
    setAuthMode(mode);
  }

  function showPasswordReset() {
    dom.setup.classList.add("hidden");
    dom.app.classList.add("hidden");
    dom.auth.classList.add("hidden");
    dom.passwordReset.classList.remove("hidden");
    setTimeout(() => document.querySelector("#new-password")?.focus(), 50);
  }

  function resetAppState() {
    window.clearTimeout(state.realtimeTimer);
    if (state.realtimeChannel && state.client) {
      state.client.removeChannel(state.realtimeChannel);
    }
    state.realtimeChannel = null;
    state.user = null;
    state.profile = null;
    state.profiles = [];
    state.markets = [];
    state.outcomes = [];
    state.predictions = [];
    state.payouts = [];
    state.leaderboardSortKey = "profitLoss";
    state.leaderboardSortDirection = "desc";
    state.loading = false;
  }

  async function enterApp() {
    dom.setup.classList.add("hidden");
    dom.auth.classList.add("hidden");
    dom.passwordReset.classList.add("hidden");
    dom.app.classList.remove("hidden");

    if (!window.location.hash) {
      window.location.hash = "#/markets";
    }

    renderLoading();
    await refreshData();
    subscribeToChanges();
  }

  async function refreshData({ quiet = false } = {}) {
    if (state.loading) return;
    state.loading = true;

    if (!quiet) renderLoading();

    const [profilesResult, marketsResult, outcomesResult, predictionsResult, payoutsResult] =
      await Promise.all([
        state.client.from("profiles").select("id, display_name, balance, is_admin, created_at"),
        state.client.from("markets").select("*").order("created_at", { ascending: false }),
        state.client.from("outcomes").select("*").order("sort_order", { ascending: true }),
        state.client.from("predictions").select("*").order("created_at", { ascending: false }),
        state.client.from("market_payouts").select("*"),
      ]);

    state.loading = false;

    const firstError = [
      profilesResult.error,
      marketsResult.error,
      outcomesResult.error,
      predictionsResult.error,
      payoutsResult.error,
    ].find(Boolean);

    if (firstError) {
      renderFatalError(firstError);
      return;
    }

    state.profiles = profilesResult.data || [];
    state.markets = marketsResult.data || [];
    state.outcomes = outcomesResult.data || [];
    state.predictions = predictionsResult.data || [];
    state.payouts = payoutsResult.data || [];
    state.profile = state.profiles.find((profile) => profile.id === state.user.id) || null;

    if (!state.profile) {
      renderFatalError(
        new Error("Your profile was not created. Re-run database.sql in Supabase, then refresh."),
      );
      return;
    }

    updateHeader();
    renderRoute();
  }

  function subscribeToChanges() {
    if (state.realtimeChannel) return;

    const queueRefresh = () => {
      window.clearTimeout(state.realtimeTimer);
      state.realtimeTimer = window.setTimeout(() => refreshData({ quiet: true }), 500);
    };

    state.realtimeChannel = state.client
      .channel("friend-exchange-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "markets" }, queueRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "outcomes" }, queueRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "predictions" }, queueRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, queueRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "market_payouts" }, queueRefresh)
      .subscribe();
  }

  function updateHeader() {
    dom.headerBalance.textContent = `${formatNumber(state.profile?.balance || 0)} pts`;
  }

  function renderLoading() {
    if (!dom.app.classList.contains("hidden")) {
      dom.main.innerHTML = `
        <div class="page-header">
          <div>
            <div class="skeleton" style="width:110px;height:12px;margin-bottom:12px"></div>
            <div class="skeleton" style="width:min(520px,80vw);height:54px"></div>
          </div>
        </div>
        <div class="loading-grid">
          <div class="loading-card skeleton"></div>
          <div class="loading-card skeleton"></div>
          <div class="loading-card skeleton"></div>
          <div class="loading-card skeleton"></div>
        </div>
      `;
    }
  }

  function renderFatalError(error) {
    dom.main.innerHTML = `
      <section class="empty-state">
        <div class="empty-state-icon">!</div>
        <h2>The exchange has halted trading.</h2>
        <p>${escapeHtml(error.message || "Something went wrong while loading the data.")}</p>
        <button class="button button-primary" id="retry-button" type="button">Try again</button>
      </section>
    `;
    document.querySelector("#retry-button")?.addEventListener("click", () => refreshData());
  }

  function getRoute() {
    const clean = (window.location.hash || "#/markets").replace(/^#\/?/, "");
    const [page = "markets", id] = clean.split("/");
    return { page, id };
  }

  function renderRoute() {
    if (!state.profile || state.loading) return;

    const route = getRoute();
    setActiveNav(route.page);

    switch (route.page) {
      case "market":
        renderMarketDetail(Number(route.id));
        break;
      case "create":
        renderCreateMarket();
        break;
      case "leaderboard":
        renderLeaderboard();
        break;
      case "portfolio":
        renderPortfolio();
        break;
      case "markets":
      default:
        renderMarkets();
        break;
    }

    window.scrollTo({ top: 0, behavior: "instant" });
    dom.main.focus({ preventScroll: true });
  }

  function setActiveNav(page) {
    const normalized = page === "market" ? "markets" : page;
    document.querySelectorAll("[data-nav]").forEach((link) => {
      const linkPage = link.getAttribute("href")?.replace("#/", "");
      link.classList.toggle("active", linkPage === normalized);
    });
  }

  function enrichMarket(market) {
    const outcomes = state.outcomes
      .filter((outcome) => outcome.market_id === market.id)
      .map((outcome) => {
        const predictions = state.predictions.filter((prediction) => prediction.outcome_id === outcome.id);
        const actualPoints = predictions.reduce((sum, prediction) => sum + prediction.amount, 0);
        return { ...outcome, predictions, actualPoints };
      });

    const seedTotal = outcomes.reduce((sum, outcome) => sum + outcome.seed_points, 0);
    const actualTotal = outcomes.reduce((sum, outcome) => sum + outcome.actualPoints, 0);
    const displayTotal = seedTotal + actualTotal;

    outcomes.forEach((outcome) => {
      outcome.percent = displayTotal > 0
        ? ((outcome.actualPoints + outcome.seed_points) / displayTotal) * 100
        : 100 / Math.max(outcomes.length, 1);
    });

    const marketPredictions = state.predictions.filter((prediction) => prediction.market_id === market.id);
    const participants = new Set(marketPredictions.map((prediction) => prediction.user_id));
    const creator = state.profiles.find((profile) => profile.id === market.creator_id);
    const winner = outcomes.find((outcome) => outcome.id === market.winning_outcome_id) || null;
    const isPastClose = new Date(market.closes_at).getTime() <= Date.now();
    const displayStatus = market.status === "open" && isPastClose ? "closed" : market.status;

    return {
      ...market,
      outcomes,
      predictions: marketPredictions,
      actualTotal,
      participants: participants.size,
      creator,
      winner,
      isPastClose,
      displayStatus,
    };
  }

  function getAllMarkets() {
    return state.markets.map(enrichMarket);
  }

  function calculateCurrentOutcomePayout(market, outcomeId, userId) {
    const stakesByUser = new Map();
    let totalPool = 0;

    market.predictions.forEach((prediction) => {
      totalPool += prediction.amount;
      if (prediction.outcome_id !== outcomeId) return;
      stakesByUser.set(
        prediction.user_id,
        (stakesByUser.get(prediction.user_id) || 0) + prediction.amount,
      );
    });

    const winningPool = [...stakesByUser.values()].reduce((sum, stake) => sum + stake, 0);
    if (totalPool <= 0 || winningPool <= 0 || !stakesByUser.has(userId)) return 0;

    const totalPoolBigInt = BigInt(totalPool);
    const winningPoolBigInt = BigInt(winningPool);
    const roundedPayouts = [...stakesByUser.entries()].map(([stakeUserId, stake]) => {
      const numerator = BigInt(stake) * totalPoolBigInt;
      return {
        userId: stakeUserId,
        payout: numerator / winningPoolBigInt,
        remainder: numerator % winningPoolBigInt,
      };
    });
    const basePayoutTotal = roundedPayouts.reduce((sum, row) => sum + row.payout, 0n);
    const leftoverPoints = Number(totalPoolBigInt - basePayoutTotal);

    roundedPayouts.sort((a, b) => {
      if (a.remainder !== b.remainder) return a.remainder > b.remainder ? -1 : 1;
      if (a.userId === b.userId) return 0;
      return a.userId < b.userId ? -1 : 1;
    });

    roundedPayouts.slice(0, leftoverPoints).forEach((row) => {
      row.payout += 1n;
    });

    return Number(roundedPayouts.find((row) => row.userId === userId)?.payout || 0n);
  }

  function getLivePositionScenarios(market, userId) {
    const userPredictions = market.predictions.filter(
      (prediction) => prediction.user_id === userId,
    );
    const totalCommitted = userPredictions.reduce(
      (sum, prediction) => sum + prediction.amount,
      0,
    );
    if (totalCommitted <= 0) return [];

    const outcomeTotals = new Map();
    const userOutcomeTotals = new Map();
    market.predictions.forEach((prediction) => {
      outcomeTotals.set(
        prediction.outcome_id,
        (outcomeTotals.get(prediction.outcome_id) || 0) + prediction.amount,
      );
      if (prediction.user_id === userId) {
        userOutcomeTotals.set(
          prediction.outcome_id,
          (userOutcomeTotals.get(prediction.outcome_id) || 0) + prediction.amount,
        );
      }
    });

    const scenarios = market.outcomes
      .filter((outcome) => (userOutcomeTotals.get(outcome.id) || 0) > 0)
      .map((outcome) => {
        const payout = calculateCurrentOutcomePayout(market, outcome.id, userId);
        return {
          kind: "backed",
          outcomeIds: [outcome.id],
          title: `If “${outcome.label}” wins`,
          payout,
          net: payout - totalCommitted,
          detail: `${formatNumber(payout)} pts returned`,
        };
      });

    const otherBackedOutcomes = market.outcomes.filter(
      (outcome) =>
        (userOutcomeTotals.get(outcome.id) || 0) === 0 &&
        (outcomeTotals.get(outcome.id) || 0) > 0,
    );
    if (otherBackedOutcomes.length > 0) {
      scenarios.push({
        kind: "other",
        outcomeIds: otherBackedOutcomes.map((outcome) => outcome.id),
        title: otherBackedOutcomes.length === 1
          ? `If “${otherBackedOutcomes[0].label}” wins`
          : "If any other backed outcome wins",
        payout: 0,
        net: -totalCommitted,
        detail: "No payout",
      });
    }

    const emptyOutcomes = market.outcomes.filter(
      (outcome) => (outcomeTotals.get(outcome.id) || 0) === 0,
    );
    if (emptyOutcomes.length > 0) {
      scenarios.push({
        kind: "refund",
        outcomeIds: emptyOutcomes.map((outcome) => outcome.id),
        title: emptyOutcomes.length === 1
          ? `If “${emptyOutcomes[0].label}” wins`
          : "If an outcome with no predictions wins",
        payout: totalCommitted,
        net: 0,
        detail: `${formatNumber(totalCommitted)} pts refunded`,
      });
    }

    return scenarios;
  }

  function renderLivePosition(market, userId) {
    const scenarios = getLivePositionScenarios(market, userId);
    if (scenarios.length === 0 || market.status !== "open") return "";

    return `
      <section class="live-position" aria-labelledby="live-position-heading">
        <div class="live-position-heading">
          <p class="eyebrow" id="live-position-heading">Your live position</p>
          <span>If resolved now</span>
        </div>
        <div class="live-position-list">
          ${scenarios.map((scenario) => {
            const resultClass =
              scenario.net > 0
                ? "text-success"
                : scenario.net < 0
                  ? "text-danger"
                  : "";
            const netText =
              `${scenario.net > 0 ? "+" : ""}${formatNumber(scenario.net)} pts`;
            return `
              <div class="live-position-row">
                <span class="live-position-label">${escapeHtml(scenario.title)}</span>
                <span class="live-position-result">
                  <strong class="${resultClass}">${netText}</strong>
                  <small>${escapeHtml(scenario.detail)}</small>
                </span>
              </div>
            `;
          }).join("")}
        </div>
        <p class="live-position-note">Current pool only. Updates as predictions are added.</p>
      </section>
    `;
  }

  function renderMarkets() {
    const markets = getAllMarkets();
    const activeMarkets = markets.filter((market) => ["open", "closed"].includes(market.displayStatus));
    const resolvedMarkets = markets.filter((market) => ["resolved", "void"].includes(market.displayStatus));
    const totalAtStake = activeMarkets.reduce((sum, market) => sum + market.actualTotal, 0);
    const totalPredictions = state.predictions.length;

    let filtered = markets;
    if (state.marketFilter === "active") filtered = activeMarkets;
    if (state.marketFilter === "resolved") filtered = resolvedMarkets;

    dom.main.innerHTML = `
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">The world's least consequential exchange</p>
          <h1>Put fake points behind your real opinions.</h1>
          <p>
            Forecast parties, questionable decisions, chronic lateness, and other events
            underserved by traditional financial institutions.
          </p>
          <div class="hero-actions">
            <a class="button button-mint button-large" href="#/create">Create a market</a>
            <button class="button button-secondary button-large" id="how-it-works" type="button">How this nonsense works</button>
          </div>
        </div>
        <div class="hero-stats">
          <div class="hero-stat">
            <span>Active markets</span>
            <strong>${formatNumber(activeMarkets.length)}</strong>
          </div>
          <div class="hero-stat">
            <span>Points in play</span>
            <strong>${formatCompact(totalAtStake)}</strong>
          </div>
          <div class="hero-stat">
            <span>Predictions placed</span>
            <strong>${formatNumber(totalPredictions)}</strong>
          </div>
          <div class="hero-stat">
            <span>Your balance</span>
            <strong>${formatCompact(state.profile.balance)}</strong>
          </div>
        </div>
      </section>

      <div class="section-heading">
        <div>
          <p class="eyebrow">Community markets</p>
          <h2>Trade on what happens next</h2>
        </div>
      </div>

      <div class="filter-row" role="group" aria-label="Filter markets">
        ${filterButton("active", "Active", activeMarkets.length)}
        ${filterButton("resolved", "Resolved", resolvedMarkets.length)}
        ${filterButton("all", "All", markets.length)}
      </div>

      <section class="market-grid">
        ${filtered.length ? filtered.map(renderMarketCard).join("") : renderNoMarkets(state.marketFilter)}
      </section>
    `;

    document.querySelectorAll("[data-market-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.marketFilter = button.dataset.marketFilter;
        renderMarkets();
      });
    });

    document.querySelector("#how-it-works")?.addEventListener("click", openHowItWorksModal);
  }

  function filterButton(value, label, count) {
    return `
      <button
        class="filter-chip ${state.marketFilter === value ? "active" : ""}"
        data-market-filter="${value}"
        type="button"
      >
        ${label} · ${count}
      </button>
    `;
  }

  function renderNoMarkets(filter) {
    const isActive = filter === "active";
    return `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">${isActive ? "?" : "✓"}</div>
        <h2>${isActive ? "No active markets. Society is healing." : "Nothing here yet."}</h2>
        <p>${isActive ? "Create a question and give your friends something new to be confidently wrong about." : "Resolved markets will appear here after reality provides an answer."}</p>
        ${isActive ? '<a class="button button-primary" href="#/create">Create the first market</a>' : ""}
      </div>
    `;
  }

  function renderMarketCard(market) {
    const displayedOutcomes = [...market.outcomes]
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 4);

    return `
      <article class="market-card">
        <div class="market-card-top">
          ${statusPill(market.displayStatus)}
          <span class="tiny-pill">${market.outcomes.length} outcomes</span>
        </div>
        <h2><a href="#/market/${market.id}">${escapeHtml(market.question)}</a></h2>
        <div class="odds-list">
          ${displayedOutcomes.map((outcome) => `
            <div class="odds-row">
              <span class="odds-label">${escapeHtml(outcome.label)}</span>
              <span class="odds-percent">${formatPercent(outcome.percent)}</span>
              <div class="odds-track" aria-hidden="true">
                <div class="odds-fill" style="width:${clamp(outcome.percent, 0, 100)}%"></div>
              </div>
            </div>
          `).join("")}
        </div>
        <footer class="market-card-footer">
          <span>${formatNumber(market.actualTotal)} pts · ${market.participants} ${pluralize(market.participants, "trader")}</span>
          <span>${market.displayStatus === "open" ? `Closes ${formatRelativeDate(market.closes_at)}` : formatStatusFooter(market)}</span>
        </footer>
      </article>
    `;
  }

  function formatStatusFooter(market) {
    if (market.displayStatus === "closed") return "Awaiting reality";
    if (market.displayStatus === "void") return "All points refunded";
    if (market.displayStatus === "resolved") return `Winner: ${market.winner ? escapeHtml(market.winner.label) : "Resolved"}`;
    return "";
  }

  function renderMarketDetail(marketId) {
    const market = getAllMarkets().find((item) => item.id === marketId);
    if (!market) {
      renderNotFound();
      return;
    }

    const isCreator = market.creator_id === state.user.id;
    const canManage = isCreator || state.profile.is_admin;
    const canPredict = market.displayStatus === "open";
    const canResolve = canManage && market.status === "open" && (market.isPastClose || state.profile.is_admin);
    const userPredictions = market.predictions.filter((prediction) => prediction.user_id === state.user.id);
    const userCommitted = userPredictions.reduce((sum, prediction) => sum + prediction.amount, 0);
    const sortedOutcomes = [...market.outcomes].sort((a, b) => b.percent - a.percent);
    const recentActivity = [...market.predictions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20);

    dom.main.innerHTML = `
      <div class="market-layout">
        <div class="market-main">
          <section class="market-hero">
            <p class="eyebrow">Market #${market.id} · ${escapeHtml(statusLabel(market.displayStatus))}</p>
            <h1>${escapeHtml(market.question)}</h1>
            ${market.description ? `<p class="market-description">${escapeHtml(market.description)}</p>` : ""}
            <div class="market-meta-row">
              <span class="tiny-pill">Created by ${escapeHtml(market.creator?.display_name || "Unknown")}</span>
              <span class="tiny-pill">Closes ${formatDateTime(market.closes_at)}</span>
              <span class="tiny-pill">${formatNumber(market.actualTotal)} points in pool</span>
            </div>
          </section>

          <section class="panel">
            <div class="panel-heading">
              <div>
                <h2>${market.displayStatus === "resolved" ? "Final results" : "Community odds"}</h2>
                <p>Display odds include ${market.outcomes[0]?.seed_points || 25} seed points per outcome. Payouts use real predictions only.</p>
              </div>
              ${statusPill(market.displayStatus)}
            </div>

            <div class="outcome-list">
              ${sortedOutcomes.map((outcome) => renderOutcomeCard(outcome, market, canPredict)).join("")}
            </div>
          </section>

          <section class="panel">
            <div class="panel-heading">
              <div>
                <h2>Recent activity</h2>
                <p>Public accountability for all questionable convictions.</p>
              </div>
            </div>
            ${recentActivity.length ? `
              <div class="activity-list">
                ${recentActivity.map((prediction) => renderActivityItem(prediction, market)).join("")}
              </div>
            ` : `
              <div class="empty-state">
                <div class="empty-state-icon">…</div>
                <h2>Quiet. Too quiet.</h2>
                <p>No one has put any points behind an opinion yet.</p>
              </div>
            `}
          </section>
        </div>

        <aside class="market-sidebar">
          <section class="card">
            <p class="eyebrow">Market snapshot</p>
            <div class="stats-grid">
              <div class="stat-card">
                <span>Pool</span>
                <strong>${formatNumber(market.actualTotal)}</strong>
              </div>
              <div class="stat-card">
                <span>Traders</span>
                <strong>${market.participants}</strong>
              </div>
              <div class="stat-card">
                <span>Trades</span>
                <strong>${market.predictions.length}</strong>
              </div>
            </div>

            <div class="summary-stack" style="margin-top:18px">
              <div class="summary-row">
                <span>Your balance</span>
                <strong>${formatNumber(state.profile.balance)} pts</strong>
              </div>
              <div class="summary-row">
                <span>Your points committed</span>
                <strong>${formatNumber(userCommitted)} pts</strong>
              </div>
              <div class="summary-row">
                <span>Resolution</span>
                <strong>${market.displayStatus === "resolved" ? escapeHtml(market.winner?.label || "Resolved") : market.displayStatus === "void" ? "Voided" : "Pending"}</strong>
              </div>
            </div>

            ${renderLivePosition(market, state.user.id)}

            <div class="sidebar-actions">
              ${canPredict ? '<button class="button button-primary" id="predict-outcome" type="button">Place a prediction</button>' : ""}
              ${canResolve ? '<button class="button button-mint" id="resolve-market" type="button">Resolve market</button>' : ""}
              ${canManage && market.status === "open" ? '<button class="button button-danger" id="void-market" type="button">Void and refund</button>' : ""}
              <a class="button button-secondary" href="#/markets">Back to all markets</a>
            </div>
          </section>

          <section class="card">
            <p class="eyebrow">The fine print</p>
            <p class="muted" style="font-size:.78rem;margin:0">
              Predictions are final. You may add more points later, including to a different outcome,
              but committed points cannot be withdrawn. Winners split the entire pool proportionally.
            </p>
          </section>
        </aside>
      </div>
    `;

    document.querySelectorAll("[data-predict-outcome]").forEach((button) => {
      button.addEventListener("click", () => openPredictionModal(market, Number(button.dataset.predictOutcome)));
    });

    document.querySelector("#predict-outcome")?.addEventListener("click", () => {
      openPredictionModal(market);
    });

    document.querySelector("#resolve-market")?.addEventListener("click", () => openResolveModal(market));
    document.querySelector("#void-market")?.addEventListener("click", () => openVoidModal(market));
  }

  function renderOutcomeCard(outcome, market, canPredict) {
    const isWinner = market.winning_outcome_id === outcome.id;
    const userAmount = market.predictions
      .filter((prediction) => prediction.user_id === state.user.id && prediction.outcome_id === outcome.id)
      .reduce((sum, prediction) => sum + prediction.amount, 0);

    return `
      <article class="outcome-card ${isWinner ? "winner" : ""}">
        <div class="outcome-card-leading">
          <div class="outcome-name-line">
            <span class="outcome-name">${escapeHtml(outcome.label)}</span>
            ${isWinner ? '<span class="tiny-pill">Winner</span>' : ""}
            ${userAmount ? `<span class="tiny-pill">You: ${formatNumber(userAmount)}</span>` : ""}
          </div>
          <div class="odds-track" aria-hidden="true">
            <div class="odds-fill" style="width:${clamp(outcome.percent, 0, 100)}%"></div>
          </div>
        </div>
        <div class="outcome-numbers">
          <strong>${formatPercent(outcome.percent)}</strong>
          <small>${formatNumber(outcome.actualPoints)} real pts</small>
        </div>
        ${canPredict ? `
          <div class="outcome-action">
            <button class="button button-secondary button-small" data-predict-outcome="${outcome.id}" type="button">
              Back this outcome
            </button>
          </div>
        ` : ""}
      </article>
    `;
  }

  function renderActivityItem(prediction, market) {
    const profile = state.profiles.find((item) => item.id === prediction.user_id);
    const outcome = market.outcomes.find((item) => item.id === prediction.outcome_id);
    const name = profile?.display_name || "Unknown trader";

    return `
      <div class="activity-item">
        <div class="avatar">${escapeHtml(initials(name))}</div>
        <div class="activity-copy">
          <strong>${escapeHtml(name)}</strong>
          <span> put ${formatNumber(prediction.amount)} pts on </span>
          <strong>${escapeHtml(outcome?.label || "an outcome")}</strong>
        </div>
        <time class="activity-time" datetime="${prediction.created_at}">${formatRelativeDate(prediction.created_at)}</time>
      </div>
    `;
  }

  function renderCreateMarket() {
    const defaultClose = toLocalDateTimeInput(new Date(Date.now() + 24 * 60 * 60 * 1000));

    dom.main.innerHTML = `
      <div class="page-header">
        <div>
          <p class="eyebrow">New market</p>
          <h1>Turn uncertainty into content.</h1>
          <p>Create a question with 2–10 possible outcomes.</p>
        </div>
      </div>

      <form id="create-market-form" class="form-card">
        <section class="form-section">
          <div class="form-section-heading">
            <span class="form-number">01</span>
            <div>
              <h2>Ask the important question</h2>
              <p>Clear enough to resolve. Silly enough to deserve a market.</p>
            </div>
          </div>
          <div class="form-grid">
            <div class="form-field form-field-full">
              <label for="market-question">Question</label>
              <input id="market-question" name="question" maxlength="180" placeholder="Who will be first to leave the party?" required />
            </div>
            <div class="form-field form-field-full">
              <label for="market-description">Details <span class="muted">(optional)</span></label>
              <textarea id="market-description" name="description" maxlength="600" placeholder="Define any rules, edge cases, or highly specific party jurisprudence."></textarea>
            </div>
          </div>
        </section>

        <section class="form-section">
          <div class="form-section-heading">
            <span class="form-number">02</span>
            <div>
              <h2>Add the possible outcomes</h2>
              <p>Yes/No works. So do Joe/Susan/Beth/An unexplained disappearance.</p>
            </div>
          </div>
          <div id="choice-builder" class="choice-builder"></div>
          <button class="button button-secondary button-small" id="add-choice" type="button" style="margin-top:12px">＋ Add another outcome</button>
        </section>

        <section class="form-section">
          <div class="form-section-heading">
            <span class="form-number">03</span>
            <div>
              <h2>Set the closing bell</h2>
              <p>No new predictions can be placed after this time.</p>
            </div>
          </div>
          <div class="form-grid">
            <div class="form-field">
              <label for="market-closes">Predictions close</label>
              <input id="market-closes" name="closesAt" type="datetime-local" value="${defaultClose}" required />
            </div>
            <div class="form-field">
              <span class="field-label">Who resolves it?</span>
              <div style="min-height:48px;display:flex;align-items:center;padding:0 14px;border:1px solid var(--line);border-radius:10px;background:#faf9f2;font-size:.82rem">
                You, plus any site administrator
              </div>
            </div>
          </div>
        </section>

        <footer class="form-footer">
          <p>Each outcome receives 25 display-only seed points. These affect the odds, not the payout.</p>
          <button class="button button-primary button-large" type="submit">Open this market</button>
        </footer>
      </form>
    `;

    const choiceBuilder = document.querySelector("#choice-builder");
    const choices = ["Yes", "No"];

    const renderChoices = () => {
      choiceBuilder.innerHTML = choices.map((choice, index) => `
        <div class="choice-row">
          <span class="choice-handle">${String(index + 1).padStart(2, "0")}</span>
          <input
            class="choice-input"
            type="text"
            maxlength="80"
            value="${escapeAttribute(choice)}"
            placeholder="Outcome ${index + 1}"
            aria-label="Outcome ${index + 1}"
            required
          />
          <button class="icon-button" data-remove-choice="${index}" type="button" aria-label="Remove outcome ${index + 1}" ${choices.length <= 2 ? "disabled" : ""}>×</button>
        </div>
      `).join("");

      document.querySelectorAll(".choice-input").forEach((input, index) => {
        input.addEventListener("input", () => {
          choices[index] = input.value;
        });
      });

      document.querySelectorAll("[data-remove-choice]").forEach((button) => {
        button.addEventListener("click", () => {
          choices.splice(Number(button.dataset.removeChoice), 1);
          renderChoices();
        });
      });

      document.querySelector("#add-choice").disabled = choices.length >= 10;
    };

    renderChoices();

    document.querySelector("#add-choice").addEventListener("click", () => {
      if (choices.length >= 10) return;
      choices.push("");
      renderChoices();
      document.querySelectorAll(".choice-input")[choices.length - 1]?.focus();
    });

    document.querySelector("#create-market-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const question = String(form.get("question") || "").trim();
      const description = String(form.get("description") || "").trim();
      const closesAtRaw = String(form.get("closesAt") || "");
      const outcomeLabels = choices.map((choice) => choice.trim()).filter(Boolean);
      const normalized = outcomeLabels.map((label) => label.toLocaleLowerCase());
      const submit = event.currentTarget.querySelector("button[type='submit']");

      if (outcomeLabels.length < 2) {
        showToast("Add at least two outcomes.", "error");
        return;
      }

      if (new Set(normalized).size !== normalized.length) {
        showToast("Each outcome needs a unique name.", "error");
        return;
      }

      const closesAt = new Date(closesAtRaw);
      if (Number.isNaN(closesAt.getTime()) || closesAt.getTime() <= Date.now()) {
        showToast("Choose a closing time in the future.", "error");
        return;
      }

      setButtonLoading(submit, true, "Opening market…");

      const { data, error } = await state.client.rpc("create_market", {
        p_question: question,
        p_description: description || null,
        p_closes_at: closesAt.toISOString(),
        p_outcome_labels: outcomeLabels,
      });

      setButtonLoading(submit, false);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      await refreshData({ quiet: true });
      window.location.hash = `#/market/${data}`;
      showToast("Market opened. Responsible forecasting may now begin.", "success");
    });
  }

  function renderLeaderboard() {
    const allMarkets = getAllMarkets();
    const resolvedMarketIds = new Set(
      allMarkets
        .filter((market) => market.displayStatus === "resolved")
        .map((market) => market.id)
    );
    const rows = state.profiles.map((profile) => {
      const profilePredictions = state.predictions.filter(
        (prediction) => prediction.user_id === profile.id
      );
      const committed = profilePredictions
        .filter((prediction) => {
          const market = state.markets.find((item) => item.id === prediction.market_id);
          return market?.status === "open";
        })
        .reduce((sum, prediction) => sum + prediction.amount, 0);
      const resolvedCommitted = profilePredictions
        .filter((prediction) => resolvedMarketIds.has(prediction.market_id))
        .reduce((sum, prediction) => sum + prediction.amount, 0);
      const resolvedPayouts = state.payouts
        .filter(
          (payout) =>
            payout.user_id === profile.id &&
            resolvedMarketIds.has(payout.market_id)
        )
        .reduce((sum, payout) => sum + payout.amount, 0);
      const profitLoss = resolvedPayouts - resolvedCommitted;

      return {
        ...profile,
        activity: profilePredictions.length,
        committed,
        profitLoss,
        resolvedCommitted,
        created: state.markets.filter((market) => market.creator_id === profile.id).length,
        realizedReturn:
          resolvedCommitted > 0 ? profitLoss / resolvedCommitted : null,
        totalAccountValue: profile.balance + committed,
      };
    });
    const sortKey = state.leaderboardSortKey;
    const sortDirection = state.leaderboardSortDirection;
    const compareRows = (a, b, key = sortKey, direction = sortDirection) => {
      const aValue = a[key];
      const bValue = b[key];

      // A return cannot be calculated without a resolved stake. Keep those
      // accounts below measured returns in either sort direction.
      if (aValue === null && bValue !== null) return 1;
      if (aValue !== null && bValue === null) return -1;

      let comparison;
      if (typeof aValue === "string") {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = (aValue ?? 0) - (bValue ?? 0);
      }

      if (comparison !== 0) return direction === "asc" ? comparison : -comparison;

      // Profit / loss is the official rank. Break ties with realized return,
      // then the amount of resolved participation behind that performance.
      if (key === "profitLoss") {
        if (a.realizedReturn === null && b.realizedReturn !== null) return 1;
        if (a.realizedReturn !== null && b.realizedReturn === null) return -1;

        const returnComparison = (a.realizedReturn ?? 0) - (b.realizedReturn ?? 0);
        if (returnComparison !== 0) return -returnComparison;

        const stakeComparison = a.resolvedCommitted - b.resolvedCommitted;
        if (stakeComparison !== 0) return -stakeComparison;
      }

      return a.display_name.localeCompare(b.display_name);
    };
    const sorted = [...rows].sort(compareRows);
    const performanceLeaders = [...rows].sort(
      (a, b) => compareRows(a, b, "profitLoss", "desc")
    );
    const leadingProfile = performanceLeaders[0] || null;
    const leaderNames = rows
      .filter(
        (profile) =>
          leadingProfile &&
          profile.profitLoss === leadingProfile.profitLoss &&
          profile.realizedReturn === leadingProfile.realizedReturn &&
          profile.resolvedCommitted === leadingProfile.resolvedCommitted
      )
      .map((profile) => profile.display_name)
      .sort((a, b) => a.localeCompare(b));
    const leaderDisplay = leaderNames.length > 2
      ? `${leaderNames.length}-way tie`
      : leaderNames.join(" & ") || "Nobody";
    const leadingProfitLoss = leadingProfile?.profitLoss || 0;
    const leaderPoints = `${leadingProfitLoss > 0 ? "+" : ""}${formatNumber(leadingProfitLoss)} points realized`;

    // A wager is a member's cumulative commitment to one outcome in one
    // market. Voided markets are excluded because those wagers were canceled.
    const eligibleMarketIds = new Set(
      state.markets
        .filter((market) => market.status !== "void")
        .map((market) => market.id)
    );
    const eligiblePredictions = state.predictions.filter(
      (prediction) => eligibleMarketIds.has(prediction.market_id)
    );
    const wagerPositions = new Map();

    eligiblePredictions.forEach((prediction) => {
      const key = `${prediction.user_id}:${prediction.market_id}:${prediction.outcome_id}`;
      const existing = wagerPositions.get(key) || {
        amount: 0,
        userId: prediction.user_id,
      };
      existing.amount += prediction.amount;
      wagerPositions.set(key, existing);
    });

    const largestWagerAmount = wagerPositions.size
      ? Math.max(...[...wagerPositions.values()].map((position) => position.amount))
      : 0;
    const largestWagerHolderIds = new Set(
      [...wagerPositions.values()]
        .filter((position) => position.amount === largestWagerAmount)
        .map((position) => position.userId)
    );
    const largestWagerNames = state.profiles
      .filter((profile) => largestWagerHolderIds.has(profile.id))
      .map((profile) => profile.display_name)
      .sort((a, b) => a.localeCompare(b));
    const largestWagerDisplay = largestWagerNames.length > 2
      ? `${largestWagerNames.length}-way tie`
      : largestWagerNames.join(" & ");

    const now = Date.now();
    const rollingThirtyDayCutoff = now - 30 * 24 * 60 * 60 * 1000;
    const pointsWageredLastThirtyDays = eligiblePredictions
      .filter((prediction) => {
        const placedAt = new Date(prediction.created_at).getTime();
        return placedAt >= rollingThirtyDayCutoff && placedAt <= now;
      })
      .reduce((sum, prediction) => sum + prediction.amount, 0);
    const sortableHeader = (key, label, title = "") => {
      const isActive = sortKey === key;
      const ariaSort = isActive
        ? sortDirection === "asc" ? "ascending" : "descending"
        : "none";
      const indicator = isActive ? (sortDirection === "asc" ? "↑" : "↓") : "↕";

      return `
        <th aria-sort="${ariaSort}"${title ? ` title="${escapeAttribute(title)}"` : ""}>
          <button class="table-sort-button" type="button" data-leaderboard-sort="${key}">
            <span>${label}</span>
            <span class="sort-indicator" aria-hidden="true">${indicator}</span>
          </button>
        </th>
      `;
    };

    dom.main.innerHTML = `
      <div class="page-header">
        <div>
          <p class="eyebrow">Leaderboard</p>
          <h1>Imaginary wealth. Real bragging rights.</h1>
          <p>Ranked by profit / loss on resolved markets. Select a column heading to choose your own measure.</p>
        </div>
        ${state.profile.is_admin ? '<button class="button button-primary" id="admin-points" type="button">Award points</button>' : ""}
      </div>

      <div class="portfolio-grid leaderboard-stats">
        <div class="portfolio-stat">
          <span>Current robber baron</span>
          <strong title="${escapeAttribute(leaderNames.join(", "))}">${escapeHtml(leaderDisplay)}</strong>
          <small>${leaderPoints}</small>
        </div>
        <div class="portfolio-stat">
          <span>Largest wager</span>
          <strong>${largestWagerAmount > 0 ? `${formatNumber(largestWagerAmount)} points` : "—"}</strong>
          <small${largestWagerNames.length > 2 ? ` title="${escapeAttribute(largestWagerNames.join(", "))}"` : ""}>${largestWagerAmount > 0 ? escapeHtml(largestWagerDisplay) : "no wagers yet"}</small>
        </div>
        <div class="portfolio-stat">
          <span>Points wagered</span>
          <strong>${pointsWageredLastThirtyDays > 0 ? `${formatNumber(pointsWageredLastThirtyDays)} points` : "—"}</strong>
          <small>${pointsWageredLastThirtyDays > 0 ? "last 30 days" : "no wagers yet"}</small>
        </div>
      </div>

      <section class="table-card">
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                ${sortableHeader("display_name", "Trader")}
                ${sortableHeader(
                  "totalAccountValue",
                  "Total account value",
                  "Available balance plus points currently committed."
                )}
                ${sortableHeader("balance", "Available balance")}
                ${sortableHeader("committed", "Points currently committed")}
                ${sortableHeader(
                  "profitLoss",
                  "Profit / loss",
                  "Net points gained or lost on resolved markets."
                )}
                ${sortableHeader(
                  "realizedReturn",
                  "Realized return",
                  "Profit / loss divided by points committed across resolved markets."
                )}
                ${sortableHeader("activity", "Predictions placed")}
                ${sortableHeader("created", "Markets created")}
              </tr>
            </thead>
            <tbody>
              ${sorted.map((profile, index) => {
                const profitLossClass =
                  profile.profitLoss > 0
                    ? "text-success"
                    : profile.profitLoss < 0
                      ? "text-danger"
                      : "";
                const profitLossText =
                  `${profile.profitLoss > 0 ? "+" : ""}${formatNumber(profile.profitLoss)} pts`;
                const returnText = profile.realizedReturn === null
                  ? "—"
                  : `${profile.realizedReturn > 0 ? "+" : ""}${(profile.realizedReturn * 100).toFixed(1)}%`;
                return `
                  <tr class="${profile.id === state.user.id ? "current-user-row" : ""}">
                    <td class="rank-cell">#${index + 1}</td>
                    <td>
                      <div class="name-cell">
                        <span class="avatar">${escapeHtml(initials(profile.display_name))}</span>
                        ${escapeHtml(profile.display_name)}
                        ${profile.is_admin ? '<span class="tiny-pill">Admin</span>' : ""}
                      </div>
                    </td>
                    <td class="mono"><strong>${formatNumber(profile.totalAccountValue)} pts</strong></td>
                    <td class="mono">${formatNumber(profile.balance)} pts</td>
                    <td class="mono">${formatNumber(profile.committed)} pts</td>
                    <td class="mono ${profitLossClass}">${profitLossText}</td>
                    <td class="mono ${profitLossClass}">${returnText}</td>
                    <td class="mono">${formatNumber(profile.activity)}</td>
                    <td class="mono">${formatNumber(profile.created)}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;

    document.querySelectorAll("[data-leaderboard-sort]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextKey = button.dataset.leaderboardSort;
        if (state.leaderboardSortKey === nextKey) {
          state.leaderboardSortDirection =
            state.leaderboardSortDirection === "desc" ? "asc" : "desc";
        } else {
          state.leaderboardSortKey = nextKey;
          state.leaderboardSortDirection = nextKey === "display_name" ? "asc" : "desc";
        }
        renderLeaderboard();
      });
    });
    document.querySelector("#admin-points")?.addEventListener("click", openAdminPointsModal);
  }

  function renderPortfolio() {
    const allMarkets = getAllMarkets();
    const userPredictions = state.predictions.filter((prediction) => prediction.user_id === state.user.id);
    const userPayouts = state.payouts.filter((payout) => payout.user_id === state.user.id);
    const totalCommitted = userPredictions.reduce((sum, prediction) => sum + prediction.amount, 0);
    const totalPayouts = userPayouts.reduce((sum, payout) => sum + payout.amount, 0);

    // Net points earned or lost only after a market has been resolved.
    // Open, closed-but-unresolved, and voided markets are excluded.
    const resolvedMarketIds = new Set(
      allMarkets
        .filter((market) => market.displayStatus === "resolved")
        .map((market) => market.id)
    );
    const resolvedCommitted = userPredictions
      .filter((prediction) => resolvedMarketIds.has(prediction.market_id))
      .reduce((sum, prediction) => sum + prediction.amount, 0);
    const resolvedPayouts = userPayouts
      .filter((payout) => resolvedMarketIds.has(payout.market_id))
      .reduce((sum, payout) => sum + payout.amount, 0);
    const profitLoss = resolvedPayouts - resolvedCommitted;
    const profitLossClass =
      profitLoss > 0
        ? "text-success"
        : profitLoss < 0
          ? "text-danger"
          : "";
    const profitLossText =
      `${profitLoss > 0 ? "+" : ""}${formatNumber(profitLoss)} pts`;

    const groups = new Map();
    userPredictions.forEach((prediction) => {
      const key = `${prediction.market_id}:${prediction.outcome_id}`;
      const existing = groups.get(key) || { marketId: prediction.market_id, outcomeId: prediction.outcome_id, amount: 0, latest: prediction.created_at };
      existing.amount += prediction.amount;
      if (new Date(prediction.created_at) > new Date(existing.latest)) existing.latest = prediction.created_at;
      groups.set(key, existing);
    });

    const positions = [...groups.values()]
      .map((position) => {
        const market = allMarkets.find((item) => item.id === position.marketId);
        const outcome = market?.outcomes.find((item) => item.id === position.outcomeId);
        const payout = state.payouts.find((item) => item.market_id === position.marketId && item.user_id === state.user.id);
        return { ...position, market, outcome, payout };
      })
      .filter((position) => position.market && position.outcome)
      .sort((a, b) => new Date(b.latest) - new Date(a.latest));

    dom.main.innerHTML = `
      <div class="page-header">
        <div>
          <p class="eyebrow">Your portfolio</p>
          <h1>A complete record of your confidence.</h1>
          <p>Past performance is extremely admissible in the group chat.</p>
        </div>
      </div>

      <div class="portfolio-grid">
        <div class="portfolio-stat">
          <span>Current balance</span>
          <strong>${formatNumber(state.profile.balance)} pts</strong>
        </div>
        <div class="portfolio-stat">
          <span>All-time committed</span>
          <strong>${formatNumber(totalCommitted)} pts</strong>
        </div>
        <div class="portfolio-stat">
          <span>All-time payouts</span>
          <strong>${formatNumber(totalPayouts)} pts</strong>
        </div>
        <div
          class="portfolio-stat"
          title="Net points gained or lost on resolved markets. Open and voided markets are excluded."
        >
          <span>Profit / loss</span>
          <strong class="${profitLossClass}">${profitLossText}</strong>
        </div>
      </div>

      <div class="section-heading">
        <div>
          <p class="eyebrow">Positions</p>
          <h2>Your predictions</h2>
        </div>
      </div>

      <section class="position-list">
        ${positions.length ? positions.map(renderPositionCard).join("") : `
          <div class="empty-state">
            <div class="empty-state-icon">0</div>
            <h2>No predictions yet.</h2>
            <p>Your reputation remains pristine only because it remains untested.</p>
            <a class="button button-primary" href="#/markets">Browse markets</a>
          </div>
        `}
      </section>
    `;
  }

  function renderPositionCard(position) {
    const { market, outcome, amount, payout } = position;
    const isResolved = market.displayStatus === "resolved";
    const isWinner = market.winning_outcome_id === outcome.id;
    const isVoid = market.displayStatus === "void";
    const isNoWinnerRefund =
      isResolved && payout?.kind === "no_winner_refund";

    let resultLabel = "Open";
    let valueLabel = `${formatNumber(amount)} pts committed`;
    let resultClass = "";

    if (market.displayStatus === "closed") resultLabel = "Awaiting result";
    if (isVoid) {
      resultLabel = "Voided";
      valueLabel = `${formatNumber(amount)} pts refunded`;
    }
    if (isNoWinnerRefund) {
      resultLabel = "Refunded";
      resultClass = "text-success";
      valueLabel = `${formatNumber(amount)} pts refunded`;
    }
    if (isResolved && isWinner && !isNoWinnerRefund) {
      resultLabel = "Won";
      resultClass = "text-success";
      valueLabel = `${formatNumber(payout?.amount || 0)} pts paid`;
    }
    if (isResolved && !isWinner && !isNoWinnerRefund) {
      resultLabel = "Lost";
      resultClass = "text-danger";
      valueLabel = `${formatNumber(amount)} pts committed`;
    }

    return `
      <article class="position-card">
        <div>
          <h2><a href="#/market/${market.id}">${escapeHtml(market.question)}</a></h2>
          <div class="position-meta">
            <span>Outcome: <strong>${escapeHtml(outcome.label)}</strong></span>
            <span>Current odds: <strong>${formatPercent(outcome.percent)}</strong></span>
            <span>Status: <strong class="${resultClass}">${resultLabel}</strong></span>
          </div>
        </div>
        <div class="position-value">
          <strong>${formatNumber(amount)} pts</strong>
          <span>${valueLabel}</span>
        </div>
      </article>
    `;
  }

  function renderNotFound() {
    dom.main.innerHTML = `
      <section class="empty-state">
        <div class="empty-state-icon">404</div>
        <h2>This market does not exist.</h2>
        <p>Perhaps it was only a rumor, which admittedly would make a decent market.</p>
        <a class="button button-primary" href="#/markets">Return to markets</a>
      </section>
    `;
  }

  function openPredictionModal(market, outcomeId) {
    if (market.displayStatus !== "open") return;
    const initialOutcome = market.outcomes.find((item) => item.id === outcomeId);

    openModal(`
      <div class="modal-header">
        <div>
          <p class="eyebrow">Place prediction</p>
          <h2>Choose your position</h2>
          <p>${escapeHtml(market.question)}</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <form id="prediction-form">
        <div class="modal-body">
          <div class="prediction-fields">
            <div class="form-field">
              <label for="prediction-outcome">Outcome</label>
              <select id="prediction-outcome" name="outcome" required>
                <option value=""${initialOutcome ? "" : " selected"}>Choose an outcome…</option>
                ${market.outcomes.map((item) => `
                  <option value="${item.id}"${item.id === initialOutcome?.id ? " selected" : ""}>
                    ${escapeHtml(item.label)}
                  </option>
                `).join("")}
              </select>
            </div>
            <div class="form-field">
              <label for="prediction-amount">How many points?</label>
              <input id="prediction-amount" name="amount" type="number" min="1" max="${state.profile.balance}" step="1" inputmode="numeric" placeholder="Enter points" required />
            </div>
          </div>
          <div class="quick-amounts">
            <button data-quick-amount="25" type="button">25 pts</button>
            <button data-quick-amount="100" type="button">100 pts</button>
            <button data-quick-amount="250" type="button">250 pts</button>
            <button data-quick-amount="max" type="button">All in</button>
          </div>

          <div class="trade-summary">
            <div class="trade-summary-row">
              <span>Current community odds</span>
              <strong id="current-odds">—</strong>
            </div>
            <div class="trade-summary-row">
              <span>Odds after this prediction</span>
              <strong id="odds-after">—</strong>
            </div>
            <div class="trade-summary-row">
              <span>Estimated gross payout*</span>
              <strong id="estimated-payout">—</strong>
            </div>
            <div class="trade-summary-row">
              <span>Balance after prediction</span>
              <strong id="balance-after">—</strong>
            </div>
          </div>
          <p class="trade-warning">
            *Estimate assumes no more predictions are placed. Your final payout changes as the pool changes.
            This prediction is final and cannot be withdrawn.
          </p>
        </div>
        <div class="modal-footer">
          <button class="button button-secondary" data-modal-close type="button">Never mind</button>
          <button class="button button-primary" type="submit" disabled>Commit points</button>
        </div>
      </form>
    `);

    const outcomeSelect = document.querySelector("#prediction-outcome");
    const input = document.querySelector("#prediction-amount");
    const submit = document.querySelector("#prediction-form button[type='submit']");

    const getSelectedOutcome = () => {
      const selectedId = Number(outcomeSelect.value);
      return market.outcomes.find((item) => item.id === selectedId);
    };

    const updateEstimate = () => {
      const outcome = getSelectedOutcome();
      const parsedAmount = parseWholeNumber(input.value);
      const amountIsValid =
        parsedAmount !== null &&
        parsedAmount >= 1 &&
        parsedAmount <= state.profile.balance;

      document.querySelector("#current-odds").textContent = outcome
        ? formatPercent(outcome.percent)
        : "—";

      if (!outcome || !amountIsValid) {
        document.querySelector("#odds-after").textContent = "—";
        document.querySelector("#estimated-payout").textContent = "—";
        document.querySelector("#balance-after").textContent = "—";
        submit.disabled = true;
        return;
      }

      const amount = parsedAmount;
      const totalAfter = market.actualTotal + amount;
      const outcomeActualAfter = outcome.actualPoints + amount;
      const displayTotalAfter = market.outcomes.reduce((sum, item) => sum + item.seed_points + item.actualPoints, 0) + amount;
      const displayOutcomeAfter = outcome.seed_points + outcome.actualPoints + amount;
      const oddsAfter = displayTotalAfter > 0 ? (displayOutcomeAfter / displayTotalAfter) * 100 : 0;
      const estimatedPayout = amount > 0 && outcomeActualAfter > 0
        ? Math.floor((amount / outcomeActualAfter) * totalAfter)
        : 0;

      document.querySelector("#odds-after").textContent = formatPercent(oddsAfter);
      document.querySelector("#estimated-payout").textContent = `${formatNumber(estimatedPayout)} pts`;
      document.querySelector("#balance-after").textContent = `${formatNumber(state.profile.balance - amount)} pts`;
      submit.disabled = false;
    };

    outcomeSelect.addEventListener("change", updateEstimate);
    input.addEventListener("input", updateEstimate);
    document.querySelectorAll("[data-quick-amount]").forEach((button) => {
      button.addEventListener("click", () => {
        input.value = button.dataset.quickAmount === "max"
          ? state.profile.balance
          : Math.min(Number(button.dataset.quickAmount), state.profile.balance);
        updateEstimate();
      });
    });

    updateEstimate();
    if (initialOutcome) {
      input.focus();
    } else {
      outcomeSelect.focus();
    }

    document.querySelector("#prediction-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const outcome = getSelectedOutcome();
      const amount = parseWholeNumber(input.value);
      if (!outcome) {
        showToast("Choose an outcome before committing points.", "error");
        outcomeSelect.focus();
        return;
      }
      if (amount === null || amount < 1 || amount > state.profile.balance) {
        showToast("Enter a whole-number amount within your available balance.", "error");
        input.focus();
        return;
      }

      setButtonLoading(submit, true, "Committing…");
      const { error } = await state.client.rpc("place_prediction", {
        p_market_id: market.id,
        p_outcome_id: outcome.id,
        p_amount: amount,
      });
      setButtonLoading(submit, false);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      closeModal();
      await refreshData({ quiet: true });
      showToast(`${formatNumber(amount)} points committed to “${outcome.label}.”`, "success");
    });
  }

  function openResolveModal(market) {
    openModal(`
      <div class="modal-header">
        <div>
          <p class="eyebrow">Resolve market</p>
          <h2>What actually happened?</h2>
          <p>${escapeHtml(market.question)}</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <form id="resolve-form">
        <div class="modal-body">
          <div class="resolve-options">
            ${market.outcomes.map((outcome, index) => `
              <label class="resolve-option">
                <input type="radio" name="winner" value="${outcome.id}" ${index === 0 ? "checked" : ""} />
                <span>${escapeHtml(outcome.label)}</span>
              </label>
            `).join("")}
          </div>
          <p class="trade-warning">
            This closes the market and distributes the full pool proportionally among winning predictors.
            If nobody selected the winning outcome, all predictions are refunded.
          </p>
        </div>
        <div class="modal-footer">
          <button class="button button-secondary" data-modal-close type="button">Cancel</button>
          <button class="button button-primary" type="submit">Resolve and distribute</button>
        </div>
      </form>
    `);

    document.querySelector("#resolve-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const winner = Number(new FormData(event.currentTarget).get("winner"));
      const button = event.currentTarget.querySelector("button[type='submit']");
      const winningOutcome = market.outcomes.find((outcome) => outcome.id === winner);

      setButtonLoading(button, true, "Distributing points…");
      const { data, error } = await state.client.rpc("resolve_market", {
        p_market_id: market.id,
        p_winning_outcome_id: winner,
      });
      setButtonLoading(button, false);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      closeModal();
      await refreshData({ quiet: true });
      showToast(
        data?.refunded
          ? `“${winningOutcome?.label}” won, but nobody backed it. Everyone was refunded.`
          : `Market resolved: “${winningOutcome?.label}.” The fake fortunes have been distributed.`,
        "success",
      );
    });
  }

  function openVoidModal(market) {
    openModal(`
      <div class="modal-header">
        <div>
          <p class="eyebrow">Void market</p>
          <h2>Declare the question unresolvable?</h2>
          <p>${escapeHtml(market.question)}</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <p style="margin-top:0">
          Every committed point will be returned to its owner, and this market will be permanently marked as void.
        </p>
        <p class="trade-warning">Appropriate for cancellations, ambiguous outcomes, acts of weather, or someone insisting the rules were never clear.</p>
      </div>
      <div class="modal-footer">
        <button class="button button-secondary" data-modal-close type="button">Keep market</button>
        <button class="button button-danger" id="confirm-void" type="button">Void and refund everyone</button>
      </div>
    `);

    document.querySelector("#confirm-void").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      setButtonLoading(button, true, "Refunding…");
      const { error } = await state.client.rpc("void_market", { p_market_id: market.id });
      setButtonLoading(button, false);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      closeModal();
      await refreshData({ quiet: true });
      showToast("Market voided. All imaginary capital has returned home.", "success");
    });
  }

  function openHowItWorksModal() {
    openModal(`
      <div class="modal-header">
        <div>
          <p class="eyebrow">How it works</p>
          <h2>A market, minus capitalism.</h2>
          <p>The rules are simple enough to explain before everyone loses interest.</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <div class="summary-stack">
          <div class="card" style="padding:16px">
            <strong>1. Everyone starts with 1,000 points.</strong>
            <p class="muted" style="font-size:.78rem;margin:6px 0 0">Active traders receive another 100 points on the first of each month after signing in within the previous 90 days. Points cannot be purchased, sold, or redeemed.</p>
          </div>
          <div class="card" style="padding:16px">
            <strong>2. Put points on the outcome you expect.</strong>
            <p class="muted" style="font-size:.78rem;margin:6px 0 0">More points means more conviction. Predictions are final, though you may add more later.</p>
          </div>
          <div class="card" style="padding:16px">
            <strong>3. Community odds follow the point totals.</strong>
            <p class="muted" style="font-size:.78rem;margin:6px 0 0">Each outcome gets 25 invisible seed points to keep early odds from becoming ridiculous.</p>
          </div>
          <div class="card" style="padding:16px">
            <strong>4. Winners split the full real-point pool.</strong>
            <p class="muted" style="font-size:.78rem;margin:6px 0 0">Your share of the winning side determines your share of the total payout.</p>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="button button-primary" data-modal-close type="button">I understand fictional finance</button>
      </div>
    `);
  }

  function openAccountModal() {
    openModal(`
      <div class="modal-header">
        <div>
          <p class="eyebrow">Your account</p>
          <h2>${escapeHtml(state.profile.display_name)}</h2>
          <p>${escapeHtml(state.user?.email || "Email account")} · available across devices</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <form id="account-form">
        <div class="modal-body">
          <div class="portfolio-grid" style="grid-template-columns:repeat(2,1fr);margin-bottom:20px">
            <div class="portfolio-stat">
              <span>Balance</span>
              <strong>${formatNumber(state.profile.balance)}</strong>
            </div>
            <div class="portfolio-stat">
              <span>Account type</span>
              <strong>${state.profile.is_admin ? "Admin" : "Trader"}</strong>
            </div>
          </div>
          <div class="form-field">
            <label for="account-name">Display name</label>
            <input id="account-name" name="displayName" minlength="2" maxlength="32" value="${escapeAttribute(state.profile.display_name)}" required />
          </div>
          <p class="trade-warning">
            Your email and password let you access the same balance, predictions, and markets from any device.
            To change a forgotten password, sign out and use the password-reset link on the login screen.
          </p>
        </div>
        <div class="modal-footer">
          ${state.profile.is_admin ? '<button class="button button-secondary" id="account-admin-points" type="button">Award points</button>' : ""}
          <button class="button button-ghost" id="account-sign-out" type="button">Sign out</button>
          <button class="button button-primary" type="submit">Save name</button>
        </div>
      </form>
    `);

    document.querySelector("#account-admin-points")?.addEventListener("click", () => {
      closeModal();
      openAdminPointsModal();
    });

    document.querySelector("#account-sign-out").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      setButtonLoading(button, true, "Signing out…");
      const { error } = await state.client.auth.signOut();
      setButtonLoading(button, false);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      closeModal();
      resetAppState();
      showAuth("login");
      showToast("Signed out. Your points are still imaginary, but safely stored.", "success");
    });

    document.querySelector("#account-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = String(new FormData(event.currentTarget).get("displayName") || "").trim();
      const button = event.currentTarget.querySelector("button[type='submit']");

      setButtonLoading(button, true, "Saving…");
      const { error } = await state.client.rpc("update_display_name", { p_display_name: name });
      setButtonLoading(button, false);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      closeModal();
      await refreshData({ quiet: true });
      showToast("Display name updated.", "success");
    });
  }

  function openAdminPointsModal() {
    if (!state.profile.is_admin) return;

    const sortedProfiles = [...state.profiles].sort((a, b) => a.display_name.localeCompare(b.display_name));
    openModal(`
      <div class="modal-header">
        <div>
          <p class="eyebrow">Administrator</p>
          <h2>Award emergency liquidity.</h2>
          <p>Positive or negative adjustments are allowed. Do not become the Federal Reserve of grudges.</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <div class="admin-list">
          ${sortedProfiles.map((profile) => `
            <div class="admin-user-row">
              <div>
                <strong>${escapeHtml(profile.display_name)}</strong>
                <div class="muted mono" style="font-size:.66rem">${formatNumber(profile.balance)} pts</div>
              </div>
              <input type="number" min="-1000000" max="1000000" step="1" value="250" aria-label="Point adjustment for ${escapeAttribute(profile.display_name)}" data-admin-amount="${profile.id}" />
              <button class="button button-secondary button-small" data-award-user="${profile.id}" type="button">Apply</button>
            </div>
          `).join("")}
        </div>
      </div>
    `);

    document.querySelectorAll("[data-award-user]").forEach((button) => {
      button.addEventListener("click", async () => {
        const userId = button.dataset.awardUser;
        const input = document.querySelector(`[data-admin-amount="${userId}"]`);
        const amount = parseWholeNumber(input.value);
        const profile = state.profiles.find((item) => item.id === userId);

        if (amount === null || amount === 0) {
          showToast("Enter a non-zero whole-number adjustment.", "error");
          return;
        }

        setButtonLoading(button, true, "Applying…");
        const { error } = await state.client.rpc("award_points", {
          p_user_id: userId,
          p_amount: amount,
          p_note: "Manual admin adjustment",
        });
        setButtonLoading(button, false);

        if (error) {
          showToast(error.message, "error");
          return;
        }

        closeModal();
        await refreshData({ quiet: true });
        showToast(`${amount > 0 ? "+" : ""}${formatNumber(amount)} points applied to ${profile?.display_name || "the account"}.`, "success");
      });
    });
  }

  function openModal(content) {
    dom.modalRoot.innerHTML = `
      <div class="modal-backdrop" role="presentation">
        <section class="modal" role="dialog" aria-modal="true">
          ${content}
        </section>
      </div>
    `;
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    dom.modalRoot.innerHTML = "";
    document.body.classList.remove("modal-open");
  }

  function statusPill(status) {
    return `<span class="status-pill status-${status}">${escapeHtml(statusLabel(status))}</span>`;
  }

  function statusLabel(status) {
    const labels = {
      open: "Trading open",
      closed: "Trading closed",
      resolved: "Resolved",
      void: "Voided",
    };
    return labels[status] || status;
  }

  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    dom.toastRoot.appendChild(toast);
    window.setTimeout(() => toast.remove(), 4200);
  }

  function setButtonLoading(button, isLoading, loadingText = "Working…") {
    if (!button) return;
    if (isLoading) {
      button.dataset.originalText = button.textContent;
      button.textContent = loadingText;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
      button.disabled = false;
    }
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value) || 0);
  }

  function formatCompact(value) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(Number(value) || 0);
  }

  function formatPercent(value) {
    const number = Number(value) || 0;
    return `${number < 10 && number > 0 ? number.toFixed(1) : Math.round(number)}%`;
  }

  function formatDateTime(value) {
    const date = new Date(value);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function formatRelativeDate(value) {
    const date = new Date(value);
    const diffMs = date.getTime() - Date.now();
    const abs = Math.abs(diffMs);
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    if (abs < 60 * 1000) return "just now";
    if (abs < 60 * 60 * 1000) return rtf.format(Math.round(diffMs / (60 * 1000)), "minute");
    if (abs < 24 * 60 * 60 * 1000) return rtf.format(Math.round(diffMs / (60 * 60 * 1000)), "hour");
    if (abs < 7 * 24 * 60 * 60 * 1000) return rtf.format(Math.round(diffMs / (24 * 60 * 60 * 1000)), "day");
    return formatDateTime(value);
  }

  function toLocalDateTimeInput(date) {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
  }

  function initials(name) {
    return String(name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";
  }

  function pluralize(count, singular, plural = `${singular}s`) {
    return Number(count) === 1 ? singular : plural;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function parseWholeNumber(value) {
    const number = Number(value);
    return Number.isInteger(number) ? number : null;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }

  init();
})();
