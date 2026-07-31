/* global supabase */

(() => {
  "use strict";

  const config = window.FRIEND_EXCHANGE_CONFIG || {};
  const PROFILE_ICON_OPTIONS = Object.freeze([
    { name: "crown", label: "Crown" },
    { name: "bolt", label: "Lightning bolt" },
    { name: "rocket", label: "Rocket" },
    { name: "sack-dollar", label: "Money bag" },
    { name: "baseball", label: "Baseball" },
    { name: "football", label: "Football" },
    { name: "flag-checkered", label: "Checkered flag" },
    { name: "car-side", label: "Car" },
    { name: "motorcycle", label: "Motorcycle" },
    { name: "truck-monster", label: "Monster truck" },
    { name: "jet-fighter", label: "Jet fighter" },
    { name: "guitar", label: "Guitar" },
    { name: "music", label: "Music" },
    { name: "palette", label: "Artist palette" },
    { name: "masks-theater", label: "Theater masks" },
    { name: "burger", label: "Burger" },
    { name: "pizza-slice", label: "Pizza" },
    { name: "ice-cream", label: "Ice cream" },
    { name: "beer-mug-empty", label: "Beer mug" },
    { name: "wine-glass", label: "Wine glass" },
    { name: "face-grin-beam", label: "Beaming face" },
    { name: "face-grin-hearts", label: "Heart eyes" },
    { name: "face-grin-stars", label: "Star eyes" },
    { name: "face-laugh-squint", label: "Laughing face" },
    { name: "face-grin-tongue-wink", label: "Winking face" },
    { name: "hand-peace", label: "Peace hand" },
    { name: "peace", label: "Peace sign" },
    { name: "paw", label: "Paw" },
    { name: "tree", label: "Tree" },
    { name: "dragon", label: "Dragon" },
    { name: "ghost", label: "Ghost" },
    { name: "robot", label: "Robot" },
    { name: "skull", label: "Skull" },
    { name: "poo", label: "Poo" },
  ]);
  const PROFILE_ICON_NAMES = new Set(PROFILE_ICON_OPTIONS.map((icon) => icon.name));
  const ODDS_HISTORY_COLORS = Object.freeze([
    "#101b18",
    "#327ca5",
    "#c45518",
    "#6c5ab4",
    "#347a16",
    "#bd2e24",
    "#137b73",
    "#aa4376",
    "#9a6a00",
    "#596d80",
  ]);
  const dom = {
    app: document.querySelector("#app"),
    main: document.querySelector("#main-content"),
    setup: document.querySelector("#setup-screen"),
    auth: document.querySelector("#auth-screen"),
    authTabs: document.querySelector(".auth-tabs"),
    authModeButtons: document.querySelectorAll("[data-auth-mode]"),
    loginForm: document.querySelector("#login-form"),
    signupForm: document.querySelector("#signup-form"),
    signupConfirmation: document.querySelector("#signup-confirmation"),
    signupConfirmationEmail: document.querySelector("#signup-confirmation-email"),
    confirmationBackToLogin: document.querySelector("#confirmation-back-to-login"),
    resetRequestForm: document.querySelector("#reset-request-form"),
    passwordReset: document.querySelector("#password-reset-screen"),
    passwordResetForm: document.querySelector("#password-reset-form"),
    forgotPasswordButton: document.querySelector("#forgot-password-button"),
    backToLoginButton: document.querySelector("#back-to-login-button"),
    modalRoot: document.querySelector("#modal-root"),
    toastRoot: document.querySelector("#toast-root"),
    headerBalance: document.querySelector("#header-balance"),
    balanceButton: document.querySelector("#balance-button"),
    adminNavLink: document.querySelector("#admin-nav-link"),
    adminMobileNavLink: document.querySelector("#admin-mobile-nav-link"),
    mobileNav: document.querySelector(".mobile-nav"),
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
    portfolioFilter: "all",
    portfolioSortKey: "default",
    portfolioSortDirection: "desc",
    leaderboardSortKey: "profitLoss",
    leaderboardSortDirection: "desc",
    oddsHistoryMarketId: null,
    oddsHistoryOutcomeId: null,
    lastRenderedMarketOdds: new Map(),
    loading: false,
    realtimeChannel: null,
    realtimeTimer: null,
    allowanceNoticeChannel: null,
    allowanceNoticeSuppressedThrough: null,
    allowanceNoticeChecking: false,
    allowanceNoticeUnavailable: false,
    allowanceNoticeOpen: false,
    allowanceNoticeCurrent: null,
    pendingAllowanceNotice: null,
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
    dom.confirmationBackToLogin.addEventListener("click", () => setAuthMode("login"));
    window.addEventListener("hashchange", renderRoute);
    window.addEventListener("resize", updateScrollableTableFades);

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
    dom.signupConfirmation.classList.add("hidden");
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
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });
    setButtonLoading(button, false);

    if (error) {
      showToast(getSignupErrorMessage(error), "error");
      return;
    }

    if (!data.session) {
      showSignupConfirmation(email);
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

  function getAuthRedirectUrl() {
    return `${window.location.origin}${window.location.pathname}`;
  }

  function getSignupErrorMessage(error) {
    const message = String(error?.message || "");
    const normalized = message.toLowerCase();

    if (
      normalized.includes("invitation list") ||
      normalized.includes("not approved") ||
      normalized.includes("not invited")
    ) {
      return "That email address has not been approved for The Friend Exchange.";
    }

    return message || "The account could not be created.";
  }

  function showSignupConfirmation(email) {
    dom.authTabs.classList.add("hidden");
    dom.loginForm.classList.add("hidden");
    dom.signupForm.classList.add("hidden");
    dom.resetRequestForm.classList.add("hidden");
    dom.signupConfirmation.classList.remove("hidden");
    dom.signupConfirmationEmail.textContent = email;
    dom.confirmationBackToLogin.focus();
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
    state.allowanceNoticeChannel?.close();
    state.realtimeChannel = null;
    state.allowanceNoticeChannel = null;
    state.allowanceNoticeSuppressedThrough = null;
    state.allowanceNoticeChecking = false;
    state.allowanceNoticeUnavailable = false;
    state.allowanceNoticeOpen = false;
    state.allowanceNoticeCurrent = null;
    state.pendingAllowanceNotice = null;
    state.user = null;
    state.profile = null;
    state.profiles = [];
    state.markets = [];
    state.outcomes = [];
    state.predictions = [];
    state.payouts = [];
    state.marketFilter = "active";
    state.portfolioFilter = "all";
    state.portfolioSortKey = "default";
    state.portfolioSortDirection = "desc";
    state.leaderboardSortKey = "profitLoss";
    state.leaderboardSortDirection = "desc";
    state.oddsHistoryMarketId = null;
    state.oddsHistoryOutcomeId = null;
    state.lastRenderedMarketOdds = new Map();
    state.loading = false;
    closeModal({ acknowledgeAllowance: false });
  }

  async function enterApp() {
    dom.setup.classList.add("hidden");
    dom.auth.classList.add("hidden");
    dom.passwordReset.classList.add("hidden");
    dom.app.classList.remove("hidden");

    if (!window.location.hash) {
      window.location.hash = "#/markets";
    }

    setupAllowanceNoticeChannel();
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
        state.client.from("profiles").select("id, display_name, profile_icon, balance, is_admin, created_at"),
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
    void checkPendingAllowanceNotice();
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
    const isAdmin = Boolean(state.profile?.is_admin);
    dom.adminNavLink.classList.toggle("hidden", !isAdmin);
    dom.adminMobileNavLink.classList.toggle("hidden", !isAdmin);
    dom.mobileNav.classList.toggle("admin-visible", isAdmin);
  }

  function setupAllowanceNoticeChannel() {
    state.allowanceNoticeChannel?.close();
    state.allowanceNoticeChannel = null;

    if (typeof window.BroadcastChannel !== "function") return;

    const channel = new window.BroadcastChannel("friend-exchange-allowance-notices");
    channel.addEventListener("message", (event) => {
      const message = event.data || {};
      if (message.userId !== state.user?.id || !message.throughPeriod) return;

      if (message.type === "shown") {
        suppressAllowanceNoticeThrough(message.throughPeriod);
        if (!state.allowanceNoticeOpen) state.pendingAllowanceNotice = null;
        return;
      }

      if (message.type === "acknowledged") {
        suppressAllowanceNoticeThrough(message.throughPeriod);
        state.pendingAllowanceNotice = null;
        if (state.allowanceNoticeOpen) {
          closeModal({ acknowledgeAllowance: false });
        }
      }
    });
    state.allowanceNoticeChannel = channel;
  }

  function broadcastAllowanceNotice(type, throughPeriod) {
    state.allowanceNoticeChannel?.postMessage({
      type,
      throughPeriod,
      userId: state.user?.id,
    });
  }

  function isAllowanceNoticeSuppressed(throughPeriod) {
    return Boolean(
      state.allowanceNoticeSuppressedThrough &&
      state.allowanceNoticeSuppressedThrough >= throughPeriod
    );
  }

  function suppressAllowanceNoticeThrough(throughPeriod) {
    if (
      !state.allowanceNoticeSuppressedThrough ||
      throughPeriod > state.allowanceNoticeSuppressedThrough
    ) {
      state.allowanceNoticeSuppressedThrough = throughPeriod;
    }
  }

  async function checkPendingAllowanceNotice() {
    if (
      !state.client ||
      !state.user ||
      !state.profile ||
      state.allowanceNoticeChecking ||
      state.allowanceNoticeUnavailable
    ) {
      return;
    }

    state.allowanceNoticeChecking = true;
    const { data, error } = await state.client.rpc("get_pending_allowance_notice");
    state.allowanceNoticeChecking = false;

    if (error) {
      const message = String(error.message || "").toLowerCase();
      if (error.code === "PGRST202" || message.includes("get_pending_allowance_notice")) {
        state.allowanceNoticeUnavailable = true;
      }
      console.warn("Could not check monthly allowance notifications.", error);
      return;
    }

    if (!data?.latest_period) {
      state.pendingAllowanceNotice = null;
      if (state.allowanceNoticeOpen) {
        closeModal({ acknowledgeAllowance: false });
      }
      return;
    }

    if (isAllowanceNoticeSuppressed(data.latest_period)) return;

    state.pendingAllowanceNotice = {
      allowanceCount: Number(data.allowance_count) || 0,
      pointsGranted: Number(data.points_granted) || 0,
      latestPeriod: String(data.latest_period),
      availableBalance: Number(data.available_balance) || 0,
    };
    showPendingAllowanceNotice();
  }

  function showPendingAllowanceNotice() {
    const notice = state.pendingAllowanceNotice;
    if (!notice || state.allowanceNoticeOpen || dom.modalRoot.firstElementChild) return;
    if (isAllowanceNoticeSuppressed(notice.latestPeriod)) {
      state.pendingAllowanceNotice = null;
      return;
    }

    state.pendingAllowanceNotice = null;
    state.allowanceNoticeOpen = true;
    state.allowanceNoticeCurrent = notice;
    openModal(renderAllowanceNoticeContent(notice), "allowance-notice-modal");
    broadcastAllowanceNotice("shown", notice.latestPeriod);
    document.querySelector("#allowance-notice-dismiss")?.focus();
  }

  function renderAllowanceNoticeContent(notice) {
    const allowanceCount = Number(notice.allowanceCount) || 0;
    const pointsGranted = Number(notice.pointsGranted) || 0;
    const availableBalance = Number(notice.availableBalance) || 0;
    const body = allowanceCount > 1
      ? `While you were away, the Exchange issued ${formatNumber(pointsGranted)} points in monthly allowances. Your available balance is now ${formatNumber(availableBalance)} points.`
      : `Your continued market participation has earned you a ${formatNumber(pointsGranted)}-point monthly allowance. Your available balance is now ${formatNumber(availableBalance)} points.`;

    return `
      <div class="modal-header">
        <div>
          <p class="eyebrow">Monthly allowance</p>
          <h2>Wake up, it’s the first of the month!</h2>
          <p>${body}</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <div class="modal-footer">
        <button class="button button-primary" id="allowance-notice-dismiss" data-modal-close type="button">Return to reckless speculation</button>
      </div>
    `;
  }

  async function acknowledgeAllowanceNotice(notice) {
    if (!notice?.latestPeriod || !state.client) return;

    const { error } = await state.client.rpc("acknowledge_monthly_allowances", {
      p_through_period: notice.latestPeriod,
    });

    if (error) {
      console.warn("Could not acknowledge the monthly allowance notification.", error);
      return;
    }

    broadcastAllowanceNotice("acknowledged", notice.latestPeriod);
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
      case "admin":
        if (state.profile.is_admin) {
          renderAdmin();
        } else {
          renderNotFound();
        }
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

  function getTimestamp(value, fallback = null) {
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : fallback;
  }

  function sortMarketPredictions(predictions) {
    return [...predictions].sort((a, b) => {
      const timeDifference =
        getTimestamp(a.created_at, 0) - getTimestamp(b.created_at, 0);
      if (timeDifference !== 0) return timeDifference;
      return Number(a.id || 0) - Number(b.id || 0);
    });
  }

  function calculateOddsSnapshot(outcomes, actualPointsByOutcome) {
    const displayTotal = outcomes.reduce(
      (sum, outcome) =>
        sum +
        Number(outcome.seed_points || 0) +
        Number(actualPointsByOutcome.get(outcome.id) || 0),
      0,
    );
    const fallbackPercent = 100 / Math.max(outcomes.length, 1);

    return new Map(
      outcomes.map((outcome) => {
        const displayPoints =
          Number(outcome.seed_points || 0) +
          Number(actualPointsByOutcome.get(outcome.id) || 0);
        return [
          outcome.id,
          displayTotal > 0 ? (displayPoints / displayTotal) * 100 : fallbackPercent,
        ];
      }),
    );
  }

  function getMarketOddsStopTimestamp(market, startTimestamp, lastPredictionTimestamp, now) {
    const closesAt = getTimestamp(market.closes_at);
    const resolvedAt = getTimestamp(market.resolved_at);
    let stopTimestamp;

    if (market.status === "open") {
      stopTimestamp = Number.isFinite(closesAt) ? Math.min(now, closesAt) : now;
    } else {
      const stopCandidates = [closesAt, resolvedAt].filter(Number.isFinite);
      stopTimestamp = stopCandidates.length
        ? Math.min(...stopCandidates)
        : lastPredictionTimestamp || now;
    }

    return Math.max(
      startTimestamp,
      lastPredictionTimestamp || startTimestamp,
      stopTimestamp,
    );
  }

  function buildMarketOddsTimeline(market, now = Date.now()) {
    const predictions = sortMarketPredictions(market.predictions || []);
    const firstPredictionTimestamp = predictions.length
      ? getTimestamp(predictions[0].created_at, now)
      : now;
    const startTimestamp = getTimestamp(market.created_at, firstPredictionTimestamp);
    const lastPredictionTimestamp = predictions.length
      ? getTimestamp(predictions[predictions.length - 1].created_at, startTimestamp)
      : null;
    const endTimestamp = getMarketOddsStopTimestamp(
      market,
      startTimestamp,
      lastPredictionTimestamp,
      now,
    );
    const actualPointsByOutcome = new Map(
      market.outcomes.map((outcome) => [outcome.id, 0]),
    );
    const points = [{
      timestamp: startTimestamp,
      odds: calculateOddsSnapshot(market.outcomes, actualPointsByOutcome),
      eventIndex: null,
    }];
    const events = [];

    predictions.forEach((prediction) => {
      const timestamp = Math.max(
        startTimestamp,
        getTimestamp(prediction.created_at, startTimestamp),
      );
      const beforeOdds = calculateOddsSnapshot(
        market.outcomes,
        actualPointsByOutcome,
      );
      actualPointsByOutcome.set(
        prediction.outcome_id,
        Number(actualPointsByOutcome.get(prediction.outcome_id) || 0) +
          Number(prediction.amount || 0),
      );
      const afterOdds = calculateOddsSnapshot(
        market.outcomes,
        actualPointsByOutcome,
      );
      const event = {
        index: events.length,
        prediction,
        timestamp,
        outcomeId: prediction.outcome_id,
        beforeOdds,
        afterOdds,
        fromPercent: Number(beforeOdds.get(prediction.outcome_id) || 0),
        toPercent: Number(afterOdds.get(prediction.outcome_id) || 0),
      };
      event.delta = event.toPercent - event.fromPercent;
      events.push(event);
      points.push({
        timestamp,
        odds: afterOdds,
        eventIndex: event.index,
      });
    });

    const latestPoint = points[points.length - 1];
    if (endTimestamp > latestPoint.timestamp) {
      points.push({
        timestamp: endTimestamp,
        odds: latestPoint.odds,
        eventIndex: null,
      });
    }

    return {
      startTimestamp,
      endTimestamp,
      points,
      events,
    };
  }

  function getOddsMovementDirection(currentPercent, referencePercent) {
    if (formatPercent(currentPercent) === formatPercent(referencePercent)) {
      return "flat";
    }
    return currentPercent > referencePercent ? "up" : "down";
  }

  function getMarketMovementByOutcome(market, timeline) {
    const latestEvent = timeline.events[timeline.events.length - 1] || null;
    const currentOdds =
      latestEvent?.afterOdds ||
      timeline.points[timeline.points.length - 1]?.odds ||
      new Map();

    return new Map(
      market.outcomes.map((outcome) => {
        const currentPercent = Number(currentOdds.get(outcome.id) || 0);
        const referencePercent = latestEvent
          ? Number(latestEvent.beforeOdds.get(outcome.id) || 0)
          : currentPercent;
        return [
          outcome.id,
          {
            currentPercent,
            referencePercent,
            delta: currentPercent - referencePercent,
            hasTrade: Boolean(latestEvent),
            direction: getOddsMovementDirection(
              currentPercent,
              referencePercent,
            ),
          },
        ];
      }),
    );
  }

  function formatMovementMagnitude(value) {
    const magnitude = Math.abs(Number(value) || 0);
    if (magnitude < 0.05) return "0";
    const rounded = magnitude < 10
      ? Number(magnitude.toFixed(1))
      : Math.round(magnitude);
    return String(rounded);
  }

  function getHistoryColor(market, outcomeId) {
    const index = Math.max(
      market.outcomes.findIndex((outcome) => outcome.id === outcomeId),
      0,
    );
    return ODDS_HISTORY_COLORS[index % ODDS_HISTORY_COLORS.length];
  }

  function buildRoundedStepPath(
    chartPoints,
    outcomeId,
    xForTradeNumber,
    yForPercent,
  ) {
    const firstPoint = chartPoints[0];
    if (!firstPoint) return "";

    const formatCoordinate = (value) => Number(value).toFixed(2);
    let previousX = xForTradeNumber(0);
    let previousY = yForPercent(
      Number(firstPoint.odds.get(outcomeId) || 0),
    );
    const commands = [
      `M ${formatCoordinate(previousX)} ${formatCoordinate(previousY)}`,
    ];

    chartPoints.slice(1).forEach((point) => {
      const x = xForTradeNumber(point.eventIndex + 1);
      const y = yForPercent(Number(point.odds.get(outcomeId) || 0));
      const deltaY = y - previousY;

      if (Math.abs(deltaY) < 0.01) {
        commands.push(`H ${formatCoordinate(x)}`);
      } else {
        const radius = Math.min(
          8,
          Math.abs(deltaY) / 2,
          Math.max(x - previousX, 0) / 4,
        );

        if (radius < 0.1) {
          commands.push(
            `H ${formatCoordinate(x)}`,
            `V ${formatCoordinate(y)}`,
          );
        } else {
          const direction = Math.sign(deltaY);
          const verticalX = x - radius;
          commands.push(
            `H ${formatCoordinate(x - radius * 2)}`,
            `Q ${formatCoordinate(verticalX)} ${formatCoordinate(previousY)} ${formatCoordinate(verticalX)} ${formatCoordinate(previousY + direction * radius)}`,
          );
          if (Math.abs(deltaY) > radius * 2 + 0.01) {
            commands.push(
              `V ${formatCoordinate(y - direction * radius)}`,
            );
          }
          commands.push(
            `Q ${formatCoordinate(verticalX)} ${formatCoordinate(y)} ${formatCoordinate(x)} ${formatCoordinate(y)}`,
          );
        }
      }

      previousX = x;
      previousY = y;
    });

    return commands.join(" ");
  }

  function getHistoryEventCopy(event, market) {
    const prediction = event.prediction;
    const profile = state.profiles.find(
      (item) => item.id === prediction.user_id,
    );
    const outcome = market.outcomes.find(
      (item) => item.id === event.outcomeId,
    );
    const name = profile?.display_name || "Unknown trader";
    const outcomeLabel = outcome?.label || "an outcome";
    const fromText = formatPercent(event.fromPercent);
    const toText = formatPercent(event.toPercent);
    const heldSteady = fromText === toText;

    return {
      name,
      outcomeLabel,
      impactText: heldSteady
        ? `Community odds held at ${toText}`
        : `Community odds ${fromText} → ${toText}`,
      ariaLabel: heldSteady
        ? `${name} committed ${formatNumber(prediction.amount)} points to ${outcomeLabel}. Community odds held at ${toText}.`
        : `${name} committed ${formatNumber(prediction.amount)} points to ${outcomeLabel}. Community odds moved from ${fromText} to ${toText}.`,
    };
  }

  function renderHistoryEventDetail(event, market) {
    if (!event) {
      return `
        <p class="odds-history-empty">
          No predictions in this window. The market has maintained its opening position.
        </p>
      `;
    }

    const copy = getHistoryEventCopy(event, market);
    return `
      <div class="odds-history-event-copy">
        <p>
          <strong>${escapeHtml(copy.name)}</strong> committed
          <strong>${formatNumber(event.prediction.amount)} pts</strong> to
          <strong>${escapeHtml(copy.outcomeLabel)}</strong>
        </p>
        <span class="odds-history-impact">${escapeHtml(copy.impactText)}</span>
      </div>
      <time datetime="${escapeAttribute(event.prediction.created_at)}">${formatRelativeDate(event.prediction.created_at)}</time>
    `;
  }

  function renderOddsHistoryChart(market, timeline) {
    const selectedOutcome =
      market.outcomes.find(
        (outcome) => outcome.id === Number(state.oddsHistoryOutcomeId),
      ) ||
      [...market.outcomes].sort((a, b) => b.percent - a.percent)[0];
    const chartOutcomes =
      market.outcomes.length > 4 && selectedOutcome
        ? [selectedOutcome]
        : market.outcomes;
    const chartPoints = [
      timeline.points[0],
      ...timeline.points.filter((point) => point.eventIndex !== null),
    ];
    const tradeCount = timeline.events.length;
    const isScrollable = tradeCount > 8;
    const viewWidth = isScrollable
      ? Math.max(760, 64 + tradeCount * 72)
      : 760;
    const viewHeight = 244;
    const plotLeft = 72;
    const plotRight = 24;
    const plotTop = 24;
    const plotBottom = 38;
    const plotWidth = viewWidth - plotLeft - plotRight;
    const plotHeight = viewHeight - plotTop - plotBottom;
    const xForTradeNumber = (tradeNumber) =>
      plotLeft + (tradeNumber / Math.max(tradeCount, 1)) * plotWidth;
    const yForPercent = (percent) =>
      plotTop + ((100 - clamp(percent, 0, 100)) / 100) * plotHeight;
    const gridLines = [0, 50, 100]
      .map((percent) => {
        const y = yForPercent(percent);
        return `
          <line class="odds-history-grid-line" x1="${plotLeft}" x2="${viewWidth - plotRight}" y1="${y}" y2="${y}"></line>
          <text class="odds-history-axis-label" x="${plotLeft - 12}" y="${y}" text-anchor="end" dominant-baseline="middle">${percent}%</text>
        `;
      })
      .join("");
    const paths = chartOutcomes
      .map((outcome) => {
        const color = getHistoryColor(market, outcome.id);
        const path = buildRoundedStepPath(
          chartPoints,
          outcome.id,
          xForTradeNumber,
          yForPercent,
        );

        return `
          <path
            class="odds-history-line"
            d="${path}"
            style="--history-color:${color}"
          ></path>
        `;
      })
      .join("");
    const visibleEvents = timeline.events;
    const selectedEvent = visibleEvents[visibleEvents.length - 1] || null;
    const eventDots = visibleEvents
      .map((event) => {
        const copy = getHistoryEventCopy(event, market);
        const focusedOutcomeId =
          market.outcomes.length > 4 && selectedOutcome
            ? selectedOutcome.id
            : event.outcomeId;
        const eventPercent =
          market.outcomes.length > 4 && selectedOutcome
            ? Number(event.afterOdds.get(selectedOutcome.id) || 0)
            : event.toPercent;
        const color = getHistoryColor(market, focusedOutcomeId);
        return `
          <g
            class="odds-history-event-target"
            data-history-event="${event.index}"
            data-history-trade="${event.index + 1}"
            data-active="${String(selectedEvent?.index === event.index)}"
            style="--history-color:${color}"
            role="button"
            tabindex="0"
            aria-label="${escapeAttribute(copy.ariaLabel)}"
            aria-pressed="${String(selectedEvent?.index === event.index)}"
          >
            <circle
              class="odds-history-event-hit"
              cx="${xForTradeNumber(event.index + 1).toFixed(2)}"
              cy="${yForPercent(eventPercent).toFixed(2)}"
              r="22"
            ></circle>
            <circle
              class="odds-history-event-dot"
              cx="${xForTradeNumber(event.index + 1).toFixed(2)}"
              cy="${yForPercent(eventPercent).toFixed(2)}"
              r="5"
            ></circle>
          </g>
        `;
      })
      .join("");
    const currentOdds = chartPoints[chartPoints.length - 1]?.odds || new Map();
    const legend =
      market.outcomes.length > 4
        ? `
          <label class="odds-history-outcome-picker" for="history-outcome-select">
            <span>Outcome shown</span>
            <select id="history-outcome-select">
              ${market.outcomes
                .map(
                  (outcome) => `
                    <option
                      value="${outcome.id}"
                      ${outcome.id === selectedOutcome?.id ? "selected" : ""}
                    >
                      ${escapeHtml(outcome.label)} · ${formatPercent(currentOdds.get(outcome.id))}
                    </option>
                  `,
                )
                .join("")}
            </select>
          </label>
        `
        : `
          <div class="odds-history-legend" aria-label="Chart outcomes">
            ${market.outcomes
              .map(
                (outcome) => `
                  <span>
                    <i style="--history-color:${getHistoryColor(market, outcome.id)}" aria-hidden="true"></i>
                    <span>${escapeHtml(outcome.label)}</span>
                    <strong>${formatPercent(currentOdds.get(outcome.id))}</strong>
                  </span>
                `,
              )
              .join("")}
          </div>
        `;

    return `
      <figure class="odds-history" id="odds-history-panel">
        <div class="odds-history-heading">
          <div>
            <p class="eyebrow">Trading record</p>
            <h3>Odds history</h3>
          </div>
        </div>
        ${legend}
        <div class="odds-history-chart">
          <svg
            class="${isScrollable ? "is-scrollable" : ""}"
            ${isScrollable ? `style="--history-chart-width:${viewWidth}px"` : ""}
            viewBox="0 0 ${viewWidth} ${viewHeight}"
            role="img"
            aria-labelledby="odds-history-title-${market.id} odds-history-description-${market.id}"
          >
            <title id="odds-history-title-${market.id}">Community odds history</title>
            <desc id="odds-history-description-${market.id}">
              Soft-step chart showing how community odds changed as predictions were committed.
            </desc>
            ${gridLines}
            ${paths}
            ${eventDots}
            <text class="odds-history-axis-label" x="${plotLeft}" y="${viewHeight - 10}" text-anchor="start">Open</text>
            <text class="odds-history-axis-label" x="${viewWidth - plotRight}" y="${viewHeight - 10}" text-anchor="end">Latest</text>
          </svg>
        </div>
        <div class="odds-history-event" id="odds-history-detail" aria-live="polite">
          ${renderHistoryEventDetail(selectedEvent, market)}
        </div>
        <figcaption>
          Each step is one prediction. Select a trade to see its timing and odds impact.
        </figcaption>
      </figure>
    `;
  }

  function renderOutcomeMovement(movement) {
    const icon =
      movement.direction === "up" ? "▲" : movement.direction === "down" ? "▼" : "—";
    if (!movement.hasTrade) {
      return `
        <span class="odds-movement movement-flat" aria-label="No trades">
          <span class="odds-movement-icon" aria-hidden="true">—</span>
        </span>
      `;
    }

    if (movement.direction === "flat") {
      return `
        <span class="odds-movement movement-flat" aria-label="No odds change on the latest trade">
          <span class="odds-movement-icon" aria-hidden="true">—</span>
        </span>
      `;
    }

    const directionText = movement.direction === "up" ? "Up" : "Down";
    const magnitude = formatMovementMagnitude(movement.delta);

    return `
      <span
        class="odds-movement movement-${movement.direction}"
        aria-label="${directionText} ${magnitude} percentage points on the latest trade"
      >
        <span class="odds-movement-icon" aria-hidden="true">${icon}</span>
        <span aria-hidden="true">${magnitude}</span>
      </span>
    `;
  }

  function renderLiveOddsAnnouncement(liveChanges, market) {
    if (liveChanges.size === 0) return "";
    const leadingOutcome = [...market.outcomes].sort(
      (a, b) => b.percent - a.percent,
    )[0];
    return `
      <p class="visually-hidden" role="status" aria-live="polite">
        Market odds updated. ${escapeHtml(leadingOutcome.label)} is now ${formatPercent(leadingOutcome.percent)}.
      </p>
    `;
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
    const allMarkets = getAllMarkets();
    const markets = allMarkets.filter((market) => !market.archived_at);
    const archivedMarkets = allMarkets.filter((market) => {
      if (!market.archived_at) return false;
      return (
        state.profile.is_admin ||
        market.predictions.some((prediction) => prediction.user_id === state.user.id)
      );
    });
    const activeMarkets = markets.filter((market) => ["open", "closed"].includes(market.displayStatus));
    const openMarkets = markets.filter((market) => market.displayStatus === "open");
    const resolvedMarkets = markets.filter((market) => market.displayStatus === "resolved");
    const voidedMarkets = markets.filter((market) => market.displayStatus === "void");
    const totalAtStake = activeMarkets.reduce((sum, market) => sum + market.actualTotal, 0);
    const participatingTraders = new Set(
      activeMarkets.flatMap((market) =>
        market.predictions.map((prediction) => prediction.user_id)
      )
    ).size;
    const userLivePositions = activeMarkets.filter((market) =>
      market.predictions.some((prediction) => prediction.user_id === state.user.id)
    ).length;

    let filtered = markets;
    if (state.marketFilter === "active") filtered = activeMarkets;
    if (state.marketFilter === "resolved") filtered = resolvedMarkets;
    if (state.marketFilter === "void") filtered = voidedMarkets;
    if (state.marketFilter === "archived") filtered = archivedMarkets;

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
            <span>Open markets</span>
            <strong>${formatNumber(openMarkets.length)}</strong>
          </div>
          <div class="hero-stat">
            <span>Points in play</span>
            <strong>${formatCompact(totalAtStake)}</strong>
          </div>
          <div class="hero-stat">
            <span>Traders participating</span>
            <strong>${formatNumber(participatingTraders)}</strong>
          </div>
          <div class="hero-stat">
            <span>Your live positions</span>
            <strong>${formatNumber(userLivePositions)}</strong>
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
        ${filterButton("void", "Voided", voidedMarkets.length)}
        ${filterButton("all", "All", markets.length)}
        ${(state.profile.is_admin || archivedMarkets.length > 0)
          ? filterButton("archived", "Archived", archivedMarkets.length)
          : ""}
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
    const isVoided = filter === "void";
    const isArchived = filter === "archived";
    return `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">${isActive ? "?" : isVoided ? "∅" : isArchived ? "□" : "✓"}</div>
        <h2>${isActive ? "No active markets. Society is healing." : isVoided ? "No regulatory incidents." : isArchived ? "The archive is empty." : "Nothing here yet."}</h2>
        <p>${isActive ? "Create a question and give your friends something new to be confidently wrong about." : isVoided ? "Voided markets will remain here when refunds need an audit trail." : isArchived ? "Archived voids with prediction history will appear here for administrators and participating traders." : "Resolved markets will appear here after reality provides an answer."}</p>
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
          ${statusPill(market.archived_at ? "archived" : market.displayStatus)}
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
    if (market.archived_at) return "Voided · archived record";
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

    const userParticipated = market.predictions.some(
      (prediction) => prediction.user_id === state.user.id,
    );
    if (market.archived_at && !state.profile.is_admin && !userParticipated) {
      renderNotFound();
      return;
    }

    const isCreator = market.creator_id === state.user.id;
    const canManage = isCreator || state.profile.is_admin;
    const canEdit = state.profile.is_admin && market.status === "open";
    const canDelete = state.profile.is_admin && market.status === "void" && market.predictions.length === 0;
    const canArchive =
      state.profile.is_admin &&
      market.status === "void" &&
      !market.archived_at &&
      market.predictions.length > 0;
    const canRestore = state.profile.is_admin && market.status === "void" && Boolean(market.archived_at);
    const canPredict = market.displayStatus === "open";
    const canResolve = canManage && market.status === "open" && (market.isPastClose || state.profile.is_admin);
    const canVoid = canManage && market.status === "open";
    const hasMarketControls =
      state.profile.is_admin &&
      (canEdit || canResolve || canVoid || canArchive || canRestore || canDelete);
    const userPredictions = market.predictions.filter((prediction) => prediction.user_id === state.user.id);
    const userCommitted = userPredictions.reduce((sum, prediction) => sum + prediction.amount, 0);
    const sortedOutcomes = [...market.outcomes].sort((a, b) => b.percent - a.percent);
    const recentActivity = [...market.predictions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20);
    const oddsTimeline = buildMarketOddsTimeline(market);
    const movementByOutcome = getMarketMovementByOutcome(market, oddsTimeline);
    const historyEventByPrediction = new Map(
      oddsTimeline.events.map((event) => [event.prediction, event]),
    );
    const liveChanges = new Map();
    market.outcomes.forEach((outcome) => {
      const previousPercent = state.lastRenderedMarketOdds.get(outcome.id);
      if (
        Number.isFinite(previousPercent) &&
        formatPercent(previousPercent) !== formatPercent(outcome.percent)
      ) {
        liveChanges.set(outcome.id, {
          fromPercent: previousPercent,
          toPercent: outcome.percent,
          direction: outcome.percent > previousPercent ? "up" : "down",
        });
      }
    });
    const isOddsHistoryExpanded = state.oddsHistoryMarketId === market.id;

    dom.main.innerHTML = `
      <div class="market-layout">
        <div class="market-main">
          <section class="market-hero">
            <p class="eyebrow">Market #${market.id} · ${escapeHtml(statusLabel(market.archived_at ? "archived" : market.displayStatus))}</p>
            <h1>${escapeHtml(market.question)}</h1>
            ${market.description ? `<p class="market-description">${escapeHtml(market.description)}</p>` : ""}
            <div class="market-meta-row">
              <span class="tiny-pill">Created by ${escapeHtml(market.creator?.display_name || "Unknown")}</span>
              <span class="tiny-pill">Closes ${formatDateTime(market.closes_at)}</span>
              <span class="tiny-pill">${formatNumber(market.actualTotal)} points in pool</span>
              ${market.archived_at ? `<span class="tiny-pill">Archived ${formatDateTime(market.archived_at)}</span>` : ""}
            </div>
          </section>

          <section class="panel">
            <div class="panel-heading">
              <div>
                <h2>${market.displayStatus === "resolved" ? "Final results" : "Community odds"}</h2>
                <p>Display odds include ${market.outcomes[0]?.seed_points || 25} seed points per outcome. Payouts use real predictions only.</p>
              </div>
              <div class="panel-heading-actions">
                ${statusPill(market.archived_at ? "archived" : market.displayStatus)}
                ${market.predictions.length ? `
                  <button
                    class="odds-history-toggle"
                    id="toggle-odds-history"
                    type="button"
                    aria-expanded="${String(isOddsHistoryExpanded)}"
                    aria-controls="odds-history-panel"
                  >
                    <i class="fa-solid fa-chart-line" aria-hidden="true"></i>
                    ${isOddsHistoryExpanded ? "Hide odds history" : "View odds history"}
                  </button>
                ` : ""}
              </div>
            </div>

            ${renderLiveOddsAnnouncement(liveChanges, market)}
            <div class="outcome-list">
              ${sortedOutcomes
                .map((outcome) =>
                  renderOutcomeCard(
                    outcome,
                    market,
                    canPredict,
                    movementByOutcome.get(outcome.id),
                    liveChanges.get(outcome.id),
                  ),
                )
                .join("")}
            </div>
            ${isOddsHistoryExpanded ? renderOddsHistoryChart(market, oddsTimeline) : ""}
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
                ${recentActivity
                  .map((prediction) =>
                    renderActivityItem(
                      prediction,
                      market,
                      historyEventByPrediction.get(prediction),
                    ),
                  )
                  .join("")}
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
              <div class="summary-row summary-row-resolution">
                <span>Resolution</span>
                <div class="resolution-summary">
                  <strong>${market.displayStatus === "resolved" ? escapeHtml(market.winner?.label || "Resolved") : market.displayStatus === "void" ? "Voided" : "Pending"}</strong>
                  ${market.displayStatus === "resolved" && market.resolution_note
                    ? `<p>${escapeHtml(market.resolution_note)}</p>`
                    : ""}
                </div>
              </div>
            </div>

            ${renderLivePosition(market, state.user.id)}

            <div class="sidebar-actions">
              ${canPredict ? '<button class="button button-primary" id="predict-outcome" type="button">Place a prediction</button>' : ""}
              ${hasMarketControls ? `
                <div class="sidebar-management">
                  <p class="eyebrow sidebar-actions-label">Market controls</p>
                  <div class="sidebar-management-grid">
                    ${canEdit ? '<button class="button button-secondary" id="edit-market" type="button">Edit market</button>' : ""}
                    ${canVoid ? '<button class="button button-danger" id="void-market" type="button">Void &amp; refund</button>' : ""}
                    ${canResolve ? '<button class="button button-secondary button-wide" id="resolve-market" type="button">Resolve market</button>' : ""}
                    ${canArchive ? '<button class="button button-secondary button-wide" id="archive-void-market" type="button">Archive voided market</button>' : ""}
                    ${canRestore ? '<button class="button button-secondary button-wide" id="restore-void-market" type="button">Restore to Voided list</button>' : ""}
                    ${canDelete ? '<button class="button button-danger button-danger-subtle button-wide" id="delete-void-market" type="button">Delete empty voided market</button>' : ""}
                  </div>
                </div>
              ` : ""}
              <a class="sidebar-back-link" href="#/markets">← Back to markets</a>
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

    market.outcomes.forEach((outcome) => {
      state.lastRenderedMarketOdds.set(outcome.id, outcome.percent);
    });

    document.querySelectorAll("[data-predict-outcome]").forEach((button) => {
      button.addEventListener("click", () => openPredictionModal(market, Number(button.dataset.predictOutcome)));
    });

    document.querySelector("#predict-outcome")?.addEventListener("click", () => {
      openPredictionModal(market);
    });

    document.querySelector("#edit-market")?.addEventListener("click", () => openEditMarketModal(market));
    document.querySelector("#resolve-market")?.addEventListener("click", () => openResolveModal(market));
    document.querySelector("#void-market")?.addEventListener("click", () => openVoidModal(market));
    document.querySelector("#archive-void-market")?.addEventListener("click", () => openArchiveVoidMarketModal(market, true));
    document.querySelector("#restore-void-market")?.addEventListener("click", () => openArchiveVoidMarketModal(market, false));
    document.querySelector("#delete-void-market")?.addEventListener("click", () => openDeleteVoidMarketModal(market));
    document.querySelector("#toggle-odds-history")?.addEventListener("click", () => {
      const willExpand = state.oddsHistoryMarketId !== market.id;
      state.oddsHistoryMarketId = willExpand ? market.id : null;
      if (willExpand && market.outcomes.length > 4) {
        state.oddsHistoryOutcomeId =
          [...market.outcomes].sort((a, b) => b.percent - a.percent)[0]?.id || null;
      }
      renderMarketDetail(market.id);
    });
    document.querySelector("#history-outcome-select")?.addEventListener("change", (event) => {
      state.oddsHistoryOutcomeId = Number(event.currentTarget.value);
      renderMarketDetail(market.id);
    });

    const historyDots = document.querySelectorAll("[data-history-event]");
    const initiallyPinnedDot = document.querySelector(
      '[data-history-event][aria-pressed="true"]',
    );
    let pinnedHistoryEventIndex = Number(
      initiallyPinnedDot?.dataset?.historyEvent,
    );
    const activateHistoryEvent = (eventIndex, { pin = false } = {}) => {
      const historyEvent = oddsTimeline.events.find(
        (event) => event.index === Number(eventIndex),
      );
      const detail = document.querySelector("#odds-history-detail");
      if (!historyEvent || !detail) return;
      detail.innerHTML = renderHistoryEventDetail(historyEvent, market);
      historyDots.forEach((dot) => {
        const isActive =
          Number(dot.dataset.historyEvent) === historyEvent.index;
        dot.setAttribute("data-active", String(isActive));
        if (pin) {
          dot.setAttribute("aria-pressed", String(isActive));
        }
      });
      if (pin) pinnedHistoryEventIndex = historyEvent.index;
    };
    historyDots.forEach((dot) => {
      dot.addEventListener("pointerenter", () => {
        activateHistoryEvent(dot.dataset.historyEvent);
      });
      dot.addEventListener("focus", () => {
        activateHistoryEvent(dot.dataset.historyEvent);
      });
      dot.addEventListener("click", () => {
        activateHistoryEvent(dot.dataset.historyEvent, { pin: true });
      });
      dot.addEventListener("keydown", (event) => {
        if (!["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        activateHistoryEvent(dot.dataset.historyEvent, { pin: true });
      });
    });
    document.querySelector(".odds-history-chart")?.addEventListener(
      "pointerleave",
      () => {
        if (Number.isFinite(pinnedHistoryEventIndex)) {
          activateHistoryEvent(pinnedHistoryEventIndex);
        }
      },
    );
  }

  function renderOutcomeCard(outcome, market, canPredict, movement, liveChange) {
    const isWinner = market.winning_outcome_id === outcome.id;
    const userAmount = market.predictions
      .filter((prediction) => prediction.user_id === state.user.id && prediction.outcome_id === outcome.id)
      .reduce((sum, prediction) => sum + prediction.amount, 0);
    const outcomeMovement = movement || {
      currentPercent: outcome.percent,
      referencePercent: outcome.percent,
      delta: 0,
      hasTrade: false,
      direction: "flat",
    };
    const hasLiveChange = Boolean(liveChange);
    const liveMovementClass =
      liveChange?.direction === "up" ? " live-moved-up" : "";
    const oddsStyle = hasLiveChange
      ? `--odds-from:${clamp(liveChange.fromPercent, 0, 100)}%;--odds-to:${clamp(outcome.percent, 0, 100)}%;width:${clamp(outcome.percent, 0, 100)}%`
      : `width:${clamp(outcome.percent, 0, 100)}%`;

    return `
      <article class="outcome-card ${isWinner ? "winner" : ""}${liveMovementClass}">
        <div class="outcome-card-leading">
          <div class="outcome-name-line">
            <span class="outcome-name">${escapeHtml(outcome.label)}</span>
            ${isWinner ? '<span class="tiny-pill">Winner</span>' : ""}
            ${userAmount ? `<span class="tiny-pill">You: ${formatNumber(userAmount)}</span>` : ""}
          </div>
          <div class="odds-track" aria-hidden="true">
            <div class="odds-fill ${hasLiveChange ? "is-live-updated" : ""}" style="${oddsStyle}"></div>
          </div>
        </div>
        <div class="outcome-numbers">
          <strong class="${hasLiveChange ? "is-live-updated" : ""}">${formatPercent(outcome.percent)}</strong>
          ${renderOutcomeMovement(outcomeMovement)}
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

  function renderActivityItem(prediction, market, historyEvent) {
    const profile = state.profiles.find((item) => item.id === prediction.user_id);
    const outcome = market.outcomes.find((item) => item.id === prediction.outcome_id);
    const name = profile?.display_name || "Unknown trader";
    const eventCopy = historyEvent
      ? getHistoryEventCopy(historyEvent, market)
      : null;

    return `
      <div class="activity-item">
        ${renderProfileAvatar(profile || { display_name: name })}
        <div class="activity-copy">
          <div class="activity-statement">
            <strong>${escapeHtml(name)}</strong>
            <span> committed ${formatNumber(prediction.amount)} pts to </span>
            <strong>${escapeHtml(outcome?.label || "an outcome")}</strong>
          </div>
          ${eventCopy ? `
            <span class="activity-impact">
              ${escapeHtml(eventCopy.impactText)}
            </span>
          ` : ""}
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
              <textarea id="market-description" name="description" maxlength="600" aria-describedby="market-description-count" placeholder="Define any rules, edge cases, or highly specific party jurisprudence."></textarea>
              <div class="character-counter-row">
                <output id="market-description-count" class="character-counter" for="market-description" aria-label="Description character count">0 / 600</output>
              </div>
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

    bindCharacterCounter("market-description", "market-description-count");

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

  function updateScrollableTableFades() {
    document.querySelectorAll("[data-scrollable-table]").forEach((card) => {
      const scroller = card.querySelector(".table-scroll");
      if (!scroller) return;

      const maximumScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      card.classList.toggle("has-left-overflow", scroller.scrollLeft > 1);
      card.classList.toggle(
        "has-right-overflow",
        maximumScroll > 1 && scroller.scrollLeft < maximumScroll - 1,
      );
    });
  }

  function setupScrollableTableFades() {
    document.querySelectorAll("[data-scrollable-table]").forEach((card) => {
      const scroller = card.querySelector(".table-scroll");
      if (!scroller) return;
      scroller.addEventListener("scroll", updateScrollableTableFades, { passive: true });
    });

    updateScrollableTableFades();
    window.setTimeout(updateScrollableTableFades, 0);
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

      <section class="table-card" data-scrollable-table>
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
                        ${renderProfileAvatar(profile)}
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

    setupScrollableTableFades();
  }

  function renderPortfolio() {
    const allMarkets = getAllMarkets();
    const userPredictions = state.predictions.filter((prediction) => prediction.user_id === state.user.id);
    const userPayouts = state.payouts.filter((payout) => payout.user_id === state.user.id);
    const totalCommitted = userPredictions.reduce((sum, prediction) => sum + prediction.amount, 0);
    const unresolvedMarketIds = new Set(
      state.markets
        .filter((market) => market.status === "open")
        .map((market) => market.id)
    );
    const currentlyCommitted = userPredictions
      .filter((prediction) => unresolvedMarketIds.has(prediction.market_id))
      .reduce((sum, prediction) => sum + prediction.amount, 0);

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
      .map((position) => ({
        ...position,
        category: getPositionCategory(position),
        ...getPositionTableValues(position),
      }))
      .sort((a, b) => {
        const activePriority = Number(b.category === "active") - Number(a.category === "active");
        if (activePriority !== 0) return activePriority;
        return new Date(b.latest) - new Date(a.latest);
      });
    const positionCounts = {
      all: positions.length,
      active: positions.filter((position) => position.category === "active").length,
      won: positions.filter((position) => position.category === "won").length,
      lost: positions.filter((position) => position.category === "lost").length,
      refunded: positions.filter((position) => position.category === "refunded").length,
    };
    const filteredPositions = state.portfolioFilter === "all"
      ? positions
      : positions.filter((position) => position.category === state.portfolioFilter);
    const sortedPositions = sortPortfolioPositions(filteredPositions);
    const sortableHeader = (key, label, title = "", className = "") => {
      const isActive = state.portfolioSortKey === key;
      const ariaSort = isActive
        ? state.portfolioSortDirection === "asc" ? "ascending" : "descending"
        : "none";
      const indicator = isActive
        ? state.portfolioSortDirection === "asc" ? "↑" : "↓"
        : "↕";

      return `
        <th class="${className}" aria-sort="${ariaSort}"${title ? ` title="${escapeAttribute(title)}"` : ""}>
          <button class="table-sort-button" type="button" data-portfolio-sort="${key}">
            <span>${label}</span>
            <span class="sort-indicator" aria-hidden="true">${indicator}</span>
          </button>
        </th>
      `;
    };

    dom.main.innerHTML = `
      <div class="page-header">
        <div>
          <p class="eyebrow">Your portfolio</p>
          <h1>A complete record of your confidence.</h1>
          <p>Past performance is extremely admissible in the group chat.</p>
        </div>
      </div>

      <div class="portfolio-grid portfolio-summary">
        <div class="portfolio-stat">
          <span>Current balance</span>
          <strong>${formatNumber(state.profile.balance)} pts</strong>
        </div>
        <div class="portfolio-stat">
          <span>Currently committed</span>
          <strong>${formatNumber(currentlyCommitted)} pts</strong>
        </div>
        <div class="portfolio-stat">
          <span>All-time committed</span>
          <strong>${formatNumber(totalCommitted)} pts</strong>
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

      <div class="filter-row" role="group" aria-label="Filter your predictions">
        ${portfolioFilterButton("all", "All", positionCounts.all)}
        ${portfolioFilterButton("active", "Active", positionCounts.active)}
        ${portfolioFilterButton("won", "Won", positionCounts.won)}
        ${portfolioFilterButton("lost", "Lost", positionCounts.lost)}
        ${portfolioFilterButton("refunded", "Refunded", positionCounts.refunded)}
      </div>

      ${sortedPositions.length
        ? `
          <section class="table-card" data-scrollable-table>
            <div class="table-scroll">
              <table class="data-table portfolio-table">
                <thead>
                  <tr>
                    ${sortableHeader("market", "Market", "Prediction market question.", "portfolio-market-column")}
                    ${sortableHeader("outcome", "Your pick")}
                    ${sortableHeader("odds", "Odds", "Current community odds for open markets; final community odds after trading closes.", "numeric-column")}
                    ${sortableHeader("status", "Status")}
                    ${sortableHeader("committed", "Committed", "Total points committed to this outcome.", "numeric-column")}
                    ${sortableHeader("returned", "Returned", "Gross points credited at settlement. Refunds return the committed amount; losses return zero.", "numeric-column")}
                    ${sortableHeader("profitLoss", "P/L", "Returned points minus committed points. Unresolved positions are excluded.", "numeric-column")}
                  </tr>
                </thead>
                <tbody>
                  ${sortedPositions.map(renderPositionCard).join("")}
                </tbody>
              </table>
            </div>
          </section>
        `
        : renderNoPortfolioPositions(state.portfolioFilter, positions.length > 0)}
    `;

    document.querySelectorAll("[data-portfolio-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.portfolioFilter = button.dataset.portfolioFilter;
        renderPortfolio();
      });
    });

    document.querySelectorAll("[data-portfolio-sort]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextKey = button.dataset.portfolioSort;
        if (state.portfolioSortKey === nextKey) {
          state.portfolioSortDirection =
            state.portfolioSortDirection === "desc" ? "asc" : "desc";
        } else {
          state.portfolioSortKey = nextKey;
          state.portfolioSortDirection = ["market", "outcome", "status"].includes(nextKey)
            ? "asc"
            : "desc";
        }
        renderPortfolio();
      });
    });

    setupScrollableTableFades();
  }

  function getPositionCategory(position) {
    const { market, outcome, payout } = position;
    if (["open", "closed"].includes(market.displayStatus)) return "active";
    if (
      market.displayStatus === "void" ||
      (market.displayStatus === "resolved" && payout?.kind === "no_winner_refund")
    ) {
      return "refunded";
    }
    if (market.displayStatus === "resolved") {
      return market.winning_outcome_id === outcome.id ? "won" : "lost";
    }
    return "active";
  }

  function portfolioFilterButton(value, label, count) {
    return `
      <button
        class="filter-chip ${state.portfolioFilter === value ? "active" : ""}"
        data-portfolio-filter="${value}"
        type="button"
      >
        ${label} · ${count}
      </button>
    `;
  }

  function getPositionTableValues(position) {
    const { market, outcome, amount, payout } = position;
    const isResolved = market.displayStatus === "resolved";
    const isWinner = market.winning_outcome_id === outcome.id;
    const isVoid = market.displayStatus === "void";
    const isNoWinnerRefund = isResolved && payout?.kind === "no_winner_refund";

    let statusLabel = "Open";
    let statusTone = "is-open";
    let statusOrder = 0;
    let returned = null;
    let positionProfitLoss = null;

    if (market.displayStatus === "closed") {
      statusLabel = "Awaiting result";
      statusTone = "is-awaiting";
      statusOrder = 1;
    }
    if (isVoid) {
      statusLabel = market.archived_at ? "Voided · Archived" : "Voided";
      statusTone = "is-refunded";
      statusOrder = 5;
      returned = amount;
      positionProfitLoss = 0;
    }
    if (isNoWinnerRefund) {
      statusLabel = "Refunded";
      statusTone = "is-refunded";
      statusOrder = 4;
      returned = amount;
      positionProfitLoss = 0;
    }
    if (isResolved && isWinner && !isNoWinnerRefund) {
      statusLabel = "Won";
      statusTone = "is-won";
      statusOrder = 2;
      returned = payout?.amount || 0;
      positionProfitLoss = returned - amount;
    }
    if (isResolved && !isWinner && !isNoWinnerRefund) {
      statusLabel = "Lost";
      statusTone = "is-lost";
      statusOrder = 3;
      returned = 0;
      positionProfitLoss = -amount;
    }

    return {
      oddsContext: market.displayStatus === "open" ? "current" : "final",
      positionProfitLoss,
      returned,
      statusLabel,
      statusOrder,
      statusTone,
    };
  }

  function sortPortfolioPositions(positions) {
    if (state.portfolioSortKey === "default") return positions;

    const getSortValue = (position) => {
      switch (state.portfolioSortKey) {
        case "market": return position.market.question;
        case "outcome": return position.outcome.label;
        case "odds": return position.outcome.percent;
        case "status": return position.statusOrder;
        case "committed": return position.amount;
        case "returned": return position.returned;
        case "profitLoss": return position.positionProfitLoss;
        default: return 0;
      }
    };

    return [...positions].sort((a, b) => {
      const aValue = getSortValue(a);
      const bValue = getSortValue(b);

      // Unsettled positions have no returned or P/L value. Keep them below
      // settled values regardless of the selected direction.
      if (aValue === null && bValue !== null) return 1;
      if (aValue !== null && bValue === null) return -1;

      const comparison = typeof aValue === "string"
        ? aValue.localeCompare(bValue)
        : (aValue ?? 0) - (bValue ?? 0);
      if (comparison !== 0) {
        return state.portfolioSortDirection === "asc" ? comparison : -comparison;
      }

      const latestDifference = new Date(b.latest) - new Date(a.latest);
      if (latestDifference !== 0) return latestDifference;
      return a.market.question.localeCompare(b.market.question);
    });
  }

  function renderNoPortfolioPositions(filter, hasAnyPositions) {
    if (!hasAnyPositions) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">0</div>
          <h2>No predictions yet.</h2>
          <p>Your reputation remains pristine only because it remains untested.</p>
          <a class="button button-primary" href="#/markets">Browse markets</a>
        </div>
      `;
    }

    const labels = {
      active: "active",
      won: "winning",
      lost: "losing",
      refunded: "refunded",
    };
    return `
      <div class="empty-state">
        <div class="empty-state-icon">0</div>
        <h2>No ${labels[filter] || "matching"} positions.</h2>
        <p>Try another category to review the rest of your record.</p>
      </div>
    `;
  }

  function renderPositionCard(position) {
    const tableValues = position.statusLabel
      ? position
      : { ...position, ...getPositionTableValues(position) };
    const {
      market,
      outcome,
      amount,
      oddsContext,
      positionProfitLoss,
      returned,
      statusLabel,
      statusTone,
    } = tableValues;
    const profitLossClass = positionProfitLoss > 0
      ? "text-success"
      : positionProfitLoss < 0
        ? "text-danger"
        : "";
    const returnedText = returned === null ? "—" : `${formatNumber(returned)} pts`;
    const profitLossText = positionProfitLoss === null
      ? "—"
      : `${positionProfitLoss > 0 ? "+" : ""}${formatNumber(positionProfitLoss)} pts`;

    return `
      <tr>
        <td class="portfolio-question-cell">
          <a class="portfolio-question-link" href="#/market/${market.id}">${escapeHtml(market.question)}</a>
        </td>
        <td class="portfolio-outcome-cell"><strong>${escapeHtml(outcome.label)}</strong></td>
        <td class="numeric-cell">
          <span class="table-value-with-note">
            <strong>${formatPercent(outcome.percent)}</strong>
            <small>${oddsContext}</small>
          </span>
        </td>
        <td><span class="position-status ${statusTone}">${statusLabel}</span></td>
        <td class="mono numeric-cell">${formatNumber(amount)} pts</td>
        <td class="mono numeric-cell">${returnedText}</td>
        <td class="mono numeric-cell ${profitLossClass}">${profitLossText}</td>
      </tr>
    `;
  }

  async function renderAdmin() {
    if (!state.profile?.is_admin) {
      renderNotFound();
      return;
    }

    dom.main.innerHTML = `
      <div class="page-header">
        <div>
          <p class="eyebrow">Administrator</p>
          <h1>Exchange operations.</h1>
          <p>Loading the invitation registry and its formidable paper trail.</p>
        </div>
      </div>
      <div class="loading-grid">
        <div class="loading-card skeleton"></div>
        <div class="loading-card skeleton"></div>
      </div>
    `;

    const { data, error } = await state.client.rpc("list_approved_signup_emails");

    if (getRoute().page !== "admin") return;

    if (error) {
      dom.main.innerHTML = `
        <section class="empty-state">
          <div class="empty-state-icon">!</div>
          <h2>The invitation desk is temporarily unattended.</h2>
          <p>${escapeHtml(error.message || "The invitation registry could not be loaded.")}</p>
          <button class="button button-primary" id="retry-admin-button" type="button">Try again</button>
        </section>
      `;
      document.querySelector("#retry-admin-button")?.addEventListener("click", renderAdmin);
      return;
    }

    dom.main.innerHTML = buildAdminInvitationMarkup(data || []);
    bindAdminInvitationEvents(data || []);
  }

  function buildAdminInvitationMarkup(invitations) {
    const joinedCount = invitations.filter(
      (invitation) => invitation.registered_user_id && invitation.confirmed_at
    ).length;
    const awaitingCount = invitations.filter(
      (invitation) => invitation.registered_user_id && !invitation.confirmed_at
    ).length;
    const availableCount = invitations.filter(
      (invitation) => !invitation.registered_user_id
    ).length;

    const rows = invitations.map((invitation) => {
      const isRegistered = Boolean(invitation.registered_user_id);
      const isConfirmed = Boolean(invitation.confirmed_at);
      const status = isConfirmed
        ? { label: "Joined", className: "status-resolved" }
        : isRegistered
          ? { label: "Awaiting confirmation", className: "status-closed" }
          : { label: "Approved", className: "status-open" };
      const addedBy = invitation.added_by_display_name
        || (isRegistered ? "Existing account" : "Administrator");
      const traderName = invitation.registered_display_name
        ? `<span class="muted">${escapeHtml(invitation.registered_display_name)}</span>`
        : "";

      return `
        <tr>
          <td>
            <div class="invitation-email">
              <strong>${escapeHtml(invitation.email)}</strong>
              ${traderName}
            </div>
          </td>
          <td><span class="status-pill ${status.className}">${status.label}</span></td>
          <td>${escapeHtml(addedBy)}</td>
          <td class="mono">${invitation.added_at ? escapeHtml(formatDateTime(invitation.added_at)) : "—"}</td>
          <td>
            ${isRegistered
              ? '<span class="muted">Account retained</span>'
              : `<button class="button button-ghost button-small" data-remove-invitation="${escapeAttribute(invitation.email)}" type="button">Remove</button>`}
          </td>
        </tr>
      `;
    }).join("");

    return `
      <div class="page-header">
        <div>
          <p class="eyebrow">Administrator</p>
          <h1>Exchange operations.</h1>
          <p>Approve the addresses permitted to establish an imaginary financial presence.</p>
        </div>
        <button class="button button-secondary" id="admin-award-points" type="button">Adjust points</button>
      </div>

      <div class="portfolio-grid admin-stats">
        <div class="portfolio-stat">
          <span>Ready to register</span>
          <strong>${formatNumber(availableCount)}</strong>
          <small>approved addresses</small>
        </div>
        <div class="portfolio-stat">
          <span>Awaiting confirmation</span>
          <strong>${formatNumber(awaitingCount)}</strong>
          <small>accounts created</small>
        </div>
        <div class="portfolio-stat">
          <span>Joined traders</span>
          <strong>${formatNumber(joinedCount)}</strong>
          <small>confirmed accounts</small>
        </div>
      </div>

      <section class="panel invitation-panel">
        <div class="panel-heading">
          <div>
            <h2>Approve an email address</h2>
            <p>The person can register after approval. Supabase sends their confirmation email when they create the account.</p>
          </div>
        </div>
        <form id="approve-email-form" class="invitation-form">
          <div class="form-field">
            <label for="approved-email">Email address</label>
            <input id="approved-email" name="email" type="email" maxlength="254" autocomplete="off" placeholder="friend@example.com" required />
          </div>
          <button class="button button-primary" type="submit">Approve email</button>
        </form>
      </section>

      <section class="table-card">
        <div class="admin-table-heading">
          <div>
            <h2>Invitation registry</h2>
            <p>Registered accounts remain in the ledger and cannot be removed here.</p>
          </div>
          <span class="tiny-pill">${formatNumber(invitations.length)} ${pluralize(invitations.length, "record")}</span>
        </div>
        ${invitations.length ? `
          <div class="table-scroll">
            <table class="data-table invitation-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Approved by</th>
                  <th>Approved on</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state compact-empty-state">
            <div class="empty-state-icon">@</div>
            <h2>No approved addresses yet.</h2>
            <p>Add the first friend above before enabling invitation-only registration.</p>
          </div>
        `}
      </section>
    `;
  }

  function bindAdminInvitationEvents(invitations) {
    document.querySelector("#admin-award-points")?.addEventListener("click", openAdminPointsModal);

    document.querySelector("#approve-email-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = String(new FormData(event.currentTarget).get("email") || "").trim();
      const submit = event.currentTarget.querySelector("button[type='submit']");
      const wasAlreadyApproved = invitations.some(
        (invitation) => invitation.email.toLowerCase() === email.toLowerCase()
      );

      setButtonLoading(submit, true, "Approving…");
      const { error } = await state.client.rpc("add_approved_signup_email", {
        p_email: email,
      });
      setButtonLoading(submit, false);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      await renderAdmin();
      showToast(
        wasAlreadyApproved
          ? `${email} is already in the invitation registry.`
          : `${email} may now create an account.`,
        "success",
      );
    });

    document.querySelectorAll("[data-remove-invitation]").forEach((button) => {
      button.addEventListener("click", () => {
        openRemoveInvitationModal(button.dataset.removeInvitation);
      });
    });
  }

  function openRemoveInvitationModal(email) {
    openModal(`
      <div class="modal-header">
        <div>
          <p class="eyebrow">Remove approval</p>
          <h2>Withdraw this invitation?</h2>
          <p>${escapeHtml(email)}</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <p style="margin-top:0">
          This address will no longer be able to create an account. Existing registered accounts are never removed by this action.
        </p>
      </div>
      <div class="modal-footer">
        <button class="button button-secondary" data-modal-close type="button">Keep approval</button>
        <button class="button button-danger" id="confirm-remove-invitation" type="button">Remove approval</button>
      </div>
    `);

    document.querySelector("#confirm-remove-invitation")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      setButtonLoading(button, true, "Removing…");
      const { error } = await state.client.rpc("remove_approved_signup_email", {
        p_email: email,
      });
      setButtonLoading(button, false);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      closeModal();
      await renderAdmin();
      showToast(`${email} is no longer approved to register.`, "success");
    });
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
          <div class="form-field resolution-note-field">
            <label for="resolution-note">Resolution note</label>
            <textarea
              id="resolution-note"
              name="resolutionNote"
              maxlength="280"
              aria-describedby="resolution-note-help resolution-note-count"
              placeholder="Spain beat Argentina 1-0"
              required
            ></textarea>
            <small id="resolution-note-help">
              Briefly record what happened. This becomes part of the permanent settlement record.
            </small>
            <div class="character-counter-row">
              <output id="resolution-note-count" class="character-counter" for="resolution-note" aria-label="Resolution note character count">0 / 280</output>
            </div>
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

    bindCharacterCounter("resolution-note", "resolution-note-count", 280);

    document.querySelector("#resolve-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const winner = Number(formData.get("winner"));
      const resolutionNote = String(formData.get("resolutionNote") || "").trim();
      const resolutionNoteField = event.currentTarget.querySelector("#resolution-note");
      const button = event.currentTarget.querySelector("button[type='submit']");
      const winningOutcome = market.outcomes.find((outcome) => outcome.id === winner);

      if (!resolutionNote) {
        showToast("Add a resolution note before resolving the market.", "error");
        resolutionNoteField?.focus();
        return;
      }

      setButtonLoading(button, true, "Distributing points…");
      const { data, error } = await state.client.rpc("resolve_market", {
        p_market_id: market.id,
        p_winning_outcome_id: winner,
        p_resolution_note: resolutionNote,
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

  function openEditMarketModal(market) {
    if (!state.profile?.is_admin || market.status !== "open") return;

    openModal(`
      <div class="modal-header">
        <div>
          <p class="eyebrow">Administrator correction</p>
          <h2>Edit market.</h2>
          <p>Outcomes and prediction history remain unchanged.</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <form id="edit-market-form">
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-field form-field-full">
              <label for="edit-market-question">Question</label>
              <input
                id="edit-market-question"
                name="question"
                type="text"
                minlength="5"
                maxlength="180"
                value="${escapeAttribute(market.question)}"
                required
              />
            </div>
            <div class="form-field form-field-full">
              <label for="edit-market-description">Details <span class="muted">(optional)</span></label>
              <textarea
                id="edit-market-description"
                name="description"
                maxlength="600"
                aria-describedby="edit-market-description-count"
              >${escapeHtml(market.description || "")}</textarea>
              <div class="character-counter-row">
                <output id="edit-market-description-count" class="character-counter" for="edit-market-description" aria-label="Description character count">0 / 600</output>
              </div>
            </div>
            <div class="form-field form-field-full">
              <label for="edit-market-closes">Predictions close</label>
              <input
                id="edit-market-closes"
                name="closesAt"
                type="datetime-local"
                value="${toLocalDateTimeInput(new Date(market.closes_at))}"
                required
              />
              <small>The corrected closing time must still be in the future.</small>
            </div>
          </div>
          <p class="trade-warning">
            This is an admin-only correction. Existing predictions are final, so outcome names cannot be edited.
          </p>
        </div>
        <div class="modal-footer">
          <button class="button button-secondary" data-modal-close type="button">Cancel</button>
          <button class="button button-primary" type="submit">Save correction</button>
        </div>
      </form>
    `, "edit-market-modal");

    bindCharacterCounter("edit-market-description", "edit-market-description-count");

    document.querySelector("#edit-market-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const question = String(form.get("question") || "").trim();
      const description = String(form.get("description") || "").trim();
      const closesAt = new Date(String(form.get("closesAt") || ""));
      const button = event.currentTarget.querySelector("button[type='submit']");

      if (question.length < 5 || question.length > 180) {
        showToast("Questions must be between 5 and 180 characters.", "error");
        return;
      }

      if (Number.isNaN(closesAt.getTime()) || closesAt.getTime() <= Date.now()) {
        showToast("Choose a corrected closing time in the future.", "error");
        return;
      }

      setButtonLoading(button, true, "Saving correction…");
      const { error } = await state.client.rpc("edit_market", {
        p_market_id: market.id,
        p_question: question,
        p_description: description || null,
        p_closes_at: closesAt.toISOString(),
      });
      setButtonLoading(button, false);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      closeModal();
      await refreshData({ quiet: true });
      showToast("Market corrected. The official record has been amended.", "success");
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

  function openDeleteVoidMarketModal(market) {
    if (!state.profile?.is_admin || market.status !== "void" || market.predictions.length !== 0) return;

    openModal(`
      <div class="modal-header">
        <div>
          <p class="eyebrow">Administrative cleanup</p>
          <h2>Delete this empty voided market?</h2>
          <p>${escapeHtml(market.question)}</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <p style="margin-top:0">
          Because no predictions were ever placed, this market has no financial history to preserve.
          Deleting it will permanently remove the market and its outcomes.
        </p>
        <p class="trade-warning">
          Voided markets with predictions cannot be deleted; their refund history remains auditable.
        </p>
      </div>
      <div class="modal-footer">
        <button class="button button-secondary" data-modal-close type="button">Keep record</button>
        <button class="button button-danger" id="confirm-delete-void" type="button">Delete permanently</button>
      </div>
    `);

    document.querySelector("#confirm-delete-void").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      setButtonLoading(button, true, "Deleting…");
      const { error } = await state.client.rpc("delete_empty_void_market", {
        p_market_id: market.id,
      });
      setButtonLoading(button, false);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      closeModal();
      await refreshData({ quiet: true });
      window.location.hash = "#/markets";
      showToast("The empty voided market has been removed.", "success");
    });
  }

  function openArchiveVoidMarketModal(market, shouldArchive) {
    const isValidArchive =
      shouldArchive &&
      !market.archived_at &&
      market.predictions.length > 0;
    const isValidRestore = !shouldArchive && Boolean(market.archived_at);

    if (
      !state.profile?.is_admin ||
      market.status !== "void" ||
      (!isValidArchive && !isValidRestore)
    ) {
      return;
    }

    openModal(`
      <div class="modal-header">
        <div>
          <p class="eyebrow">${shouldArchive ? "Archive voided market" : "Restore archived market"}</p>
          <h2>${shouldArchive ? "Move this record out of ordinary views?" : "Return this record to the Voided list?"}</h2>
          <p>${escapeHtml(market.question)}</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <p style="margin-top:0">
          ${shouldArchive
            ? "The market will leave the ordinary market lists, but its predictions, refunds, and point history will remain unchanged."
            : "The market will reappear in the ordinary Voided list. Its prediction and refund history will remain unchanged."}
        </p>
        <p class="trade-warning">
          ${shouldArchive
            ? "Administrators and traders who participated can still find this record under Archived."
            : "Restoring does not reopen the market or change its voided status."}
        </p>
      </div>
      <div class="modal-footer">
        <button class="button button-secondary" data-modal-close type="button">Cancel</button>
        <button class="button button-primary" id="confirm-archive-void" type="button">
          ${shouldArchive ? "Archive record" : "Restore record"}
        </button>
      </div>
    `);

    document.querySelector("#confirm-archive-void").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      setButtonLoading(button, true, shouldArchive ? "Archiving…" : "Restoring…");
      const { error } = await state.client.rpc("set_void_market_archived", {
        p_market_id: market.id,
        p_archived: shouldArchive,
      });
      setButtonLoading(button, false);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      closeModal();
      state.marketFilter = shouldArchive ? "archived" : "void";
      window.location.hash = "#/markets";
      await refreshData({ quiet: true });
      showToast(
        shouldArchive
          ? "Voided market archived. Its refund history remains available."
          : "Archived market restored to the Voided list.",
        "success",
      );
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
    const selectedIcon = normalizeProfileIcon(state.profile.profile_icon);
    const iconChoices = [
      `
        <label class="profile-icon-option" title="Initials">
          <input
            class="profile-icon-input"
            type="radio"
            name="profileIcon"
            value=""
            ${selectedIcon ? "" : "checked"}
          />
          <span class="profile-icon-choice-preview profile-icon-initials" aria-hidden="true">
            ${escapeHtml(initials(state.profile.display_name))}
          </span>
          <span class="visually-hidden">Initials</span>
        </label>
      `,
      ...PROFILE_ICON_OPTIONS.map((icon) => `
        <label class="profile-icon-option" title="${escapeAttribute(icon.label)}">
          <input
            class="profile-icon-input"
            type="radio"
            name="profileIcon"
            value="${escapeAttribute(icon.name)}"
            ${selectedIcon === icon.name ? "checked" : ""}
          />
          <span class="profile-icon-choice-preview" aria-hidden="true">
            <i class="fa-solid fa-${escapeAttribute(icon.name)}"></i>
          </span>
          <span class="visually-hidden">${escapeHtml(icon.label)}</span>
        </label>
      `),
    ].join("");

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
          <fieldset class="profile-icon-field" aria-describedby="profile-icon-help">
            <legend>Profile icon</legend>
            <p id="profile-icon-help">Choose how you appear on the leaderboard.</p>
            <div class="profile-icon-grid">
              ${iconChoices}
            </div>
          </fieldset>
          <p class="trade-warning">
            Your email and password let you access the same balance, predictions, and markets from any device.
            To change a forgotten password, sign out and use the password-reset link on the login screen.
          </p>
        </div>
        <div class="modal-footer">
          <button class="button button-ghost" id="account-sign-out" type="button">Sign out</button>
          <button class="button button-primary" type="submit">Save changes</button>
        </div>
      </form>
    `, "account-modal");

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

    const accountNameInput = document.querySelector("#account-name");
    const initialsPreview = document.querySelector(".profile-icon-initials");
    accountNameInput.addEventListener("input", () => {
      initialsPreview.textContent = initials(accountNameInput.value);
    });

    document.querySelector("#account-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const name = String(formData.get("displayName") || "").trim();
      const profileIcon = normalizeProfileIcon(formData.get("profileIcon"));
      const button = event.currentTarget.querySelector("button[type='submit']");

      setButtonLoading(button, true, "Saving…");
      const { error } = await state.client.rpc("update_profile", {
        p_display_name: name,
        p_profile_icon: profileIcon,
      });
      setButtonLoading(button, false);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      closeModal();
      await refreshData({ quiet: true });
      showToast("Profile updated.", "success");
    });
  }

  function openAdminPointsModal() {
    if (!state.profile.is_admin) return;

    const sortedProfiles = [...state.profiles].sort((a, b) => a.display_name.localeCompare(b.display_name));
    openModal(`
      <div class="modal-header">
        <div>
          <p class="eyebrow">Administrator</p>
          <h2>Adjust points.</h2>
          <p>Choose one trader and apply a positive or negative whole-number adjustment.</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <form id="admin-points-form">
        <div class="modal-body">
          <div class="prediction-fields">
            <div class="form-field">
              <label for="admin-points-user">Trader</label>
              <select id="admin-points-user" name="userId" required>
                <option value="" selected>Choose a trader…</option>
                ${sortedProfiles.map((profile) => `
                  <option value="${profile.id}">${escapeHtml(profile.display_name)}</option>
                `).join("")}
              </select>
            </div>
            <div class="form-field">
              <label for="admin-points-amount">Adjustment</label>
              <input
                id="admin-points-amount"
                name="amount"
                type="number"
                min="-1000000"
                max="1000000"
                step="1"
                placeholder="For example, 250 or -100"
                required
              />
              <small>Positive adds points. Negative removes them.</small>
            </div>
          </div>

          <div class="trade-summary admin-points-summary">
            <div class="trade-summary-row">
              <span>Current balance</span>
              <strong id="admin-current-balance">—</strong>
            </div>
            <div class="trade-summary-row">
              <span>Balance after adjustment</span>
              <strong id="admin-new-balance">—</strong>
            </div>
          </div>
          <p class="trade-warning">Adjustments are recorded in the point transaction ledger.</p>
        </div>
        <div class="modal-footer">
          <button class="button button-secondary" data-modal-close type="button">Cancel</button>
          <button class="button button-primary" type="submit" disabled>Apply adjustment</button>
        </div>
      </form>
    `, "admin-points-modal");

    const form = document.querySelector("#admin-points-form");
    const userSelect = document.querySelector("#admin-points-user");
    const amountInput = document.querySelector("#admin-points-amount");
    const currentBalance = document.querySelector("#admin-current-balance");
    const newBalance = document.querySelector("#admin-new-balance");
    const submit = form.querySelector("button[type='submit']");

    const updateAdjustmentPreview = () => {
      const profile = state.profiles.find((item) => item.id === userSelect.value);
      const amount = parseWholeNumber(amountInput.value);
      const newBalanceValue = profile && amount !== null
        ? profile.balance + amount
        : null;
      const isValid =
        Boolean(profile) &&
        amount !== null &&
        amount !== 0 &&
        amount >= -1000000 &&
        amount <= 1000000 &&
        newBalanceValue >= 0;

      currentBalance.textContent = profile
        ? `${formatNumber(profile.balance)} pts`
        : "—";
      newBalance.textContent = isValid
        ? `${formatNumber(newBalanceValue)} pts`
        : "—";
      submit.disabled = !isValid;
    };

    userSelect.addEventListener("change", updateAdjustmentPreview);
    amountInput.addEventListener("input", updateAdjustmentPreview);
    updateAdjustmentPreview();
    userSelect.focus();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const userId = userSelect.value;
      const amount = parseWholeNumber(amountInput.value);
      const profile = state.profiles.find((item) => item.id === userId);
      const newBalanceValue = profile && amount !== null
        ? profile.balance + amount
        : -1;

      if (
        !profile ||
        amount === null ||
        amount === 0 ||
        amount < -1000000 ||
        amount > 1000000 ||
        newBalanceValue < 0
      ) {
        showToast("Choose a trader and enter a valid non-zero adjustment.", "error");
        return;
      }

      setButtonLoading(submit, true, "Applying…");
      const { error } = await state.client.rpc("award_points", {
        p_user_id: userId,
        p_amount: amount,
        p_note: "Manual admin adjustment",
      });
      setButtonLoading(submit, false);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      closeModal();
      await refreshData({ quiet: true });
      showToast(`${amount > 0 ? "+" : ""}${formatNumber(amount)} points applied to ${profile.display_name}.`, "success");
    });
  }

  function openModal(content, modalClass = "") {
    dom.modalRoot.innerHTML = `
      <div class="modal-backdrop" role="presentation">
        <section class="modal${modalClass ? ` ${escapeAttribute(modalClass)}` : ""}" role="dialog" aria-modal="true">
          ${content}
        </section>
      </div>
    `;
    document.body.classList.add("modal-open");
  }

  function closeModal({ acknowledgeAllowance = true } = {}) {
    const allowanceNotice = state.allowanceNoticeOpen
      ? state.allowanceNoticeCurrent
      : null;
    state.allowanceNoticeOpen = false;
    state.allowanceNoticeCurrent = null;
    dom.modalRoot.innerHTML = "";
    document.body.classList.remove("modal-open");

    if (allowanceNotice) {
      suppressAllowanceNoticeThrough(allowanceNotice.latestPeriod);
      if (acknowledgeAllowance) void acknowledgeAllowanceNotice(allowanceNotice);
      return;
    }

    if (state.pendingAllowanceNotice) {
      window.setTimeout(showPendingAllowanceNotice, 0);
    }
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
      archived: "Archived",
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

  function normalizeProfileIcon(value) {
    const icon = String(value || "").trim();
    return PROFILE_ICON_NAMES.has(icon) ? icon : null;
  }

  function renderProfileAvatar(profile) {
    const name = profile?.display_name || "Unknown trader";
    const profileIcon = normalizeProfileIcon(profile?.profile_icon);
    const content = profileIcon
      ? `<i class="fa-solid fa-${escapeAttribute(profileIcon)}"></i>`
      : escapeHtml(initials(name));

    return `<span class="avatar" aria-hidden="true">${content}</span>`;
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

  function updateCharacterCounter(textarea, counter, maxLength = 600) {
    const count = String(textarea.value || "").length;
    counter.textContent = `${count} / ${maxLength}`;
    counter.classList.toggle("is-near-limit", count >= maxLength - 50);
  }

  function bindCharacterCounter(textareaId, counterId, maxLength = 600) {
    const textarea = document.querySelector(`#${textareaId}`);
    const counter = document.querySelector(`#${counterId}`);
    if (!textarea || !counter) return;

    const update = () => updateCharacterCounter(textarea, counter, maxLength);
    textarea.addEventListener("input", update);
    update();
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
