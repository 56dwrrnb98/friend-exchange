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
  const MAX_MARKET_OUTCOMES = 6;
  const MARKET_ACTIVITY_LIMIT = 20;
  const NOTIFICATION_HISTORY_PAGE_SIZE = 10;
  const ADMIN_NOTIFICATION_OVERVIEW_LIMIT = 100;
  const NOTIFICATION_HISTORY_FILTERS = Object.freeze([
    { value: "all", label: "All" },
    { value: "automatic", label: "Automatic" },
    { value: "tests", label: "Tests" },
    { value: "failed", label: "Failed" },
  ]);
  const MARKET_ACTIVITY_VIEW_LABELS = Object.freeze({
    recent: "Recent",
    largest: "Largest commitments",
    position: "Group by position",
  });
  const MARKET_ACTIVITY_VIEWS = new Set(Object.keys(MARKET_ACTIVITY_VIEW_LABELS));
  const NOTIFICATION_KIND_LABELS = Object.freeze({
    new_market: "New market",
    closing_soon: "Closing soon",
    resolution: "Resolution",
    void: "Voided market",
  });
  const NOTIFICATION_MODE_OPTIONS = Object.freeze([
    {
      value: "off",
      label: "Paused",
      description: "No automatic notification records or pushes.",
      icon: "pause",
      className: "is-paused",
    },
    {
      value: "test",
      label: "Admins only",
      description: "Record activity and send only to opted-in administrators.",
      icon: "flask",
      className: "is-admins",
    },
    {
      value: "live",
      label: "Live",
      description: "Send alerts to every member who opted in.",
      icon: "tower-broadcast",
      className: "is-live",
    },
  ]);
  const ODDS_HISTORY_COLORS = Object.freeze([
    "#101b18",
    "#327ca5",
    "#c45518",
    "#6c5ab4",
    "#347a16",
    "#bd2e24",
  ]);
  const ORDINAL_DAY_WORDS = Object.freeze([
    "",
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "sixth",
    "seventh",
    "eighth",
    "ninth",
    "tenth",
    "eleventh",
    "twelfth",
    "thirteenth",
    "fourteenth",
    "fifteenth",
    "sixteenth",
    "seventeenth",
    "eighteenth",
    "nineteenth",
    "twentieth",
    "twenty-first",
    "twenty-second",
    "twenty-third",
    "twenty-fourth",
    "twenty-fifth",
    "twenty-sixth",
    "twenty-seventh",
    "twenty-eighth",
    "twenty-ninth",
    "thirtieth",
    "thirty-first",
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
    headerBalanceFull: document.querySelector("#header-balance-full"),
    headerBalanceCompact: document.querySelector("#header-balance-compact"),
    balanceButton: document.querySelector("#balance-button"),
    adminNavLink: document.querySelector("#admin-nav-link"),
    adminMobileNavLink: document.querySelector("#admin-mobile-nav-link"),
    mobileNav: document.querySelector(".mobile-nav"),
    settingsLink: document.querySelector("#settings-link"),
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
    allowanceActivity: [],
    marketFilter: "active",
    activityExpanded: false,
    marketActivityView: "recent",
    marketActivityMarketId: null,
    portfolioFilter: "all",
    portfolioSortKey: "default",
    portfolioSortDirection: "desc",
    leaderboardSortKey: "profitLoss",
    leaderboardSortDirection: "desc",
    adminPeopleSortKey: "approved",
    adminPeopleSortDirection: "desc",
    oddsHistoryMarketId: null,
    selectedOutcomeByMarket: new Map(),
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
    modalReturnFocusElement: null,
    authSubscription: null,
    passwordRecovery: false,
    notificationPreferences: {
      new_market_push: false,
      closing_soon_push: false,
      resolution_push: false,
      active_subscription_count: 0,
    },
    pushSubscriptions: [],
    notificationAvailable: false,
    notificationRefreshing: false,
    serviceWorkerRegistration: null,
    currentPushSubscriptionActive: false,
    currentPushSubscriptionEndpoint: null,
    notificationAdminOverview: null,
    notificationHistoryFilter: "all",
    notificationLabOpen: false,
    notificationTestResult: null,
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
    window.addEventListener("resize", updateScrollableFilterRows);

    dom.balanceButton.addEventListener("click", () => {
      window.location.hash = "#/settings";
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
    state.allowanceActivity = [];
    state.marketFilter = "active";
    state.activityExpanded = false;
    state.marketActivityView = "recent";
    state.marketActivityMarketId = null;
    state.portfolioFilter = "all";
    state.portfolioSortKey = "default";
    state.portfolioSortDirection = "desc";
    state.leaderboardSortKey = "profitLoss";
    state.leaderboardSortDirection = "desc";
    state.adminPeopleSortKey = "approved";
    state.adminPeopleSortDirection = "desc";
    state.oddsHistoryMarketId = null;
    state.selectedOutcomeByMarket = new Map();
    state.lastRenderedMarketOdds = new Map();
    state.loading = false;
    state.notificationPreferences = {
      new_market_push: false,
      closing_soon_push: false,
      resolution_push: false,
      active_subscription_count: 0,
    };
    state.pushSubscriptions = [];
    state.notificationAvailable = false;
    state.notificationRefreshing = false;
    state.serviceWorkerRegistration = null;
    state.currentPushSubscriptionActive = false;
    state.currentPushSubscriptionEndpoint = null;
    state.notificationAdminOverview = null;
    state.notificationHistoryFilter = "all";
    state.notificationLabOpen = false;
    state.notificationTestResult = null;
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
    void preparePushServiceWorker();
    renderLoading();
    await refreshData();
    subscribeToChanges();
  }

  async function refreshData({ quiet = false } = {}) {
    if (state.loading) return;
    state.loading = true;

    if (!quiet) renderLoading();

    const [
      profilesResult,
      marketsResult,
      outcomesResult,
      predictionsResult,
      payoutsResult,
      allowanceActivityResult,
    ] = await Promise.all([
      state.client.from("profiles").select("id, display_name, profile_icon, balance, is_admin, created_at"),
      state.client.from("markets").select("*").order("created_at", { ascending: false }),
      state.client.from("outcomes").select("*").order("sort_order", { ascending: true }),
      state.client.from("predictions").select("*").order("created_at", { ascending: false }),
      state.client.from("market_payouts").select("*"),
      state.client.rpc("list_monthly_allowance_activity"),
    ]);

    state.loading = false;

    const firstError = [
      profilesResult.error,
      marketsResult.error,
      outcomesResult.error,
      predictionsResult.error,
      payoutsResult.error,
      allowanceActivityResult.error,
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
    state.allowanceActivity = allowanceActivityResult.data || [];
    state.profile = state.profiles.find((profile) => profile.id === state.user.id) || null;

    if (!state.profile) {
      renderFatalError(
        new Error("Your profile was not created. Re-run database.sql in Supabase, then refresh."),
      );
      return;
    }

    await refreshNotificationData();
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
    const balance = Number(state.profile?.balance) || 0;
    const fullBalance = formatHeaderBalance(balance);
    dom.headerBalanceFull.textContent = fullBalance;
    dom.headerBalanceCompact.textContent = formatHeaderBalance(balance, true);
    dom.balanceButton.setAttribute(
      "aria-label",
      `Open account settings. Balance: ${fullBalance} points.`,
    );
    const isAdmin = Boolean(state.profile?.is_admin);
    dom.adminNavLink.classList.toggle("hidden", !isAdmin);
    dom.adminMobileNavLink.classList.toggle("hidden", !isAdmin);
    dom.mobileNav.classList.toggle("admin-visible", isAdmin);
  }

  async function refreshNotificationData() {
    if (!state.client || !state.user || state.notificationRefreshing) return;
    state.notificationRefreshing = true;

    const [preferencesResult, subscriptionsResult] = await Promise.all([
      state.client.rpc("get_my_notification_preferences"),
      state.client.rpc("list_my_push_subscriptions"),
    ]);

    state.notificationRefreshing = false;
    const firstError = [
      preferencesResult.error,
      subscriptionsResult.error,
    ].find(Boolean);

    if (firstError) {
      state.notificationAvailable = false;
      state.pushSubscriptions = [];
      updateHeader();
      return;
    }

    state.notificationAvailable = true;
    state.notificationPreferences = preferencesResult.data?.[0] || {
      new_market_push: false,
      closing_soon_push: false,
      resolution_push: false,
      active_subscription_count: 0,
    };
    state.pushSubscriptions = subscriptionsResult.data || [];
    updateHeader();
  }

  function hasConfiguredVapidKey() {
    return Boolean(
      typeof config.vapidPublicKey === "string" &&
      config.vapidPublicKey.length > 40 &&
      !config.vapidPublicKey.includes("YOUR-PUBLIC-VAPID-KEY")
    );
  }

  function isIosDevice() {
    const browserNavigator = window.navigator || {};
    return /iPad|iPhone|iPod/.test(browserNavigator.userAgent || "")
      || (browserNavigator.platform === "MacIntel" && browserNavigator.maxTouchPoints > 1);
  }

  function isStandaloneApp() {
    return Boolean(
      window.navigator?.standalone ||
      window.matchMedia?.("(display-mode: standalone)")?.matches
    );
  }

  function getPushCapability() {
    const browserNavigator = window.navigator || {};
    if (
      !("serviceWorker" in browserNavigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      return {
        available: false,
        message: "This browser does not support background push notifications.",
      };
    }

    if (isIosDevice() && !isStandaloneApp()) {
      return {
        available: false,
        message: "On iPhone or iPad, add The Friend Exchange to your Home Screen before enabling push.",
      };
    }

    if (!hasConfiguredVapidKey()) {
      return {
        available: false,
        message: "Push delivery has not been configured by the administrator yet.",
      };
    }

    if (window.Notification.permission === "denied") {
      return {
        available: false,
        message: "Notifications are blocked in this browser’s settings.",
      };
    }

    return {
      available: true,
      message: "This device is ready to receive Friend Exchange push notifications.",
    };
  }

  async function preparePushServiceWorker() {
    if (!("serviceWorker" in (window.navigator || {}))) return null;

    try {
      state.serviceWorkerRegistration = await window.navigator.serviceWorker.register(
        "service-worker.js",
        { scope: "./" },
      );
      return state.serviceWorkerRegistration;
    } catch {
      state.serviceWorkerRegistration = null;
      return null;
    }
  }

  async function getRawPushSubscription() {
    const registration = state.serviceWorkerRegistration || await preparePushServiceWorker();
    if (!registration?.pushManager) return null;
    return registration.pushManager.getSubscription();
  }

  function urlBase64ToUint8Array(value) {
    const padding = "=".repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
    const raw = window.atob(base64);
    return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
  }

  function pushSubscriptionUsesConfiguredKey(subscription) {
    const enrolledKey = subscription?.options?.applicationServerKey;
    if (!enrolledKey || !hasConfiguredVapidKey()) return false;
    const enrolledBytes = new Uint8Array(enrolledKey);
    const configuredBytes = urlBase64ToUint8Array(config.vapidPublicKey);
    return enrolledBytes.length === configuredBytes.length
      && enrolledBytes.every((byte, index) => byte === configuredBytes[index]);
  }

  async function getCurrentPushSubscription() {
    const subscription = await getRawPushSubscription();
    return pushSubscriptionUsesConfiguredKey(subscription) ? subscription : null;
  }

  function getDefaultDeviceLabel() {
    const userAgent = window.navigator?.userAgent || "";
    const displayName = String(state.profile?.display_name || "").trim();
    let browserName = "";
    let deviceName = "Browser device";

    if (/EdgA|EdgiOS|Edg\//i.test(userAgent)) browserName = "Edge";
    else if (/OPR\/|Opera/i.test(userAgent)) browserName = "Opera";
    else if (/CriOS|Chrome/i.test(userAgent)) browserName = "Chrome";
    else if (/FxiOS|Firefox/i.test(userAgent)) browserName = "Firefox";
    else if (/Safari/i.test(userAgent)) browserName = "Safari";

    if (/iPhone|iPod/i.test(userAgent)) deviceName = "iPhone";
    else if (/iPad/i.test(userAgent) || isIosDevice()) deviceName = "iPad";
    else if (/Android/i.test(userAgent) && /Mobile/i.test(userAgent)) deviceName = "Android phone";
    else if (/Android/i.test(userAgent)) deviceName = "Android tablet";
    else if (/Mac/i.test(userAgent)) deviceName = "Mac";
    else if (/Windows/i.test(userAgent)) deviceName = "Windows PC";

    if (displayName) {
      const personalizedDeviceName = deviceName === "Browser device" ? "browser" : deviceName;
      const ownerLabel = `${displayName}’s ${personalizedDeviceName}`;
      const isAppleMobileDevice = deviceName === "iPhone" || deviceName === "iPad";
      return browserName && !isAppleMobileDevice
        ? `${ownerLabel} · ${browserName}`
        : ownerLabel;
    }

    if (deviceName === "iPhone" || deviceName === "iPad") return deviceName;
    return browserName ? `${browserName} on ${deviceName}` : deviceName;
  }

  function getPushDeviceIcon(subscription) {
    const userAgent = String(subscription?.user_agent || "");
    const deviceLabel = String(subscription?.device_label || "");

    if (
      /iPad|Tablet/i.test(userAgent) ||
      (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent)) ||
      /iPad|tablet/i.test(deviceLabel)
    ) {
      return "fa-tablet-screen-button";
    }

    if (
      /iPhone|iPod|Mobile/i.test(userAgent) ||
      (/Android/i.test(userAgent) && /Mobile/i.test(userAgent)) ||
      /iPhone|phone|Pixel|Galaxy/i.test(deviceLabel)
    ) {
      return "fa-mobile-screen-button";
    }

    return "fa-laptop";
  }

  async function registerCurrentPushSubscription(deviceLabel) {
    const capability = getPushCapability();
    if (!capability.available) throw new Error(capability.message);

    const permission = await window.Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission was not granted.");
    }

    const registration = state.serviceWorkerRegistration || await preparePushServiceWorker();
    if (!registration) throw new Error("The notification service could not start on this device.");

    let subscription = await registration.pushManager.getSubscription();
    if (subscription && !pushSubscriptionUsesConfiguredKey(subscription)) {
      await state.client.rpc("unregister_push_subscription", {
        p_endpoint: subscription.endpoint,
      });
      await subscription.unsubscribe();
      subscription = null;
    }
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey),
      });
    }

    const serialized = subscription.toJSON();
    const { error } = await state.client.rpc("register_push_subscription", {
      p_endpoint: subscription.endpoint,
      p_p256dh: serialized.keys?.p256dh || "",
      p_auth: serialized.keys?.auth || "",
      p_device_label: String(deviceLabel || getDefaultDeviceLabel()).trim(),
      p_user_agent: window.navigator?.userAgent || null,
    });

    if (error) throw error;
    await refreshNotificationData();
    return subscription;
  }

  async function unregisterCurrentPushSubscription() {
    const subscription = await getRawPushSubscription();
    if (!subscription) return false;

    const { error } = await state.client.rpc("unregister_push_subscription", {
      p_endpoint: subscription.endpoint,
    });
    if (error) throw error;

    await subscription.unsubscribe();
    await refreshNotificationData();
    return true;
  }

  async function detachPushSubscriptionForSignOut() {
    try {
      const subscription = await getRawPushSubscription();
      if (!subscription) return;
      await state.client.rpc("unregister_push_subscription", {
        p_endpoint: subscription.endpoint,
      });
      await subscription.unsubscribe();
    } catch (error) {
      console.warn("Could not detach this device from push before sign-out.", error);
    }
  }

  function getPushHelpPlatform() {
    const userAgent = window.navigator?.userAgent || "";
    if (isIosDevice()) return "ios";
    if (/Android/i.test(userAgent)) return "android";
    return "computer";
  }

  function getPushSettingsStatus(currentSubscription) {
    if (currentSubscription) {
      const hasEnabledAlerts = Boolean(
        state.notificationPreferences.new_market_push
        || state.notificationPreferences.closing_soon_push
        || state.notificationPreferences.resolution_push
      );

      if (!hasEnabledAlerts) {
        return {
          helpTone: "is-warning",
          icon: "fa-toggle-off",
          heading: "Device enabled, alerts off",
          message: "This device is connected, but you haven’t selected any alert types.",
        };
      }

      return {
        helpTone: "is-ready",
        icon: "fa-circle-check",
        heading: "Enabled on this device",
        message: "Notifications can arrive on this device when your selected market events happen.",
      };
    }

    if (!state.notificationAvailable) {
      return {
        helpTone: "is-attention",
        icon: "fa-circle-exclamation",
        heading: "Push settings are temporarily unavailable",
        message: "Your profile and account settings still work. Try this Push notifications section again later.",
      };
    }

    if (isIosDevice() && !isStandaloneApp()) {
      return {
        helpTone: "is-attention",
        icon: "fa-house",
        iconBadge: "+",
        heading: "Add The Friend Exchange to your Home Screen first",
        message: "iPhone and iPad can receive push notifications only from the Home Screen web app.",
      };
    }

    if (window.Notification?.permission === "denied") {
      return {
        helpTone: "is-attention",
        icon: "fa-bell-slash",
        heading: "Notifications are blocked",
        message: "Allow notifications for The Friend Exchange in your browser or device settings, then return here.",
      };
    }

    const capability = getPushCapability();
    if (!capability.available) {
      return {
        helpTone: "is-attention",
        icon: "fa-circle-exclamation",
        heading: "Push notifications are not available here",
        message: capability.message,
      };
    }

    return {
      helpTone: "is-neutral",
      icon: "fa-toggle-off",
      heading: "Ready to enable",
      message: "This device supports push notifications. Name it below, then select Enable notifications.",
    };
  }

  function renderPushStatusIcon(pushStatus) {
    return `
      <span class="push-status-icon" aria-hidden="true">
        <i class="fa-solid ${pushStatus.icon}"></i>
        ${pushStatus.iconBadge ? `<span class="push-status-icon-badge">${escapeHtml(pushStatus.iconBadge)}</span>` : ""}
      </span>
    `;
  }

  function buildPushNotificationHelpMarkup(currentSubscription) {
    const platform = getPushHelpPlatform();
    const pushStatus = getPushSettingsStatus(currentSubscription);
    const openPlatform = (name) => platform === name ? " open" : "";

    return `
      <div class="modal-header">
        <div>
          <h2 id="push-notification-help-title">How push notifications work</h2>
          <p>Set up each phone, tablet, or browser separately. Your alert choices apply to every device you enable.</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <div class="modal-body push-notification-help-body">
        <div class="push-help-status ${pushStatus.helpTone}">
          ${renderPushStatusIcon(pushStatus)}
          <div>
            <strong>${escapeHtml(pushStatus.heading)}</strong>
            <p>${escapeHtml(pushStatus.message)}</p>
          </div>
        </div>

        <section class="push-help-section" aria-labelledby="push-help-setup-heading">
          <h3 id="push-help-setup-heading">How setup works</h3>
          <ol class="push-help-steps">
            <li><span>Give this device a name you’ll recognize.</span></li>
            <li><span>Select <strong>Enable notifications</strong>.</span></li>
            <li><span>Choose <strong>Allow</strong> when your device asks for permission.</span></li>
          </ol>
          <p>Once enabled, notifications can arrive even when The Friend Exchange isn’t open. Select one to open the related market.</p>
        </section>

        <section class="push-help-section" aria-labelledby="push-help-alerts-heading">
          <h3 id="push-help-alerts-heading">Your alert choices</h3>
          <div class="push-help-alerts">
            <div>
              <strong>New markets</strong>
              <p>When another trader lists a market.</p>
            </div>
            <div>
              <strong>Closing soon</strong>
              <p>One reminder—24 hours before longer markets and 1 hour before shorter ones.</p>
            </div>
            <div>
              <strong>Resolutions</strong>
              <p>When a market is resolved or voided.</p>
            </div>
          </div>
          <p>These choices apply to all your enabled devices. Turn off an alert and save your preferences to stop that type of notification everywhere.</p>
        </section>

        <section class="push-help-section" aria-labelledby="push-help-device-heading">
          <h3 id="push-help-device-heading">Device instructions</h3>
          <div class="push-help-platforms">
            <details${openPlatform("ios")}>
              <summary><span><i class="fa-brands fa-apple" aria-hidden="true"></i>iPhone &amp; iPad</span></summary>
              <div class="push-help-platform-copy">
                <p>Push notifications require iOS or iPadOS 16.4 or later, and The Friend Exchange must be added to your Home Screen.</p>
                <ol>
                  <li>Open The Friend Exchange in Safari.</li>
                  <li>Tap Share, then <strong>Add to Home Screen</strong>.</li>
                  <li>Turn on <strong>Open as Web App</strong>, then tap <strong>Add</strong>.</li>
                  <li>Open The Friend Exchange from its new Home Screen icon.</li>
                  <li>In The Friend Exchange, open Settings → Push notifications. Name this device, select <strong>Enable notifications</strong>, and choose <strong>Allow</strong>.</li>
                </ol>
                <div class="push-help-fix">
                  <strong>If notifications are blocked</strong>
                  <p>Open the Settings app on your iPhone or iPad, then go to Notifications → The Friend Exchange and turn on Allow Notifications.</p>
                </div>
              </div>
            </details>

            <details${openPlatform("android")}>
              <summary><span><i class="fa-brands fa-android" aria-hidden="true"></i>Android</span></summary>
              <div class="push-help-platform-copy">
                <ol>
                  <li>Open The Friend Exchange in your browser.</li>
                  <li>In The Friend Exchange, open Settings → Push notifications.</li>
                  <li>Name this device and select <strong>Enable notifications</strong>.</li>
                  <li>Choose <strong>Allow</strong> when your browser asks.</li>
                </ol>
                <p>You do not need to add The Friend Exchange to your Home Screen.</p>
                <div class="push-help-fix">
                  <strong>If notifications are blocked in Chrome</strong>
                  <p>Open The Friend Exchange, tap the site-information icon beside the address bar, then Permissions → Notifications → Allow.</p>
                </div>
              </div>
            </details>

            <details${openPlatform("computer")}>
              <summary><span><i class="fa-solid fa-laptop" aria-hidden="true"></i>Computer</span></summary>
              <div class="push-help-platform-copy">
                <p>Mac and Windows use the same setup:</p>
                <ol>
                  <li>Open The Friend Exchange in a supported browser.</li>
                  <li>In The Friend Exchange, open Settings → Push notifications.</li>
                  <li>Name this computer and select <strong>Enable notifications</strong>.</li>
                  <li>Choose <strong>Allow</strong> when your browser asks.</li>
                </ol>
                <p>Use a regular browser window—not a private or incognito window.</p>
                <div class="push-help-fix">
                  <strong>If notifications are blocked</strong>
                  <p><strong>Chrome or Edge:</strong> Select the site-information icon beside the address bar, find Notifications, and choose Allow. Then reload the page.</p>
                  <p><strong>Safari on Mac:</strong> Open Safari → Settings → Websites → Notifications, find The Friend Exchange, and choose Allow.</p>
                  <p><strong>Mac:</strong> If needed, also open Mac System Settings → Notifications and allow The Friend Exchange.</p>
                  <p><strong>Windows:</strong> Open Windows Settings → System → Notifications and make sure notifications are enabled for your browser.</p>
                </div>
              </div>
            </details>
          </div>
        </section>

        <aside class="push-help-note">
          <i class="fa-solid fa-lock" aria-hidden="true"></i>
          <div>
            <strong>A few things to know</strong>
            <p>Notification previews may show market details on your lock screen. You can hide previews or silence alerts in your device’s system notification and Focus settings.</p>
            <p>Signing out disables notifications in the browser or device you signed out of. Your other enabled devices remain connected.</p>
          </div>
        </aside>
      </div>
      <div class="modal-footer">
        <button class="button button-primary" id="push-notification-help-back" type="button">Back to device setup</button>
      </div>
    `;
  }

  function openPushNotificationHelpModal(currentSubscription) {
    openModal(buildPushNotificationHelpMarkup(currentSubscription), "push-notification-help-modal");
    document.querySelector(".push-notification-help-modal")?.setAttribute(
      "aria-labelledby",
      "push-notification-help-title",
    );
    document.querySelector("#push-notification-help-back")?.addEventListener("click", () => {
      const deviceNameField = document.querySelector("#notification-device-label");
      const returnFocusElement = deviceNameField && !deviceNameField.disabled
        ? deviceNameField
        : document.querySelector("#push-notification-help");
      closeModal({ returnFocusElement });
    });
  }

  function buildSettingsMarkup(currentSubscription) {
    const capability = getPushCapability();
    const preferences = state.notificationPreferences;
    const pushActive = Boolean(currentSubscription);
    const pushStatus = getPushSettingsStatus(currentSubscription);
    const currentDevice = state.pushSubscriptions.find(
      (subscription) => subscription.endpoint === currentSubscription?.endpoint,
    );
    const activePushDeviceCount = state.pushSubscriptions.length;
    const pushAlertScopeMessage = activePushDeviceCount === 0
      ? "These choices will apply when you enable a device."
      : activePushDeviceCount === 1
        ? "These choices apply to your enabled device."
        : `These choices apply to all ${formatNumber(activePushDeviceCount)} enabled devices.`;
    const notificationControlsAvailable = state.notificationAvailable;
    const deviceControlsAvailable = notificationControlsAvailable && (pushActive || capability.available);
    const profileIconChoices = buildProfileIconChoices(state.profile);
    const deviceRows = state.pushSubscriptions.map((subscription) => {
      const isCurrentDevice = subscription.endpoint === currentSubscription?.endpoint;
      const deviceIcon = getPushDeviceIcon(subscription);
      const lastSeen = subscription.last_seen_at
        ? formatRelativeDate(subscription.last_seen_at)
        : "recently";
      return `
        <div class="settings-device-row">
          <span class="settings-device-icon" aria-hidden="true">
            <i class="fa-solid ${deviceIcon}"></i>
          </span>
          <span class="settings-device-copy">
            <strong>${escapeHtml(subscription.device_label)}</strong>
            <small>Connected ${escapeHtml(lastSeen)}</small>
          </span>
          ${isCurrentDevice
            ? '<span class="tiny-pill notification-device-current">This device</span>'
            : `<button class="text-button notification-device-remove" type="button" data-remove-settings-push-subscription="${escapeAttribute(subscription.id)}">Remove device</button>`}
        </div>
      `;
    }).join("");

    return `
      <div class="page-header settings-page-header">
        <div>
          <p class="eyebrow">Settings</p>
          <h1>Your exchange, your rules.</h1>
          <p>Manage how you appear, what reaches your devices, and how you access your account.</p>
        </div>
      </div>

      <div class="settings-columns">
        <div class="settings-column">
          <form id="settings-profile-form" class="panel settings-card settings-profile-card">
            <div class="settings-card-heading">
              ${renderProfileAvatar(state.profile)}
              <div>
                <h2>${escapeHtml(state.profile?.display_name || "Trader")}’s Profile</h2>
              </div>
            </div>

            <div class="form-field">
              <label for="settings-profile-name">Display name</label>
              <input id="settings-profile-name" name="displayName" minlength="2" maxlength="32" autocomplete="nickname" value="${escapeAttribute(state.profile?.display_name || "")}" required />
            </div>

            <fieldset class="profile-icon-field" aria-describedby="settings-profile-icon-help">
              <legend>Profile icon</legend>
              <p id="settings-profile-icon-help">Choose how you appear across the exchange.</p>
              <div class="profile-icon-grid">
                ${profileIconChoices}
              </div>
            </fieldset>

            <div class="settings-card-actions">
              <button class="button button-primary" type="submit">Save profile</button>
            </div>
          </form>

          <section class="panel settings-card settings-account-card">
            <div class="settings-card-heading">
              <span class="settings-card-icon" aria-hidden="true"><i class="fa-solid fa-key"></i></span>
              <div>
                <h2>Account &amp; security</h2>
              </div>
            </div>
            <div class="settings-account-email">
              <span>Sign-in email</span>
              <strong>${escapeHtml(state.user?.email || "Unavailable")}</strong>
            </div>
            <div class="settings-card-actions settings-account-actions">
              <button class="button button-secondary" id="settings-reset-password" type="button">Reset password</button>
              <button class="button button-ghost" id="settings-sign-out" type="button">Sign out</button>
            </div>
          </section>
        </div>

        <div class="settings-column">
          <form id="notification-preferences-form" class="panel settings-card notification-settings">
            <div class="settings-card-heading notification-settings-heading">
              <span class="settings-card-icon" aria-hidden="true"><i class="fa-solid fa-bell"></i></span>
              <div>
                <h2>Push notifications</h2>
              </div>
              <button class="settings-push-help" id="push-notification-help" type="button" aria-label="How push notifications work" title="How push notifications work">
                <i class="fa-regular fa-circle-question settings-push-help-icon" aria-hidden="true"></i>
              </button>
            </div>

            <section class="notification-settings-section" aria-labelledby="settings-device-setup-heading">
              <div class="notification-settings-section-heading">
                <h3 id="settings-device-setup-heading">Set up this device</h3>
              </div>

              <div class="settings-push-status-summary ${pushStatus.helpTone}">
                ${renderPushStatusIcon(pushStatus)}
                <div>
                  <strong>${escapeHtml(pushStatus.heading)}</strong>
                  <p>${escapeHtml(pushStatus.message)}</p>
                </div>
              </div>

              <div class="settings-device-field">
                <div class="settings-device-field-copy">
                  <label for="notification-device-label">Device name</label>
                  <small id="notification-device-label-help">Helps you recognize this browser under Your push devices.</small>
                </div>
                <div class="settings-device-enrollment">
                <input
                  id="notification-device-label"
                  name="deviceLabel"
                  minlength="2"
                  maxlength="80"
                  value="${escapeAttribute(currentDevice?.device_label || getDefaultDeviceLabel())}"
                  aria-describedby="notification-device-label-help"
                  required
                  ${deviceControlsAvailable ? "" : "disabled"}
                />
                  <div class="settings-device-actions">
                    ${pushActive ? '<button class="button button-secondary" id="save-push-device-name" type="button" disabled>Save name</button>' : ""}
                    <button class="button ${pushActive ? "button-ghost" : "button-secondary"}" id="toggle-push-device" type="button" ${
                      deviceControlsAvailable ? "" : "disabled"
                    }>${pushActive ? "Disable on this device" : "Enable notifications"}</button>
                  </div>
                </div>
              </div>
            </section>

            <section class="notification-settings-section" aria-labelledby="settings-alert-choices-heading">
              <div class="notification-settings-section-heading">
                <h3 id="settings-alert-choices-heading">Choose your alerts</h3>
                <p id="settings-alert-choices-help">${escapeHtml(pushAlertScopeMessage)}</p>
              </div>

              <div class="notification-preference-grid" aria-describedby="settings-alert-choices-help">
                <label class="notification-preference">
                  <input type="checkbox" name="newMarket" ${preferences.new_market_push ? "checked" : ""} ${notificationControlsAvailable ? "" : "disabled"} />
                  <span><strong>New markets</strong><small>When a new market is listed.</small></span>
                </label>
                <label class="notification-preference">
                  <input type="checkbox" name="closingSoon" ${preferences.closing_soon_push ? "checked" : ""} ${notificationControlsAvailable ? "" : "disabled"} />
                  <span><strong>Closing soon</strong><small>One reminder before scheduled predictions close.</small></span>
                </label>
                <label class="notification-preference">
                  <input type="checkbox" name="resolution" ${preferences.resolution_push ? "checked" : ""} ${notificationControlsAvailable ? "" : "disabled"} />
                  <span><strong>Resolutions</strong><small>When a market resolves or is voided.</small></span>
                </label>
              </div>

              <div class="notification-settings-actions">
                <button class="button button-primary" id="save-notification-preferences" type="submit" disabled>Save alert choices</button>
              </div>
            </section>
          </form>

          <section class="panel settings-card settings-devices-card">
            <div class="settings-card-heading">
              <span class="settings-card-icon" aria-hidden="true"><i class="fa-solid fa-laptop"></i></span>
              <div>
                <h2>Your push devices</h2>
              </div>
            </div>
            <div class="settings-device-list">
              ${deviceRows || `
                <div class="notification-empty settings-device-empty">
                  <i class="fa-solid fa-mobile-screen" aria-hidden="true"></i>
                  <p>No devices are enrolled yet.</p>
                </div>
              `}
            </div>
          </section>

        </div>
      </div>
    `;
  }

  async function renderSettings() {
    dom.main.innerHTML = `
      <div class="page-header">
        <div>
          <p class="eyebrow">Settings</p>
          <h1>Preparing your controls…</h1>
        </div>
      </div>
      <div class="loading-grid">
        <div class="loading-card skeleton"></div>
        <div class="loading-card skeleton"></div>
      </div>
    `;

    await refreshNotificationData();
    const currentSubscription = await getCurrentPushSubscription();
    if (getRoute().page !== "settings") return;
    state.currentPushSubscriptionActive = Boolean(currentSubscription);
    state.currentPushSubscriptionEndpoint = currentSubscription?.endpoint || null;
    dom.main.innerHTML = buildSettingsMarkup(currentSubscription);
    bindSettingsEvents(currentSubscription);
    const pushSettings = document.querySelector("#notification-preferences-form");
    if (getRoute().id === "push" && typeof pushSettings?.scrollIntoView === "function") {
      pushSettings.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function bindSettingsEvents(currentSubscription) {
    const profileNameInput = document.querySelector("#settings-profile-name");
    const initialsPreview = document.querySelector(".settings-profile-card .profile-icon-initials");
    profileNameInput?.addEventListener("input", () => {
      if (initialsPreview) initialsPreview.textContent = initials(profileNameInput.value);
    });

    document.querySelector("#push-notification-help")?.addEventListener("click", () => {
      openPushNotificationHelpModal(currentSubscription);
    });

    const notificationPreferencesForm = document.querySelector("#notification-preferences-form");
    const notificationPreferencesSave = document.querySelector("#save-notification-preferences");
    const notificationPreferenceInputs = notificationPreferencesForm
      ? [...notificationPreferencesForm.querySelectorAll(".notification-preference input")]
      : [];
    const updateNotificationSaveState = () => {
      if (!notificationPreferencesSave || !notificationPreferencesForm) return;
      const form = new FormData(notificationPreferencesForm);
      const preferencesChanged = (
        (form.get("newMarket") === "on") !== Boolean(state.notificationPreferences.new_market_push)
        || (form.get("closingSoon") === "on") !== Boolean(state.notificationPreferences.closing_soon_push)
        || (form.get("resolution") === "on") !== Boolean(state.notificationPreferences.resolution_push)
      );
      notificationPreferencesSave.disabled = !state.notificationAvailable || !preferencesChanged;
    };
    notificationPreferenceInputs.forEach((input) => {
      input.addEventListener("change", updateNotificationSaveState);
    });

    const deviceNameInput = document.querySelector("#notification-device-label");
    if (currentSubscription && deviceNameInput) {
      const currentDevice = state.pushSubscriptions.find(
        (subscription) => subscription.endpoint === currentSubscription.endpoint,
      );
      let savedDeviceName = String(currentDevice?.device_label || getDefaultDeviceLabel()).trim();
      const saveDeviceNameButton = document.querySelector("#save-push-device-name");
      const updateDeviceNameSaveState = () => {
        const deviceName = String(deviceNameInput.value || "").trim();
        if (saveDeviceNameButton) {
          saveDeviceNameButton.disabled = deviceName === savedDeviceName
            || deviceName.length < 2
            || deviceName.length > 80;
        }
      };
      deviceNameInput.addEventListener("input", updateDeviceNameSaveState);
      saveDeviceNameButton?.addEventListener("click", async () => {
        const deviceName = String(deviceNameInput.value || "").trim();
        if (deviceName.length < 2 || deviceName.length > 80) {
          showToast("Use a device name between 2 and 80 characters.", "error");
          deviceNameInput.focus();
          return;
        }
        if (deviceName === savedDeviceName) return;

        setButtonLoading(saveDeviceNameButton, true, "Saving…");
        try {
          await registerCurrentPushSubscription(deviceName);
          savedDeviceName = deviceName;
          deviceNameInput.value = deviceName;
          showToast("Device name saved.", "success");
        } catch (error) {
          showToast(error.message || "The device name could not be updated.", "error");
        } finally {
          setButtonLoading(saveDeviceNameButton, false);
          updateDeviceNameSaveState();
        }
      });
    }

    document.querySelector("#settings-profile-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const name = String(form.get("displayName") || "").trim();
      const profileIcon = normalizeProfileIcon(form.get("profileIcon"));
      const button = event.currentTarget.querySelector("button[type='submit']");

      if (name.length < 2 || name.length > 32) {
        showToast("Use a display name between 2 and 32 characters.", "error");
        return;
      }

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

      await refreshData({ quiet: true });
      showToast("Profile updated.", "success");
    });

    document.querySelector("#toggle-push-device")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const deviceLabelInput = document.querySelector("#notification-device-label");
      const deviceLabel = String(deviceLabelInput?.value || "").trim();
      if (!currentSubscription && (deviceLabel.length < 2 || deviceLabel.length > 80)) {
        showToast("Use a device name between 2 and 80 characters.", "error");
        deviceLabelInput?.focus();
        return;
      }
      setButtonLoading(button, true, currentSubscription ? "Disabling…" : "Enabling…");
      try {
        if (currentSubscription) {
          await unregisterCurrentPushSubscription();
          showToast("Push notifications disabled on this device.", "success");
        } else {
          await registerCurrentPushSubscription(deviceLabel);
          showToast("Notifications enabled on this device.", "success");
        }
        await renderSettings();
      } catch (error) {
        setButtonLoading(button, false);
        showToast(error.message || "Push notifications could not be updated.", "error");
      }
    });

    notificationPreferencesForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const button = event.currentTarget.querySelector("button[type='submit']");
      setButtonLoading(button, true, "Saving…");
      const { error } = await state.client.rpc("update_my_notification_preferences", {
        p_new_market_push: form.get("newMarket") === "on",
        p_closing_soon_push: form.get("closingSoon") === "on",
        p_resolution_push: form.get("resolution") === "on",
      });
      setButtonLoading(button, false);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      await refreshNotificationData();
      showToast("Alert choices saved.", "success");
      await renderSettings();
    });

    document.querySelectorAll("[data-remove-settings-push-subscription]").forEach((button) => {
      button.addEventListener("click", () => {
        const subscription = state.pushSubscriptions.find(
          (item) => item.id === button.dataset.removeSettingsPushSubscription,
        );
        if (subscription) openRemovePushSubscriptionModal(subscription);
      });
    });

    document.querySelector("#settings-reset-password")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      setButtonLoading(button, true, "Sending…");
      const { error } = await state.client.auth.resetPasswordForEmail(state.user.email, {
        redirectTo: getPasswordResetRedirectUrl(),
      });
      setButtonLoading(button, false);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      showToast("Password-reset email sent.", "success");
    });

    document.querySelector("#settings-sign-out")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      setButtonLoading(button, true, "Signing out…");
      await detachPushSubscriptionForSignOut();
      const { error } = await state.client.auth.signOut();
      setButtonLoading(button, false);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      resetAppState();
      showAuth("login");
      showToast("Signed out. Your points are still imaginary, but safely stored.", "success");
    });
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

  function renderAllowanceNoticeContent(notice, dayOfMonth = new Date().getDate()) {
    const allowanceCount = Number(notice.allowanceCount) || 0;
    const pointsGranted = Number(notice.pointsGranted) || 0;
    const availableBalance = Number(notice.availableBalance) || 0;
    const normalizedDay = Number.isInteger(dayOfMonth) && dayOfMonth >= 1 && dayOfMonth <= 31
      ? dayOfMonth
      : 1;
    const ordinalDay = ORDINAL_DAY_WORDS[normalizedDay];
    const headingText = `Wake up, it’s the ${ordinalDay} of the month!`;
    const headingMarkup = normalizedDay === 1
      ? headingText
      : `Wake up, it’s the <s class="allowance-original-day" aria-hidden="true">first</s> ${ordinalDay} of the month!`;
    const body = allowanceCount > 1
      ? `While you were away, the Exchange issued ${formatNumber(pointsGranted)} points in monthly allowances. Your available balance is now ${formatNumber(availableBalance)} points.`
      : `Your continued market participation has earned you a ${formatNumber(pointsGranted)}-point monthly allowance. Your available balance is now ${formatNumber(availableBalance)} points.`;

    return `
      <div class="modal-header">
        <div>
          <p class="eyebrow">Monthly allowance</p>
          <h2 aria-label="${headingText}">${headingMarkup}</h2>
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
    const isFutureJwtError = String(error?.message || "")
      .toLowerCase()
      .includes("jwt issued at future");
    const heading = isFutureJwtError
      ? "The present is running slightly behind."
      : "The exchange has halted trading.";
    const message = isFutureJwtError
      ? "The server checking your sign-in is a few seconds behind the server that created it. Give them a moment to synchronize, then try again."
      : error.message || "Something went wrong while loading the data.";

    dom.main.innerHTML = `
      <section class="empty-state">
        <div class="empty-state-icon">!</div>
        <h2>${heading}</h2>
        <p>${escapeHtml(message)}</p>
        <button class="button button-primary" id="retry-button" type="button">Try again</button>
      </section>
    `;
    document.querySelector("#retry-button")?.addEventListener("click", () => refreshData());
  }

  function getRoute() {
    const clean = (window.location.hash || "#/markets").replace(/^#\/?/, "");
    const [page = "markets", id, subpage] = clean.split("/");
    return { page, id, subpage };
  }

  function renderRoute() {
    if (!state.profile || state.loading) return;

    const route = getRoute();
    setActiveNav(route.page);

    if (route.page !== "market") {
      state.marketActivityView = "recent";
      state.marketActivityMarketId = null;
    }

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
      case "settings":
        void renderSettings();
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
    const closeMode = market.close_mode || "date";
    const marketPredictions = state.predictions.filter((prediction) => prediction.market_id === market.id);
    const eligibilityCutoff = getTimestamp(market.eligibility_cutoff_at);
    const hasSettlementCutoff = market.status === "resolved" && Number.isFinite(eligibilityCutoff);
    const latePredictions = hasSettlementCutoff
      ? marketPredictions.filter(
          (prediction) => getTimestamp(prediction.created_at, 0) >= eligibilityCutoff,
        )
      : [];
    const latePredictionSet = new Set(latePredictions);
    const officialPredictions = hasSettlementCutoff
      ? marketPredictions.filter((prediction) => !latePredictionSet.has(prediction))
      : marketPredictions;
    const outcomes = state.outcomes
      .filter((outcome) => outcome.market_id === market.id)
      .map((outcome) => {
        const predictions = officialPredictions.filter((prediction) => prediction.outcome_id === outcome.id);
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

    const participants = new Set(officialPredictions.map((prediction) => prediction.user_id));
    const creator = state.profiles.find((profile) => profile.id === market.creator_id);
    const resolver = state.profiles.find((profile) => profile.id === market.resolved_by);
    const winner = outcomes.find((outcome) => outcome.id === market.winning_outcome_id) || null;
    const isPastClose = closeMode === "date" && getTimestamp(market.closes_at, Infinity) <= Date.now();
    const displayStatus = market.status === "open" && isPastClose ? "closed" : market.status;

    return {
      ...market,
      closeMode,
      outcomes,
      predictions: marketPredictions,
      officialPredictions,
      latePredictions,
      lateTotal: latePredictions.reduce((sum, prediction) => sum + prediction.amount, 0),
      actualTotal,
      participants: participants.size,
      creator,
      resolver,
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

  function isLatePrediction(prediction, market) {
    const cutoff = getTimestamp(market?.eligibility_cutoff_at);
    return Boolean(
      market?.status === "resolved" &&
      Number.isFinite(cutoff) &&
      getTimestamp(prediction?.created_at, 0) >= cutoff
    );
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
    const eligibilityCutoff = getTimestamp(market.eligibility_cutoff_at);
    let stopTimestamp;

    if (market.status === "open") {
      stopTimestamp = Number.isFinite(closesAt) ? Math.min(now, closesAt) : now;
    } else {
      const stopCandidates = Number.isFinite(eligibilityCutoff)
        ? [eligibilityCutoff]
        : [closesAt, resolvedAt].filter(Number.isFinite);
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
    const predictions = sortMarketPredictions(
      market.officialPredictions || market.predictions || [],
    );
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

  function buildHistoryLinePath(values, xForIndex, yForValue) {
    return values
      .map((value, index) => {
        const command = index === 0 ? "M" : "L";
        return `${command} ${xForIndex(index).toFixed(2)} ${yForValue(value).toFixed(2)}`;
      })
      .join(" ");
  }

  function buildHistoryRibbonPath(
    lowerValues,
    upperValues,
    xForIndex,
    yForPercent,
  ) {
    const lowerPath = lowerValues.map(
      (value, index) =>
        `${index === 0 ? "M" : "L"} ${xForIndex(index).toFixed(2)} ${yForPercent(value).toFixed(2)}`,
    );
    const upperPath = upperValues
      .map((value, index) => ({ value, index }))
      .reverse()
      .map(
        ({ value, index }) =>
          `L ${xForIndex(index).toFixed(2)} ${yForPercent(value).toFixed(2)}`,
      );
    return [...lowerPath, ...upperPath, "Z"].join(" ");
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
    const chartPoints = [
      timeline.points[0],
      ...timeline.points.filter((point) => point.eventIndex !== null),
    ];
    const tradeCount = timeline.events.length;
    const viewWidth = 1000;
    const visibleEvents = timeline.events;
    const selectedEvent = visibleEvents[visibleEvents.length - 1] || null;
    const currentOdds = chartPoints[chartPoints.length - 1]?.odds || new Map();
    const xForIndex = (index) =>
      (index / Math.max(tradeCount, 1)) * viewWidth;
    const yForPercent = (percent) => 100 - clamp(percent, 0, 100);
    const renderEventTarget = (event) => {
      const copy = getHistoryEventCopy(event, market);
      const color = getHistoryColor(market, event.outcomeId);
      const position = (xForIndex(event.index + 1) / viewWidth) * 100;
      return `
        <button
          type="button"
          class="odds-history-event-target"
          data-history-event="${event.index}"
          data-history-trade="${event.index + 1}"
          data-active="${String(selectedEvent?.index === event.index)}"
          style="--history-color:${color};--history-x:${position.toFixed(4)}%"
          aria-label="${escapeAttribute(copy.ariaLabel)}"
          aria-pressed="${String(selectedEvent?.index === event.index)}"
        >
          <span class="odds-history-event-dot" aria-hidden="true"></span>
        </button>
      `;
    };
    const cumulative = Array(chartPoints.length).fill(0);
    const layers = market.outcomes.map((outcome) => {
      const lower = [...cumulative];
      const upper = chartPoints.map((point, pointIndex) => {
        cumulative[pointIndex] += Number(point.odds.get(outcome.id) || 0);
        return cumulative[pointIndex];
      });
      return { outcome, lower, upper };
    });
    const gridLines = [0, 50, 100]
      .map((percent) => {
        const y = yForPercent(percent);
        return `<line class="odds-history-grid-line" x1="0" x2="${viewWidth}" y1="${y}" y2="${y}"></line>`;
      })
      .join("");
    const ribbonLayers = layers
      .map(({ outcome, lower, upper }, outcomeIndex) => {
        const color = getHistoryColor(market, outcome.id);
        const areaPath = buildHistoryRibbonPath(
          lower,
          upper,
          xForIndex,
          yForPercent,
        );
        const boundaryPath = buildHistoryLinePath(
          upper,
          xForIndex,
          yForPercent,
        );
        const boundary = outcomeIndex < layers.length - 1
          ? `
            <path
              class="odds-history-ribbon-boundary"
              data-history-boundary="${outcome.id}"
              d="${boundaryPath}"
              style="--history-color:${color}"
              aria-hidden="true"
            ></path>
          `
          : "";
        return `
          <path
            class="odds-history-ribbon"
            data-history-outcome="${outcome.id}"
            d="${areaPath}"
            style="--history-color:${color}"
          ></path>
          ${boundary}
        `;
      })
      .join("");
    const eventDots = visibleEvents.map(renderEventTarget).join("");
    const description = `Stacked odds ribbon showing all ${market.outcomes.length} outcomes from market open through the latest prediction.`;
    const caption = "Each dot is one prediction. Select a trade to see its timing and odds impact.";
    const legend = `
      <div class="odds-history-legend" aria-label="Chart outcomes">
        ${market.outcomes
          .map(
            (outcome) => `
              <button
                type="button"
                data-history-outcome-select="${outcome.id}"
                aria-pressed="false"
              >
                <i style="--history-color:${getHistoryColor(market, outcome.id)}" aria-hidden="true"></i>
                <span>${escapeHtml(outcome.label)}</span>
                <strong>${formatPercent(currentOdds.get(outcome.id))}</strong>
              </button>
            `,
          )
          .join("")}
      </div>
    `;

    return `
      <figure class="odds-history" id="odds-history-panel" data-history-mode="ribbon">
        <div class="odds-history-heading">
          <div>
            <p class="eyebrow">Trading record</p>
            <h3>Odds history</h3>
          </div>
        </div>
        ${legend}
        <div class="odds-history-chart">
          <div class="odds-history-plot">
            <div class="odds-history-y-axis" aria-hidden="true">
              <span>100%</span>
              <span>50%</span>
              <span>0%</span>
            </div>
            <svg
              viewBox="0 0 ${viewWidth} 100"
              preserveAspectRatio="none"
              role="img"
              aria-labelledby="odds-history-title-${market.id} odds-history-description-${market.id}"
            >
              <title id="odds-history-title-${market.id}">Community odds history</title>
              <desc id="odds-history-description-${market.id}">
                ${description}
              </desc>
              ${gridLines}
              ${ribbonLayers}
            </svg>
          </div>
          <div class="odds-history-trade-axis" aria-label="Prediction timeline">
            <span class="odds-history-trade-rail" aria-hidden="true"></span>
            ${eventDots}
          </div>
          <div class="odds-history-x-axis" aria-hidden="true">
            <span>Open</span>
            <span>Latest</span>
          </div>
        </div>
        <div class="odds-history-event" id="odds-history-detail" aria-live="polite">
          ${renderHistoryEventDetail(selectedEvent, market)}
        </div>
        <figcaption>
          ${caption}
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
      <section class="panel live-position" aria-labelledby="live-position-heading">
        <div class="panel-heading live-position-heading">
          <div>
            <h2 id="live-position-heading">Your live position</h2>
            <p>Based on the pool right now.</p>
          </div>
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
        <p class="live-position-note">Updates as predictions are added.</p>
      </section>
    `;
  }

  function formatTimelineMoment(value, fallback) {
    if (!value) return fallback;
    return Number.isFinite(getTimestamp(value)) ? formatDateTime(value) : fallback;
  }

  function renderMarketTimelineStep({
    state: stepState,
    title,
    time,
    detail,
    resultLabel = null,
    sourceUrl = null,
  }) {
    return `
      <li class="market-timeline-step is-${stepState}">
        <span class="market-timeline-marker" aria-hidden="true"></span>
        <div class="market-timeline-step-content">
          <strong>${escapeHtml(title)}</strong>
          <span class="market-timeline-time">${escapeHtml(time)}</span>
          ${resultLabel ? `<p class="market-timeline-result">Winner: <strong>${escapeHtml(resultLabel)}</strong>.</p>` : ""}
          ${detail ? `<p>${escapeHtml(detail)}</p>` : ""}
          ${sourceUrl ? `
            <a
              class="market-timeline-source"
              href="${escapeAttribute(sourceUrl)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              View result source
              <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
            </a>
          ` : ""}
        </div>
      </li>
    `;
  }

  function getResolvedSettlementSummary(market) {
    const eligibleTotal = Number(market.actualTotal || 0);
    const lateTotal = Number(market.lateTotal || 0);
    const winnerHasBacking = Number(market.winner?.actualPoints || 0) > 0;
    const parts = [];

    if (eligibleTotal <= 0) {
      parts.push("no points went to a winner");
    } else if (winnerHasBacking) {
      parts.push(
        `${formatNumber(eligibleTotal)} ${pluralize(eligibleTotal, "point")} paid to the winners`,
      );
    } else {
      parts.push(
        `${formatNumber(eligibleTotal)} ${pluralize(eligibleTotal, "point")} returned because nobody backed the winner`,
      );
    }

    if (lateTotal > 0) {
      parts.push(
        `${formatNumber(lateTotal)} ${pluralize(lateTotal, "point")} from late predictions refunded`,
      );
    }

    return `Payout complete: ${parts.join(" · ")}.`;
  }

  function renderMarketTimeline(market) {
    const openedAt = formatTimelineMoment(market.created_at, "Opening time not recorded");
    const closeMode = market.closeMode || market.close_mode || "date";
    const displayStatus = market.displayStatus || market.status;
    let subtitle;
    let steps;
    let summary;
    let summaryClass = "";

    const openedStep = {
      state: "complete",
      title: "Market opened",
      time: openedAt,
      detail: "Trading opened. Expertise was neither required nor verified.",
    };

    if (market.status === "void") {
      const refundTotal = (market.predictions || []).reduce(
        (total, prediction) => total + Number(prediction.amount || 0),
        0,
      );
      const archiveDetail = market.archived_at
        ? ` Archived ${formatDateTime(market.archived_at)}.`
        : "";
      subtitle = "What happened and how the points got home.";
      steps = [
        openedStep,
        {
          state: "complete",
          title: "Cancellation & refunds",
          time: formatTimelineMoment(market.resolved_at, "Cancellation time not recorded"),
          detail: refundTotal > 0
            ? `The market was cancelled, so all ${formatNumber(refundTotal)} ${pluralize(refundTotal, "point")} went back to their owners.${archiveDetail}`
            : `The market was cancelled before anyone put points on it.${archiveDetail}`,
        },
      ];
      summary = "Nobody won. Everyone got their points back.";
      summaryClass = " is-refund";
    } else if (displayStatus === "resolved") {
      const cutoffAt =
        market.eligibility_cutoff_at || market.outcome_known_at || market.closes_at;
      const resolvedAt = formatTimelineMoment(
        market.resolved_at,
        "Result time not recorded",
      );
      const resolverSuffix = market.resolver?.display_name
        ? ` · by ${market.resolver.display_name}`
        : "";
      const winnerLabel = market.winner?.label || "Resolved";
      const resolutionDetail = market.resolution_note || "";
      let cutoffDetail;

      if (closeMode === "date") {
        const knownTimestamp = market.outcome_known_at
          ? getTimestamp(market.outcome_known_at, NaN)
          : NaN;
        const closeTimestamp = market.closes_at
          ? getTimestamp(market.closes_at, NaN)
          : NaN;
        const hasKnownTime = Number.isFinite(knownTimestamp);
        const hasScheduledClose = Number.isFinite(closeTimestamp);

        if (hasKnownTime && hasScheduledClose && closeTimestamp < knownTimestamp) {
          cutoffDetail =
            `Predictions closed as scheduled on ${formatDateTime(market.closes_at)}. ` +
            `The outcome became known later on ${formatDateTime(market.outcome_known_at)}.`;
        } else if (hasKnownTime && hasScheduledClose && knownTimestamp < closeTimestamp) {
          cutoffDetail =
            "The outcome became known before predictions were scheduled to close. " +
            "Predictions made from that point on didn’t count and were refunded.";
        } else if (hasKnownTime && hasScheduledClose) {
          cutoffDetail = "The outcome became known as predictions closed.";
        } else if (hasKnownTime) {
          cutoffDetail =
            "The scheduled close wasn’t recorded. Predictions made from the time the outcome became known didn’t count and were refunded.";
        } else {
          cutoffDetail = "Predictions closed as scheduled. The time the outcome became known wasn’t recorded.";
        }
      } else {
        cutoffDetail =
          "The outcome became known at this time. Predictions made from that point on didn’t count and were refunded.";
      }

      subtitle = "When it opened, what happened, and where the points went.";
      steps = [
        openedStep,
        {
          state: "complete",
          title: "Prediction cutoff",
          time: formatTimelineMoment(cutoffAt, "Prediction cutoff time not recorded"),
          detail: cutoffDetail,
          sourceUrl: market.resolution_source_url,
        },
        {
          state: "complete",
          title: "Result & payout",
          time: `${resolvedAt}${resolverSuffix}`,
          detail: resolutionDetail,
          resultLabel: winnerLabel,
        },
      ];
      summary = getResolvedSettlementSummary(market);
      summaryClass = " is-complete";
    } else if (closeMode === "outcome") {
      subtitle = "Predictions stay open until someone makes the result official. Hindsight still doesn’t count.";
      steps = [
        openedStep,
        {
          state: "current",
          title: "Prediction cutoff",
          time: "When the outcome becomes known",
          detail:
            "At resolution, the time the outcome became known is recorded. Predictions made from that point on don’t count and are refunded.",
        },
        {
          state: "pending",
          title: "Result & payout",
          time: "When the market is resolved",
          detail:
            "The pool is paid out to the winners right away. Points from late predictions are refunded at the same time.",
        },
      ];
      summary =
        "You can add more points—or quietly back another outcome—but committed points can’t be withdrawn.";
    } else {
      const tradingClosed = displayStatus === "closed";
      const scheduledClose = formatTimelineMoment(
        market.closes_at,
        "Scheduled close not recorded",
      );
      subtitle = tradingClosed
        ? "Predictions are closed. Now we wait for the final call."
        : "Predictions close on schedule. If the answer gets out first, hindsight doesn’t count.";
      steps = [
        openedStep,
        {
          state: tradingClosed ? "complete" : "current",
          title: "Prediction cutoff",
          time: scheduledClose,
          detail:
            "Predictions close at this time unless the outcome is known sooner. If that happens, only earlier predictions count.",
        },
        {
          state: tradingClosed ? "current" : "pending",
          title: "Result & payout",
          time: "When the market is resolved",
          detail:
            "The result and the time it became known are recorded. Then the pool is paid out to the winners, and points from late predictions are refunded.",
        },
      ];
      summary = tradingClosed
        ? "Committed points stay put until the result is made official."
        : "You can add more points—or quietly back another outcome—but committed points can’t be withdrawn.";
    }

    return `
      <section class="panel market-timeline-panel" aria-labelledby="market-timeline-heading">
        <div class="panel-heading market-timeline-heading">
          <div>
            <h2 id="market-timeline-heading">Timeline &amp; payout</h2>
            <p>${escapeHtml(subtitle)}</p>
          </div>
        </div>
        <ol class="market-timeline-list">
          ${steps.map(renderMarketTimelineStep).join("")}
        </ol>
        <p class="market-timeline-summary${summaryClass}">${escapeHtml(summary)}</p>
      </section>
    `;
  }

  const ACTIVITY_DESKTOP_LIMIT = 8;
  const ACTIVITY_MOBILE_LIMIT = 3;
  const ACTIVITY_EXPANDED_LIMIT = 20;
  const ACTIVITY_CLOSE_RESOLUTION_GAP = 5 * 60 * 1000;
  const JOINED_ACTIVITY_SUMMARIES = Object.freeze([
    "A new source of market volatility has arrived",
    "The exchange welcomes another unlicensed expert",
    "Now authorized to be publicly wrong",
    "1,000 points of fictional capital issued",
    "Account opened with 1,000 imaginary points",
  ]);

  function getJoinedActivitySummary(profile) {
    const key = String(profile?.id || profile?.created_at || "new-trader");
    let hash = 0;
    for (let index = 0; index < key.length; index += 1) {
      hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
    }
    return JOINED_ACTIVITY_SUMMARIES[hash % JOINED_ACTIVITY_SUMMARIES.length];
  }

  function getVisibleActivityMarkets(allMarkets) {
    return allMarkets.filter((market) => {
      if (!market.archived_at) return true;
      return (
        state.profile.is_admin ||
        market.predictions.some(
          (prediction) => prediction.user_id === state.user.id,
        )
      );
    });
  }

  function getLeadingOutcomeIds(odds) {
    const entries = [...odds.entries()];
    if (!entries.length) return [];
    const highest = Math.max(...entries.map(([, percent]) => Number(percent || 0)));
    return entries
      .filter(([, percent]) => Math.abs(Number(percent || 0) - highest) < 0.0001)
      .map(([outcomeId]) => outcomeId);
  }

  function buildPredictionActivityEvents(market) {
    const predictions = sortMarketPredictions(market.predictions || []);
    const officialPredictionSet = new Set(
      market.officialPredictions || market.predictions || [],
    );
    const historyEventByPrediction = new Map(
      buildMarketOddsTimeline(market).events.map((event) => [event.prediction, event]),
    );
    const userOutcomes = new Map();
    const positionTotals = new Map();
    const outcomeTotals = new Map(
      market.outcomes.map((outcome) => [outcome.id, 0]),
    );
    let poolTotal = 0;

    return predictions
      .map((prediction) => {
        const timestamp = getTimestamp(prediction.created_at);
        if (!Number.isFinite(timestamp)) return null;

        const profile = state.profiles.find(
          (item) => item.id === prediction.user_id,
        );
        const outcome = market.outcomes.find(
          (item) => item.id === prediction.outcome_id,
        );
        const seenOutcomes = userOutcomes.get(prediction.user_id) || new Set();
        const alreadyBackedOutcome = seenOutcomes.has(prediction.outcome_id);
        const alreadyBackedMarket = seenOutcomes.size > 0;
        const actionKind = alreadyBackedOutcome
          ? "added"
          : alreadyBackedMarket
            ? "also-backed"
            : "backed";

        seenOutcomes.add(prediction.outcome_id);
        userOutcomes.set(prediction.user_id, seenOutcomes);

        const positionKey = `${prediction.user_id}:${market.id}:${prediction.outcome_id}`;
        const positionAfter =
          Number(positionTotals.get(positionKey) || 0) +
          Number(prediction.amount || 0);
        positionTotals.set(positionKey, positionAfter);

        const late = isLatePrediction(prediction, market);
        const official = officialPredictionSet.has(prediction);
        const insights = [];
        let summary = "";
        let tone = "";

        if (market.status === "void") {
          summary = `Market voided · ${formatNumber(prediction.amount)} pts refunded`;
          tone = "refund";
        } else if (late) {
          summary = `Didn’t count · Submitted after the outcome was known · ${formatNumber(prediction.amount)} pts refunded`;
          tone = "refund";
        } else if (official) {
          const outcomeTotalBefore = Number(
            outcomeTotals.get(prediction.outcome_id) || 0,
          );
          const poolBefore = poolTotal;
          const historyEvent = historyEventByPrediction.get(prediction);

          if (historyEvent) {
            const leadersBefore = getLeadingOutcomeIds(historyEvent.beforeOdds);
            const leadersAfter = getLeadingOutcomeIds(historyEvent.afterOdds);
            const tookLead =
              leadersAfter.length === 1 &&
              leadersAfter[0] === prediction.outcome_id &&
              !(leadersBefore.length === 1 && leadersBefore[0] === prediction.outcome_id);

            if (tookLead) {
              insights.push(`${outcome?.label || "Outcome"} took the lead`);
            } else if (outcomeTotalBefore === 0) {
              insights.push(`First points committed to ${outcome?.label || "this outcome"}`);
            } else if (Math.abs(historyEvent.delta) >= 10) {
              insights.push(
                `Community odds ${formatPercent(historyEvent.fromPercent)} → ${formatPercent(historyEvent.toPercent)}`,
              );
            }
          }

          poolTotal += Number(prediction.amount || 0);
          outcomeTotals.set(
            prediction.outcome_id,
            outcomeTotalBefore + Number(prediction.amount || 0),
          );

          if (poolBefore < 1000 && poolTotal >= 1000) {
            insights.unshift("The pool crossed 1,000 pts");
          }
        }

        return {
          id: `prediction:${prediction.id || `${market.id}:${timestamp}`}`,
          type: "prediction",
          timestamp,
          timestampIso: prediction.created_at,
          actor: profile || null,
          market,
          outcome,
          prediction,
          actionKind,
          positionKey,
          positionAfter,
          isEligiblePosition: official && !late && market.status !== "void",
          summary,
          insights,
          tone,
          sortPriority: 40,
        };
      })
      .filter(Boolean);
  }

  function getActivityLeaderSnapshot(metricsByUser) {
    const rows = state.profiles.map((profile) => {
      const metrics = metricsByUser.get(profile.id) || {
        profitLoss: 0,
        resolvedCommitted: 0,
      };
      return {
        profile,
        profitLoss: metrics.profitLoss,
        resolvedCommitted: metrics.resolvedCommitted,
        realizedReturn: metrics.resolvedCommitted > 0
          ? metrics.profitLoss / metrics.resolvedCommitted
          : null,
      };
    });
    if (!rows.length) return { ids: new Set(), rows: [] };

    const compare = (a, b) => {
      if (a.profitLoss !== b.profitLoss) return b.profitLoss - a.profitLoss;
      if (a.realizedReturn === null && b.realizedReturn !== null) return 1;
      if (a.realizedReturn !== null && b.realizedReturn === null) return -1;
      if (a.realizedReturn !== b.realizedReturn) {
        return (b.realizedReturn ?? 0) - (a.realizedReturn ?? 0);
      }
      return b.resolvedCommitted - a.resolvedCommitted;
    };
    const sorted = [...rows].sort(compare);
    const leader = sorted[0];
    const leaders = sorted.filter(
      (row) =>
        row.profitLoss === leader.profitLoss &&
        row.realizedReturn === leader.realizedReturn &&
        row.resolvedCommitted === leader.resolvedCommitted,
    );

    return {
      ids: new Set(leaders.map((row) => row.profile.id)),
      rows: leaders,
    };
  }

  function activityLeaderSetsMatch(first, second) {
    return (
      first.size === second.size &&
      [...first].every((value) => second.has(value))
    );
  }

  function addRobberBaronHighlights(events, markets) {
    const resultEventByMarket = new Map(
      events
        .filter((event) => event.type === "resolved")
        .map((event) => [event.market.id, event]),
    );
    const resolvedMarkets = markets
      .filter(
        (market) =>
          market.status === "resolved" &&
          Number.isFinite(getTimestamp(market.resolved_at)),
      )
      .sort((a, b) => {
        const timeDifference =
          getTimestamp(a.resolved_at, 0) - getTimestamp(b.resolved_at, 0);
        return timeDifference || Number(a.id || 0) - Number(b.id || 0);
      });
    const metricsByUser = new Map();
    let previousLeaders = getActivityLeaderSnapshot(metricsByUser);

    resolvedMarkets.forEach((market) => {
      const committedByUser = new Map();
      (market.officialPredictions || []).forEach((prediction) => {
        committedByUser.set(
          prediction.user_id,
          Number(committedByUser.get(prediction.user_id) || 0) +
            Number(prediction.amount || 0),
        );
      });
      const payoutByUser = new Map();
      state.payouts
        .filter(
          (payout) =>
            payout.market_id === market.id && payout.kind !== "late_refund",
        )
        .forEach((payout) => {
          payoutByUser.set(
            payout.user_id,
            Number(payoutByUser.get(payout.user_id) || 0) +
              Number(payout.amount || 0),
          );
        });
      const affectedUsers = new Set([
        ...committedByUser.keys(),
        ...payoutByUser.keys(),
      ]);

      affectedUsers.forEach((userId) => {
        const previous = metricsByUser.get(userId) || {
          profitLoss: 0,
          resolvedCommitted: 0,
        };
        const committed = Number(committedByUser.get(userId) || 0);
        const payout = Number(payoutByUser.get(userId) || 0);
        metricsByUser.set(userId, {
          profitLoss: previous.profitLoss + payout - committed,
          resolvedCommitted: previous.resolvedCommitted + committed,
        });
      });

      const nextLeaders = getActivityLeaderSnapshot(metricsByUser);
      const resultEvent = resultEventByMarket.get(market.id);
      if (
        resultEvent &&
        !activityLeaderSetsMatch(previousLeaders.ids, nextLeaders.ids) &&
        nextLeaders.rows.length
      ) {
        if (nextLeaders.rows.length === 1) {
          const leader = nextLeaders.rows[0];
          const wasAlreadyLeading = previousLeaders.ids.has(leader.profile.id);
          resultEvent.insights.push(
            `${leader.profile.display_name} ${wasAlreadyLeading ? "is now the sole" : "is the new"} robber baron · ${leader.profitLoss > 0 ? "+" : ""}${formatNumber(leader.profitLoss)} pts profit / loss`,
          );
        } else {
          const names = nextLeaders.rows
            .map((row) => row.profile.display_name)
            .sort((a, b) => a.localeCompare(b));
          const leaderLabel = names.length > 2
            ? `${names.length}-way tie`
            : names.join(" & ");
          resultEvent.insights.push(
            `${leaderLabel} for robber baron · ${nextLeaders.rows[0].profitLoss > 0 ? "+" : ""}${formatNumber(nextLeaders.rows[0].profitLoss)} pts profit / loss`,
          );
        }
      }

      previousLeaders = nextLeaders;
    });
  }

  function markLargestPositionActivity(events) {
    const eligiblePositions = events.filter(
      (event) => event.type === "prediction" && event.isEligiblePosition,
    );
    const largestPosition = eligiblePositions.length
      ? Math.max(...eligiblePositions.map((event) => event.positionAfter))
      : 0;
    if (largestPosition <= 0) return;

    eligiblePositions
      .filter((event) => event.positionAfter === largestPosition)
      .forEach((event) => {
        event.insights.unshift(
          `Exchange’s largest position · ${formatNumber(largestPosition)} pts total`,
        );
      });
  }

  function buildExchangeActivityEvents(allMarkets = getAllMarkets()) {
    const markets = getVisibleActivityMarkets(allMarkets);
    const events = [];
    const now = Date.now();

    state.allowanceActivity.forEach((allowance) => {
      const timestamp = getTimestamp(allowance.credited_at);
      const amountPerTrader = Number(allowance.amount_per_trader || 0);
      const traderCount = Number(allowance.trader_count || 0);
      if (
        !Number.isFinite(timestamp) ||
        amountPerTrader <= 0 ||
        traderCount <= 0
      ) return;

      events.push({
        id: `allowance:${allowance.allowance_period}`,
        type: "allowance",
        timestamp,
        timestampIso: allowance.credited_at,
        allowanceMonth: formatAllowanceMonth(allowance.allowance_period),
        context: "Another round of fictional capital has entered circulation.",
        summary: `${formatNumber(amountPerTrader)} pts credited to ${formatNumber(traderCount)} active ${pluralize(traderCount, "trader")}`,
        insights: [],
        sortPriority: 70,
      });
    });

    state.profiles.forEach((profile) => {
      const timestamp = getTimestamp(profile.created_at);
      if (!Number.isFinite(timestamp)) return;
      events.push({
        id: `joined:${profile.id}`,
        type: "joined",
        timestamp,
        timestampIso: profile.created_at,
        actor: profile,
        summary: getJoinedActivitySummary(profile),
        insights: [],
        sortPriority: 10,
      });
    });

    markets.forEach((market) => {
      const createdAt = getTimestamp(market.created_at);
      if (Number.isFinite(createdAt)) {
        const closeSummary = market.closeMode === "outcome"
          ? "Open until the result is known"
          : Number.isFinite(getTimestamp(market.closes_at))
            ? `Scheduled close · ${formatDateTime(market.closes_at)}`
            : "Predictions opened";
        events.push({
          id: `opened:${market.id}`,
          type: "opened",
          timestamp: createdAt,
          timestampIso: market.created_at,
          actor: market.creator || null,
          market,
          summary: closeSummary,
          insights: [],
          sortPriority: 20,
        });
      }

      events.push(...buildPredictionActivityEvents(market));

      const resolvedAt = getTimestamp(market.resolved_at);
      const closeAt = market.status === "resolved"
        ? getTimestamp(market.eligibility_cutoff_at, getTimestamp(market.closes_at))
        : getTimestamp(market.closes_at);
      const closeIsSeparate =
        !Number.isFinite(resolvedAt) ||
        Math.abs(resolvedAt - closeAt) >= ACTIVITY_CLOSE_RESOLUTION_GAP;
      if (
        market.closeMode === "date" &&
        Number.isFinite(closeAt) &&
        closeAt <= now &&
        closeIsSeparate
      ) {
        const eligibleAtClose = (market.predictions || []).filter(
          (prediction) => getTimestamp(prediction.created_at, Infinity) < closeAt,
        );
        const closePool = eligibleAtClose.reduce(
          (sum, prediction) => sum + Number(prediction.amount || 0),
          0,
        );
        const closeParticipants = new Set(
          eligibleAtClose.map((prediction) => prediction.user_id),
        ).size;
        const closeSummary = closePool > 0
          ? `${formatNumber(closePool)} pts committed by ${closeParticipants} ${pluralize(closeParticipants, "trader")}${market.displayStatus === "closed" ? " · Awaiting reality" : ""}`
          : `No points were committed${market.displayStatus === "closed" ? " · Awaiting reality" : ""}`;
        events.push({
          id: `closed:${market.id}`,
          type: "closed",
          timestamp: closeAt,
          timestampIso: new Date(closeAt).toISOString(),
          actor: null,
          market,
          summary: closeSummary,
          insights: [],
          sortPriority: 30,
        });
      }

      if (market.status === "resolved" && Number.isFinite(resolvedAt)) {
        const winnerPayouts = state.payouts.filter(
          (payout) => payout.market_id === market.id && payout.kind === "winner",
        );
        const noWinnerRefunds = state.payouts.filter(
          (payout) =>
            payout.market_id === market.id && payout.kind === "no_winner_refund",
        );
        const payoutTotal = winnerPayouts.reduce(
          (sum, payout) => sum + Number(payout.amount || 0),
          0,
        );
        const refundTotal = noWinnerRefunds.reduce(
          (sum, payout) => sum + Number(payout.amount || 0),
          0,
        );
        let resultSummary;
        if (market.actualTotal === 0) {
          resultSummary = "No points were committed. Reality proceeded anyway.";
        } else if (!market.winner || Number(market.winner.actualPoints || 0) === 0) {
          resultSummary = `Nobody backed it · ${formatNumber(refundTotal || market.actualTotal)} pts refunded`;
        } else if (winnerPayouts.length === 1) {
          const recipient = state.profiles.find(
            (profile) => profile.id === winnerPayouts[0].user_id,
          );
          resultSummary = `${formatNumber(payoutTotal || market.actualTotal)} pts distributed to ${recipient?.display_name || "1 winner"}`;
        } else {
          resultSummary = `${formatNumber(payoutTotal || market.actualTotal)} pts distributed among ${winnerPayouts.length} winners`;
        }
        const insights = market.lateTotal > 0
          ? [`${formatNumber(market.lateTotal)} late pts refunded`]
          : [];
        events.push({
          id: `resolved:${market.id}`,
          type: "resolved",
          timestamp: resolvedAt,
          timestampIso: market.resolved_at,
          actor: market.resolver || null,
          market,
          outcome: market.winner || null,
          summary: resultSummary,
          insights,
          sortPriority: 60,
        });
      }

      if (market.status === "void" && Number.isFinite(resolvedAt)) {
        const voidRefunds = state.payouts.filter(
          (payout) => payout.market_id === market.id && payout.kind === "void_refund",
        );
        const refundTotal = voidRefunds.reduce(
          (sum, payout) => sum + Number(payout.amount || 0),
          0,
        );
        const voidSummary = refundTotal > 0
          ? `${formatNumber(refundTotal)} pts refunded to ${voidRefunds.length} ${pluralize(voidRefunds.length, "trader")}`
          : "No points required refunding";
        events.push({
          id: `void:${market.id}`,
          type: "void",
          timestamp: resolvedAt,
          timestampIso: market.resolved_at,
          actor: null,
          market,
          summary: voidSummary,
          insights: [],
          tone: "refund",
          sortPriority: 60,
        });
      }
    });

    markLargestPositionActivity(events);
    addRobberBaronHighlights(events, markets);

    return events.sort((a, b) => {
      const timeDifference = b.timestamp - a.timestamp;
      if (timeDifference !== 0) return timeDifference;
      const priorityDifference = (b.sortPriority || 0) - (a.sortPriority || 0);
      if (priorityDifference !== 0) return priorityDifference;
      return String(b.id).localeCompare(String(a.id));
    });
  }

  function renderExchangeActivityPrimary(event) {
    const name = escapeHtml(event.actor?.display_name || "Unknown trader");
    const outcome = escapeHtml(event.outcome?.label || "an outcome");

    switch (event.type) {
      case "prediction":
        if (event.actionKind === "added") {
          return `<strong>${name}</strong><span> added more to </span><strong>${outcome}</strong><span> </span><span class="exchange-activity-amount" aria-hidden="true">(${formatNumber(event.prediction.amount)})</span><span class="visually-hidden"> (${formatNumber(event.prediction.amount)} points)</span>`;
        }
        if (event.actionKind === "also-backed") {
          return `<strong>${name}</strong><span> also backed </span><strong>${outcome}</strong><span> </span><span class="exchange-activity-amount" aria-hidden="true">(${formatNumber(event.prediction.amount)})</span><span class="visually-hidden"> (${formatNumber(event.prediction.amount)} points)</span>`;
        }
        return `<strong>${name}</strong><span> backed </span><strong>${outcome}</strong><span> </span><span class="exchange-activity-amount" aria-hidden="true">(${formatNumber(event.prediction.amount)})</span><span class="visually-hidden"> (${formatNumber(event.prediction.amount)} points)</span>`;
      case "opened":
        return event.actor
          ? `<strong>${name}</strong><span> opened a market</span>`
          : "<strong>A market opened</strong>";
      case "closed":
        return "<strong>Predictions closed</strong>";
      case "resolved":
        return `<strong>Result official: ${outcome}</strong>`;
      case "void":
        return "<strong>Market voided</strong>";
      case "allowance":
        return `<strong>${escapeHtml(event.allowanceMonth)} allowances issued</strong>`;
      case "joined":
        return `<strong>${name}</strong><span> entered the exchange</span>`;
      default:
        return "<strong>Exchange activity</strong>";
    }
  }

  function renderExchangeActivityIcon(event) {
    const icon = event.type === "allowance"
      ? "piggy-bank"
      : event.type === "closed"
        ? "lock"
        : event.type === "resolved"
          ? "stamp"
          : event.type === "void"
            ? "ban"
            : null;
    if (!icon && event.actor) return renderProfileAvatar(event.actor);
    return `
      <span class="exchange-activity-system-icon" aria-hidden="true">
        <i class="fa-solid fa-${icon || "check"}"></i>
      </span>
    `;
  }

  function renderExchangeActivityEvent(event, index) {
    const tag = event.market ? "a" : "div";
    const href = event.market ? ` href="#/market/${event.market.id}"` : "";
    const context = event.market?.question || event.context || "";
    const details = [event.summary, ...(event.insights || [])]
      .filter(Boolean)
      .slice(0, 2);
    const limitClasses = [
      index >= ACTIVITY_MOBILE_LIMIT ? "is-after-mobile-limit" : "",
      index >= ACTIVITY_DESKTOP_LIMIT ? "is-after-desktop-limit" : "",
    ].filter(Boolean).join(" ");
    return `
      <${tag} class="exchange-activity-item${event.tone ? ` is-${event.tone}` : ""}${limitClasses ? ` ${limitClasses}` : ""}"${href}>
        ${renderExchangeActivityIcon(event)}
        <span class="exchange-activity-copy">
          <span class="exchange-activity-primary">${renderExchangeActivityPrimary(event)}</span>
          ${context ? `<span class="exchange-activity-market">${escapeHtml(context)}</span>` : ""}
          ${details.map((detail) => `<span class="exchange-activity-detail">${escapeHtml(detail)}</span>`).join("")}
          <time datetime="${escapeAttribute(event.timestampIso)}" title="${escapeAttribute(formatDateTime(event.timestampIso))}">${formatRelativeDate(event.timestampIso)}</time>
        </span>
      </${tag}>
    `;
  }

  function renderExchangeActivityToggle(variant) {
    return `
      <button
        class="exchange-activity-toggle exchange-activity-toggle-${variant}"
        data-exchange-activity-toggle
        type="button"
        aria-expanded="${String(state.activityExpanded)}"
      >${state.activityExpanded ? "Show less" : "Show more"}</button>
    `;
  }

  function renderExchangeActivityPanel(events) {
    const recentEvents = events.slice(0, ACTIVITY_EXPANDED_LIMIT);
    const panelClasses = [
      "exchange-activity-panel",
      "panel",
      state.activityExpanded ? "is-expanded" : "",
      recentEvents.length > ACTIVITY_DESKTOP_LIMIT ? "has-desktop-overflow" : "",
      recentEvents.length > ACTIVITY_MOBILE_LIMIT ? "has-mobile-overflow" : "",
    ].filter(Boolean).join(" ");

    return `
      <aside class="${panelClasses}" aria-labelledby="exchange-activity-heading">
        <div class="exchange-activity-heading">
          <div>
            <p class="eyebrow">Across the exchange</p>
            <h2 id="exchange-activity-heading">Recent activity</h2>
          </div>
          <i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>
        </div>
        <p class="exchange-activity-intro">
          Fresh positions, official results, and other developments of zero economic importance.
        </p>
        ${recentEvents.length ? `
          <div class="exchange-activity-list">
            ${recentEvents.map((event, index) => `
              ${index === ACTIVITY_MOBILE_LIMIT
                ? renderExchangeActivityToggle("mobile")
                : ""}
              ${index === ACTIVITY_DESKTOP_LIMIT
                ? renderExchangeActivityToggle("desktop")
                : ""}
              ${renderExchangeActivityEvent(event, index)}
            `).join("")}
          </div>
        ` : `
          <div class="exchange-activity-empty">
            <strong>Quiet across the exchange.</strong>
            <span>No positions or results to report.</span>
          </div>
        `}
      </aside>
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
    const activityEvents = buildExchangeActivityEvents(allMarkets);

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

      <div class="markets-dashboard">
        <div class="markets-browser">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Community markets</p>
              <h2>Trade on what happens next</h2>
            </div>
          </div>

          <div class="filter-row" role="group" aria-label="Filter markets">
            ${filterButton("all", "All", markets.length)}
            ${filterButton("active", "Active", activeMarkets.length)}
            ${filterButton("resolved", "Resolved", resolvedMarkets.length)}
            ${filterButton("void", "Voided", voidedMarkets.length)}
            ${(state.profile.is_admin || archivedMarkets.length > 0)
              ? filterButton("archived", "Archived", archivedMarkets.length)
              : ""}
          </div>

          <section class="market-grid">
            ${filtered.length ? filtered.map(renderMarketCard).join("") : renderNoMarkets(state.marketFilter)}
          </section>
        </div>
        ${renderExchangeActivityPanel(activityEvents)}
      </div>
    `;

    document.querySelectorAll("[data-market-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.marketFilter = button.dataset.marketFilter;
        renderMarkets();
      });
    });

    document.querySelectorAll("[data-exchange-activity-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const scrollLeft = window.scrollX || 0;
        const scrollTop = window.scrollY || 0;
        state.activityExpanded = !state.activityExpanded;
        const panel = button.closest(".exchange-activity-panel");
        panel?.classList.toggle("is-expanded", state.activityExpanded);
        panel?.querySelectorAll("[data-exchange-activity-toggle]").forEach((toggle) => {
          toggle.setAttribute("aria-expanded", String(state.activityExpanded));
          toggle.textContent = state.activityExpanded ? "Show less" : "Show more";
        });

        if (state.activityExpanded) {
          const restoreScrollPosition = () => window.scrollTo(scrollLeft, scrollTop);
          restoreScrollPosition();
          window.requestAnimationFrame?.(restoreScrollPosition);
        }
      });
    });

    document.querySelector("#how-it-works")?.addEventListener("click", openHowItWorksModal);
    setupScrollableFilterRows();
  }

  function filterButton(value, label, count) {
    return `
      <button
        class="filter-chip ${state.marketFilter === value ? "active" : ""}"
        data-market-filter="${value}"
        type="button"
        aria-pressed="${state.marketFilter === value}"
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
          <span>${market.displayStatus === "open" ? formatOpenMarketFooter(market) : formatStatusFooter(market)}</span>
        </footer>
      </article>
    `;
  }

  function formatOpenMarketFooter(market) {
    return market.closeMode === "outcome"
      ? "Open until outcome"
      : `Closes ${formatRelativeDate(market.closes_at)}`;
  }

  function formatStatusFooter(market) {
    if (market.archived_at) return "Voided · archived record";
    if (market.displayStatus === "closed") return "Awaiting reality";
    if (market.displayStatus === "void") return "All points refunded";
    if (market.displayStatus === "resolved") return `Winner: ${market.winner ? escapeHtml(market.winner.label) : "Resolved"}`;
    return "";
  }

  function renderMarketPersonalSettlement(market, userId, userCommitted) {
    const userPayouts = state.payouts.filter(
      (payout) => payout.market_id === market.id && payout.user_id === userId,
    );
    const hasPersonalActivity = userCommitted > 0 || userPayouts.length > 0;
    if (!hasPersonalActivity) return "";

    if (market.displayStatus === "closed") {
      return `
        <div class="summary-row summary-row-personal-result">
          <span>Your result</span>
          <strong class="muted">Pending</strong>
        </div>
      `;
    }

    if (market.displayStatus === "resolved") {
      const returned = userPayouts
        .filter((payout) => payout.kind !== "late_refund" && payout.kind !== "void_refund")
        .reduce((sum, payout) => sum + Number(payout.amount || 0), 0);
      const lateRefund = userPayouts
        .filter((payout) => payout.kind === "late_refund")
        .reduce((sum, payout) => sum + Number(payout.amount || 0), 0);
      const profitLoss = returned - userCommitted;
      const profitLossClass = profitLoss > 0
        ? "text-success"
        : profitLoss < 0
          ? "text-danger"
          : "";

      return `
        <div class="summary-row summary-row-personal-return">
          <span>Returned to you</span>
          <strong>${formatNumber(returned)} pts</strong>
        </div>
        ${lateRefund > 0 ? `
          <div class="summary-row summary-row-personal-refund">
            <span>Late points refunded</span>
            <strong>${formatNumber(lateRefund)} pts</strong>
          </div>
        ` : ""}
        <div class="summary-row summary-row-personal-profit-loss">
          <span>Profit / loss</span>
          <strong class="${profitLossClass}">${profitLoss > 0 ? "+" : ""}${formatNumber(profitLoss)} pts</strong>
        </div>
      `;
    }

    if (market.displayStatus === "void") {
      const refunded = userPayouts
        .filter((payout) => payout.kind === "void_refund")
        .reduce((sum, payout) => sum + Number(payout.amount || 0), 0);
      const netChange = refunded - userCommitted;
      const netChangeClass = netChange > 0
        ? "text-success"
        : netChange < 0
          ? "text-danger"
          : "";

      return `
        <div class="summary-row summary-row-personal-refund">
          <span>Refunded to you</span>
          <strong>${formatNumber(refunded)} pts</strong>
        </div>
        <div class="summary-row summary-row-personal-net-change">
          <span>Net change</span>
          <strong class="${netChangeClass}">${netChange > 0 ? "+" : ""}${formatNumber(netChange)} pts</strong>
        </div>
      `;
    }

    return "";
  }

  function compareMarketActivityNewest(first, second) {
    const timestampDifference =
      getTimestamp(second.created_at, 0) - getTimestamp(first.created_at, 0);
    if (timestampDifference !== 0) return timestampDifference;
    return Number(second.id || 0) - Number(first.id || 0);
  }

  function buildMarketActivityView(market, view = "recent") {
    const normalizedView = MARKET_ACTIVITY_VIEWS.has(view) ? view : "recent";
    const predictions = [...market.predictions];

    if (normalizedView === "position") {
      const originalOutcomeOrder = new Map(
        market.outcomes.map((outcome, index) => [outcome.id, index]),
      );
      const groups = market.outcomes
        .map((outcome) => ({
          outcome,
          totalCommitted: Number(outcome.actualPoints || 0),
          predictions: predictions
            .filter((prediction) => prediction.outcome_id === outcome.id)
            .sort(compareMarketActivityNewest)
            .slice(0, MARKET_ACTIVITY_LIMIT),
        }))
        .filter((group) => group.predictions.length > 0)
        .sort((first, second) => {
          const totalDifference = second.totalCommitted - first.totalCommitted;
          if (totalDifference !== 0) return totalDifference;
          return (
            Number(originalOutcomeOrder.get(first.outcome.id) || 0) -
            Number(originalOutcomeOrder.get(second.outcome.id) || 0)
          );
        });

      return { type: "grouped", groups };
    }

    const sortedPredictions = predictions.sort((first, second) => {
      if (normalizedView === "largest") {
        const amountDifference =
          Number(second.amount || 0) - Number(first.amount || 0);
        if (amountDifference !== 0) return amountDifference;
      }
      return compareMarketActivityNewest(first, second);
    });

    return {
      type: "flat",
      predictions: sortedPredictions.slice(0, MARKET_ACTIVITY_LIMIT),
    };
  }

  function renderMarketActivity(activityView, market, historyEventByPrediction) {
    if (activityView.type === "grouped") {
      return `
        <div class="activity-position-groups">
          ${activityView.groups.map((group) => {
            const headingId = `activity-position-${market.id}-${group.outcome.id}`;
            return `
              <section class="activity-position-group" aria-labelledby="${escapeAttribute(headingId)}">
                <div class="activity-position-heading">
                  <h3 id="${escapeAttribute(headingId)}">${escapeHtml(group.outcome.label)}</h3>
                  <span class="activity-position-total">
                    <strong>${formatNumber(group.totalCommitted)} pts</strong>
                    <span>committed</span>
                  </span>
                </div>
                <div class="activity-list">
                  ${group.predictions
                    .map((prediction) =>
                      renderActivityItem(
                        prediction,
                        market,
                        historyEventByPrediction.get(prediction),
                      ),
                    )
                    .join("")}
                </div>
              </section>
            `;
          }).join("")}
        </div>
      `;
    }

    return `
      <div class="activity-list">
        ${activityView.predictions
          .map((prediction) =>
            renderActivityItem(
              prediction,
              market,
              historyEventByPrediction.get(prediction),
            ),
          )
          .join("")}
      </div>
    `;
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

    if (state.marketActivityMarketId !== market.id) {
      state.marketActivityView = "recent";
      state.marketActivityMarketId = market.id;
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
    const canResolve = canManage && market.status === "open";
    const canVoid = canManage && market.status === "open";
    const hasMarketControls =
      canEdit || canResolve || canVoid || canArchive || canRestore || canDelete;
    const storedSelectedOutcomeId = state.selectedOutcomeByMarket.get(market.id);
    const selectedOutcome = canPredict
      ? market.outcomes.find((outcome) => outcome.id === storedSelectedOutcomeId)
      : null;
    if (!selectedOutcome && storedSelectedOutcomeId !== undefined) {
      state.selectedOutcomeByMarket.delete(market.id);
    }
    const selectedOutcomeId = selectedOutcome?.id || null;
    const userPredictions = market.officialPredictions.filter((prediction) => prediction.user_id === state.user.id);
    const userCommitted = userPredictions.reduce((sum, prediction) => sum + prediction.amount, 0);
    const sortedOutcomes = [...market.outcomes].sort((a, b) => b.percent - a.percent);
    const marketActivity = buildMarketActivityView(market, state.marketActivityView);
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
    const isOddsHistoryExpanded =
      state.oddsHistoryMarketId === market.id && market.officialPredictions.length > 0;

    dom.main.innerHTML = `
      <div class="market-layout">
        <div class="market-main">
          <section class="market-hero">
            <p class="eyebrow">Market #${market.id}</p>
            <h1>${escapeHtml(market.question)}</h1>
            ${market.description ? `<p class="market-description">${escapeHtml(market.description)}</p>` : ""}
            <div class="market-meta-row">
              <span class="tiny-pill">Created by ${escapeHtml(market.creator?.display_name || "Unknown")}</span>
              <span class="tiny-pill">${market.closeMode === "outcome" ? "Open until outcome" : `Closes ${formatDateTime(market.closes_at)}`}</span>
              <span class="tiny-pill">${formatNumber(market.actualTotal)} points in pool</span>
              ${market.archived_at ? `<span class="tiny-pill">Archived ${formatDateTime(market.archived_at)}</span>` : ""}
            </div>
          </section>

          <section class="panel">
            <div class="panel-heading">
              <div>
                <h2>${market.displayStatus === "resolved" ? "Final results" : canPredict ? "Back an outcome" : "Community odds"}</h2>
                <p>${canPredict
                  ? `Select an outcome to continue. Display odds include ${market.outcomes[0]?.seed_points || 25} seed points per outcome; payouts use real predictions only.`
                  : `Display odds include ${market.outcomes[0]?.seed_points || 25} seed points per outcome. Payouts use real predictions only.`}</p>
              </div>
              <div class="panel-heading-actions">
                ${statusPill(market.archived_at ? "archived" : market.displayStatus)}
                ${market.officialPredictions.length ? `
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
            <div class="outcome-list"${canPredict ? ' role="radiogroup" aria-label="Choose an outcome to back"' : ""}>
              ${sortedOutcomes
                .map((outcome) =>
                  renderOutcomeCard(
                    outcome,
                    market,
                    canPredict,
                    movementByOutcome.get(outcome.id),
                    liveChanges.get(outcome.id),
                    selectedOutcomeId,
                  ),
                )
                .join("")}
            </div>
            ${canPredict ? `
              <div class="outcome-selection-action">
                <button
                  class="button button-primary"
                  id="back-selected-outcome"
                  type="button"
                  ${selectedOutcome ? "" : "disabled"}
                >${selectedOutcome ? `Back ${escapeHtml(selectedOutcome.label)}` : "Choose an outcome"}</button>
              </div>
            ` : ""}
            ${isOddsHistoryExpanded ? renderOddsHistoryChart(market, oddsTimeline) : ""}
          </section>

          ${renderMarketTimeline(market)}

          ${renderLivePosition(market, state.user.id)}

          <section class="panel">
            <div class="panel-heading">
              <div>
                <h2>Recent activity</h2>
                <p>Public accountability for all questionable convictions.</p>
              </div>
              ${market.predictions.length ? `
                <div class="panel-heading-actions market-activity-heading-actions">
                  <label class="market-activity-view-field" for="market-activity-view">
                    <span class="market-activity-view-prefix" aria-hidden="true">View:</span>
                    <span class="market-activity-view-value" aria-hidden="true">${escapeHtml(MARKET_ACTIVITY_VIEW_LABELS[state.marketActivityView])}</span>
                    <span class="market-activity-view-chevron" aria-hidden="true"></span>
                    <select id="market-activity-view" aria-label="View market activity">
                      <option value="recent"${state.marketActivityView === "recent" ? " selected" : ""}>Recent</option>
                      <option value="largest"${state.marketActivityView === "largest" ? " selected" : ""}>Largest commitments</option>
                      <option value="position"${state.marketActivityView === "position" ? " selected" : ""}>Group by position</option>
                    </select>
                  </label>
                </div>
              ` : ""}
            </div>
            ${market.predictions.length
              ? renderMarketActivity(marketActivity, market, historyEventByPrediction)
              : `
              <div class="empty-state">
                <div class="empty-state-icon">…</div>
                <h2>Quiet. Too quiet.</h2>
                <p>No one has put any points behind an opinion yet.</p>
              </div>
            `}
          </section>
        </div>

        <aside class="market-sidebar">
          <section class="card market-statement-card">
            <div class="market-statement-header">
              <p class="eyebrow">Market snapshot</p>
            </div>

            <div class="market-statement-ledger">
              <div class="stats-grid">
                <div class="stat-card">
                  <strong>${formatNumber(market.actualTotal)}</strong>
                  <span>${market.displayStatus === "resolved" ? "Final pool" : "Pool"}</span>
                </div>
                <div class="stat-card">
                  <strong>${market.participants}</strong>
                  <span>${market.displayStatus === "resolved" ? "Traders counted" : "Traders"}</span>
                </div>
                <div class="stat-card">
                  <strong>${market.displayStatus === "resolved" ? formatNumber(market.lateTotal) : market.predictions.length}</strong>
                  <span>${market.displayStatus === "resolved" ? "Late refunds" : "Predictions"}</span>
                </div>
              </div>

              <div class="summary-stack">
                <div class="summary-row">
                  <span>Available balance</span>
                  <strong>${formatNumber(state.profile.balance)} pts</strong>
                </div>
                <div class="summary-row">
                  <span>Committed to this market</span>
                  <strong>${formatNumber(userCommitted)} pts</strong>
                </div>
                ${renderMarketPersonalSettlement(market, state.user.id, userCommitted)}
              </div>

            </div>
            <div class="sidebar-actions">
              ${hasMarketControls ? `
                <div class="sidebar-management">
                  <p class="eyebrow sidebar-actions-label">Manage market</p>
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

        </aside>
      </div>
    `;

    market.outcomes.forEach((outcome) => {
      state.lastRenderedMarketOdds.set(outcome.id, outcome.percent);
    });

    document.querySelectorAll("[data-select-outcome]").forEach((input) => {
      input.addEventListener("change", () => {
        const outcomeId = Number(input.dataset.selectOutcome);
        const outcome = market.outcomes.find((item) => item.id === outcomeId);
        if (!outcome) return;

        state.selectedOutcomeByMarket.set(market.id, outcome.id);
        document.querySelectorAll("[data-outcome-card]").forEach((card) => {
          card.classList.toggle(
            "is-selected",
            Number(card.dataset.outcomeCard) === outcome.id,
          );
        });

        const action = document.querySelector("#back-selected-outcome");
        if (action) {
          action.disabled = false;
          action.textContent = `Back ${outcome.label}`;
        }
      });
    });
    document.querySelector("#back-selected-outcome")?.addEventListener("click", () => {
      const outcomeId = state.selectedOutcomeByMarket.get(market.id);
      if (!market.outcomes.some((outcome) => outcome.id === outcomeId)) return;
      openPredictionModal(market, outcomeId);
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
      renderMarketDetail(market.id);
    });
    document.querySelector("#market-activity-view")?.addEventListener("change", (event) => {
      const nextView = event.currentTarget.value;
      if (!MARKET_ACTIVITY_VIEWS.has(nextView)) return;
      state.marketActivityView = nextView;
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
    const historyChart = document.querySelector(".odds-history-chart");
    historyChart?.addEventListener("pointerleave", () => {
      if (Number.isFinite(pinnedHistoryEventIndex)) {
        activateHistoryEvent(pinnedHistoryEventIndex);
      }
    });
    const historyPanel = document.querySelector("#odds-history-panel");
    const historyOutcomeButtons = document.querySelectorAll(
      "[data-history-outcome-select]",
    );
    const setHistoryOutcomeFocus = (outcomeId = null) => {
      const selectedId = Number(outcomeId);
      const hasSelection =
        outcomeId !== null &&
        outcomeId !== undefined &&
        Number.isFinite(selectedId);
      historyPanel?.classList.toggle("has-outcome-focus", hasSelection);
      historyOutcomeButtons.forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(Number(button.dataset.historyOutcomeSelect) === selectedId),
        );
      });
      document.querySelectorAll("[data-history-outcome]").forEach((ribbon) => {
        ribbon.setAttribute(
          "data-highlighted",
          String(Number(ribbon.dataset.historyOutcome) === selectedId),
        );
      });
      document.querySelectorAll("[data-history-boundary]").forEach((boundary) => {
        boundary.setAttribute(
          "data-highlighted",
          String(Number(boundary.dataset.historyBoundary) === selectedId),
        );
      });
    };
    historyOutcomeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const outcomeId = Number(button.dataset.historyOutcomeSelect);
        const isPressed = button.getAttribute("aria-pressed") === "true";
        setHistoryOutcomeFocus(isPressed ? null : outcomeId);
      });
    });
  }

  function renderOutcomeCard(
    outcome,
    market,
    canPredict,
    movement,
    liveChange,
    selectedOutcomeId = null,
  ) {
    const isWinner = market.winning_outcome_id === outcome.id;
    const isSelected = canPredict && selectedOutcomeId === outcome.id;
    const userAmount = (market.officialPredictions || market.predictions)
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

    const cardTag = canPredict ? "label" : "article";

    return `
      <${cardTag}
        class="outcome-card${canPredict ? " outcome-card-selectable" : ""}${isSelected ? " is-selected" : ""}${isWinner ? " winner" : ""}${liveMovementClass}"
        ${canPredict ? `data-outcome-card="${outcome.id}"` : ""}
      >
        ${canPredict ? `
          <input
            class="outcome-choice-input visually-hidden"
            data-select-outcome="${outcome.id}"
            name="market-outcome-${market.id}"
            type="radio"
            value="${outcome.id}"
            aria-label="Back ${escapeAttribute(outcome.label)}"
            ${isSelected ? "checked" : ""}
          />
        ` : ""}
        <span class="outcome-card-leading">
          <span class="outcome-name-line">
            <span class="outcome-name">${escapeHtml(outcome.label)}</span>
            ${isWinner ? '<span class="tiny-pill">Winner</span>' : ""}
          </span>
          ${userAmount ? `<span class="outcome-user-position">Your position · ${formatNumber(userAmount)} pts</span>` : ""}
          <span class="odds-track" aria-hidden="true">
            <span class="odds-fill ${hasLiveChange ? "is-live-updated" : ""}" style="${oddsStyle}"></span>
          </span>
        </span>
        <span class="outcome-numbers">
          <strong class="${hasLiveChange ? "is-live-updated" : ""}">${formatPercent(outcome.percent)}</strong>
          ${renderOutcomeMovement(outcomeMovement)}
          <small>${formatNumber(outcome.actualPoints)} pts</small>
        </span>
      </${cardTag}>
    `;
  }

  function renderActivityItem(prediction, market, historyEvent) {
    const profile = state.profiles.find((item) => item.id === prediction.user_id);
    const outcome = market.outcomes.find((item) => item.id === prediction.outcome_id);
    const name = profile?.display_name || "Unknown trader";
    const eventCopy = historyEvent
      ? getHistoryEventCopy(historyEvent, market)
      : null;
    const late = isLatePrediction(prediction, market);

    return `
      <div class="activity-item${late ? " is-refunded" : ""}">
        ${renderProfileAvatar(profile || { display_name: name })}
        <div class="activity-copy">
          <div class="activity-statement">
            <strong>${escapeHtml(name)}</strong>
            <span> committed ${formatNumber(prediction.amount)} pts to </span>
            <strong>${escapeHtml(outcome?.label || "an outcome")}</strong>
          </div>
          ${late ? `
            <span class="activity-impact activity-refund">
              Didn’t count · Submitted once the outcome was known · ${formatNumber(prediction.amount)} pts refunded
            </span>
          ` : eventCopy ? `
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
          <p>Create a question with 2–${MAX_MARKET_OUTCOMES} possible outcomes.</p>
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
              <h2>Choose the closing rule</h2>
              <p>Close predictions at a set time, or keep them open until someone makes the result official.</p>
            </div>
          </div>
          <div class="close-mode-options" role="radiogroup" aria-label="When predictions close">
            <label class="close-mode-option">
              <input type="radio" name="closeMode" value="date" checked />
              <span>
                <strong>Open until date</strong>
                <small>Predictions stop automatically at a date and time.</small>
              </span>
            </label>
            <label class="close-mode-option">
              <input type="radio" name="closeMode" value="outcome" />
              <span>
                <strong>Open until outcome</strong>
                <small>Predictions made after the outcome is known don’t count and are refunded.</small>
              </span>
            </label>
          </div>
          <div class="form-grid">
            <div class="form-field" id="scheduled-close-field">
              <label for="market-closes">Predictions close</label>
              <input id="market-closes" name="closesAt" type="datetime-local" value="${defaultClose}" required />
            </div>
            <div class="form-field">
              <span class="field-label">Who makes the result official?</span>
              <div style="min-height:48px;display:flex;align-items:center;padding:0 14px;border:1px solid var(--line);border-radius:10px;background:#faf9f2;font-size:.82rem">
                You, plus any site admin
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

      document.querySelector("#add-choice").disabled = choices.length >= MAX_MARKET_OUTCOMES;
    };

    renderChoices();

    const closeModeInputs = [...document.querySelectorAll('input[name="closeMode"]')];
    const scheduledCloseField = document.querySelector("#scheduled-close-field");
    const scheduledCloseInput = document.querySelector("#market-closes");
    const updateCloseMode = () => {
      const closeMode = closeModeInputs.find((input) => input.checked)?.value || "date";
      const usesDate = closeMode === "date";
      scheduledCloseField?.classList.toggle("hidden", !usesDate);
      if (scheduledCloseInput) {
        scheduledCloseInput.required = usesDate;
        scheduledCloseInput.disabled = !usesDate;
      }
    };
    closeModeInputs.forEach((input) => input.addEventListener("change", updateCloseMode));
    updateCloseMode();

    document.querySelector("#add-choice").addEventListener("click", () => {
      if (choices.length >= MAX_MARKET_OUTCOMES) return;
      choices.push("");
      renderChoices();
      document.querySelectorAll(".choice-input")[choices.length - 1]?.focus();
    });

    document.querySelector("#create-market-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const question = String(form.get("question") || "").trim();
      const description = String(form.get("description") || "").trim();
      const closeMode = String(form.get("closeMode") || "date");
      const closesAtRaw = String(form.get("closesAt") || "");
      const outcomeLabels = choices.map((choice) => choice.trim()).filter(Boolean);
      const normalized = outcomeLabels.map((label) => label.toLocaleLowerCase());
      const submit = event.currentTarget.querySelector("button[type='submit']");

      if (outcomeLabels.length < 2) {
        showToast("Add at least two outcomes.", "error");
        return;
      }

      if (outcomeLabels.length > MAX_MARKET_OUTCOMES) {
        showToast(`Markets can have no more than ${MAX_MARKET_OUTCOMES} outcomes.`, "error");
        return;
      }

      if (new Set(normalized).size !== normalized.length) {
        showToast("Each outcome needs a unique name.", "error");
        return;
      }

      const closesAt = closeMode === "date" ? new Date(closesAtRaw) : null;
      if (
        closeMode === "date" &&
        (Number.isNaN(closesAt.getTime()) || closesAt.getTime() <= Date.now())
      ) {
        showToast("Choose a closing time in the future.", "error");
        return;
      }

      setButtonLoading(submit, true, "Opening market…");

      const { data, error } = await state.client.rpc("create_market", {
        p_question: question,
        p_description: description || null,
        p_close_mode: closeMode,
        p_closes_at: closesAt ? closesAt.toISOString() : null,
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

  function updateScrollableFilterRows() {
    document.querySelectorAll(".filter-row").forEach((row) => {
      const maximumScroll = Math.max(0, row.scrollWidth - row.clientWidth);
      row.classList.toggle("has-left-overflow", row.scrollLeft > 1);
      row.classList.toggle(
        "has-right-overflow",
        maximumScroll > 1 && row.scrollLeft < maximumScroll - 1,
      );
    });
  }

  function setupScrollableFilterRows() {
    document.querySelectorAll(".filter-row").forEach((row) => {
      row.addEventListener("scroll", updateScrollableFilterRows, { passive: true });

      if (row.scrollWidth > row.clientWidth + 1) {
        row.querySelector(".filter-chip.active")?.scrollIntoView({
          block: "nearest",
          inline: "center",
        });
      }
    });

    updateScrollableFilterRows();
    window.setTimeout(updateScrollableFilterRows, 0);
  }

  function renderLeaderboard() {
    const allMarkets = getAllMarkets();
    const marketById = new Map(allMarkets.map((market) => [market.id, market]));
    const resolvedMarketIds = new Set(
      allMarkets
        .filter((market) => market.displayStatus === "resolved")
        .map((market) => market.id)
    );
    const rows = state.profiles.map((profile) => {
      const profilePredictions = state.predictions.filter(
        (prediction) => prediction.user_id === profile.id
      );
      const countablePredictions = profilePredictions.filter(
        (prediction) => !isLatePrediction(prediction, marketById.get(prediction.market_id)),
      );
      const committed = countablePredictions
        .filter((prediction) => {
          const market = state.markets.find((item) => item.id === prediction.market_id);
          return market?.status === "open";
        })
        .reduce((sum, prediction) => sum + prediction.amount, 0);
      const resolvedCommitted = countablePredictions
        .filter((prediction) => resolvedMarketIds.has(prediction.market_id))
        .reduce((sum, prediction) => sum + prediction.amount, 0);
      const resolvedPayouts = state.payouts
        .filter(
          (payout) =>
            payout.user_id === profile.id &&
            resolvedMarketIds.has(payout.market_id) &&
            payout.kind !== "late_refund"
        )
        .reduce((sum, payout) => sum + payout.amount, 0);
      const profitLoss = resolvedPayouts - resolvedCommitted;

      return {
        ...profile,
        activity: countablePredictions.length,
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
      (prediction) =>
        eligibleMarketIds.has(prediction.market_id) &&
        !isLatePrediction(prediction, marketById.get(prediction.market_id))
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
    const marketById = new Map(allMarkets.map((market) => [market.id, market]));
    const userPredictions = state.predictions.filter((prediction) => prediction.user_id === state.user.id);
    const eligibleUserPredictions = userPredictions.filter(
      (prediction) => !isLatePrediction(prediction, marketById.get(prediction.market_id)),
    );
    const userPayouts = state.payouts.filter((payout) => payout.user_id === state.user.id);
    const totalCommitted = eligibleUserPredictions.reduce((sum, prediction) => sum + prediction.amount, 0);
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
    const resolvedCommitted = eligibleUserPredictions
      .filter((prediction) => resolvedMarketIds.has(prediction.market_id))
      .reduce((sum, prediction) => sum + prediction.amount, 0);
    const resolvedPayouts = userPayouts
      .filter(
        (payout) =>
          resolvedMarketIds.has(payout.market_id) &&
          payout.kind !== "late_refund",
      )
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
      const late = isLatePrediction(prediction, marketById.get(prediction.market_id));
      const key = `${prediction.market_id}:${prediction.outcome_id}:${late ? "late" : "eligible"}`;
      const existing = groups.get(key) || {
        marketId: prediction.market_id,
        outcomeId: prediction.outcome_id,
        amount: 0,
        latest: prediction.created_at,
        isLate: late,
      };
      existing.amount += prediction.amount;
      if (new Date(prediction.created_at) > new Date(existing.latest)) existing.latest = prediction.created_at;
      groups.set(key, existing);
    });

    const positions = [...groups.values()]
      .map((position) => {
        const market = allMarkets.find((item) => item.id === position.marketId);
        const outcome = market?.outcomes.find((item) => item.id === position.outcomeId);
        const payout = state.payouts.find((item) => {
          if (item.market_id !== position.marketId || item.user_id !== state.user.id) return false;
          if (position.isLate) return item.kind === "late_refund";
          return item.kind !== "late_refund";
        });
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
    const portfolioSortOptions = [
      ["default", "Default: Active first"],
      ["market", "Market"],
      ["outcome", "Your pick"],
      ["odds", "Odds"],
      ["status", "Status"],
      ["committed", "Committed"],
      ["returned", "Returned"],
      ["profitLoss", "P/L"],
    ];
    const isDefaultPortfolioSort = state.portfolioSortKey === "default";
    const portfolioSortDirectionLabel = state.portfolioSortDirection === "asc"
      ? "Ascending"
      : "Descending";
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
          <div class="portfolio-mobile-sort" role="group" aria-label="Sort your predictions">
            <label class="portfolio-mobile-sort-field" for="portfolio-mobile-sort">
              <span>Sort by</span>
              <select id="portfolio-mobile-sort">
                ${portfolioSortOptions.map(([value, label]) => `
                  <option value="${value}"${state.portfolioSortKey === value ? " selected" : ""}>${label}</option>
                `).join("")}
              </select>
            </label>
            <button
              class="portfolio-sort-direction"
              id="portfolio-sort-direction"
              type="button"
              aria-label="${isDefaultPortfolioSort ? "Default order" : `${portfolioSortDirectionLabel}. Change sort direction`}"
              title="${isDefaultPortfolioSort ? "Default order" : portfolioSortDirectionLabel}"
              ${isDefaultPortfolioSort ? "disabled" : ""}
            >
              <span aria-hidden="true">${state.portfolioSortDirection === "asc" ? "↑" : "↓"}</span>
            </button>
          </div>
          <p class="portfolio-orientation-hint">
            <i class="portfolio-orientation-icon fa-solid fa-rotate-left" aria-hidden="true"></i>
            <span>More columns await in landscape mode</span>
          </p>
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

    document.querySelector("#portfolio-mobile-sort")?.addEventListener("change", (event) => {
      const nextKey = event.currentTarget.value;
      const previousKey = state.portfolioSortKey;
      state.portfolioSortKey = nextKey;
      if (nextKey === "default") {
        state.portfolioSortDirection = "desc";
      } else if (previousKey !== nextKey) {
        state.portfolioSortDirection = ["market", "outcome", "status"].includes(nextKey)
          ? "asc"
          : "desc";
      }
      renderPortfolio();
    });

    document.querySelector("#portfolio-sort-direction")?.addEventListener("click", () => {
      if (state.portfolioSortKey === "default") return;
      state.portfolioSortDirection =
        state.portfolioSortDirection === "desc" ? "asc" : "desc";
      renderPortfolio();
    });

    setupScrollableFilterRows();
    setupScrollableTableFades();
  }

  function getPositionCategory(position) {
    const { market, outcome, payout } = position;
    if (position.isLate) return "refunded";
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
        aria-pressed="${state.portfolioFilter === value}"
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

    if (position.isLate) {
      return {
        oddsContext: "final",
        positionProfitLoss: 0,
        returned: amount,
        statusLabel: "Refunded · After cutoff",
        statusOrder: 4,
        statusTone: "is-refunded",
      };
    }

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
          <div class="portfolio-question-heading">
            <a class="portfolio-question-link" href="#/market/${market.id}">${escapeHtml(market.question)}</a>
            <span class="portfolio-mobile-status position-status ${statusTone}">${statusLabel}</span>
          </div>
        </td>
        <td class="portfolio-outcome-cell">
          <span class="mobile-cell-label">Your pick</span>
          <strong>${escapeHtml(outcome.label)}</strong>
        </td>
        <td class="portfolio-odds-cell numeric-cell">
          <span class="mobile-cell-label">${oddsContext === "current" ? "Current odds" : "Final odds"}</span>
          <span class="table-value-with-note">
            <strong>${formatPercent(outcome.percent)}</strong>
            <small>${oddsContext}</small>
          </span>
        </td>
        <td class="portfolio-status-cell">
          <span class="mobile-cell-label">Status</span>
          <span class="position-status ${statusTone}">${statusLabel}</span>
        </td>
        <td class="portfolio-committed-cell mono numeric-cell">
          <span class="mobile-cell-label">Committed</span>
          <span class="mobile-cell-value">${formatNumber(amount)} pts</span>
        </td>
        <td class="portfolio-returned-cell mono numeric-cell">
          <span class="mobile-cell-label">Returned</span>
          <span class="mobile-cell-value">${returnedText}</span>
        </td>
        <td class="portfolio-profit-loss-cell mono numeric-cell ${profitLossClass}">
          <span class="mobile-cell-label">P/L</span>
          <span class="mobile-cell-value">${profitLossText}</span>
        </td>
      </tr>
    `;
  }

  async function renderAdmin() {
    if (!state.profile?.is_admin) {
      renderNotFound();
      return;
    }

    const adminView = getAdminView();
    dom.main.innerHTML = `
      <div class="page-header">
        <div>
          <p class="eyebrow">Administrator</p>
          <h1>Exchange operations.</h1>
          <p>Loading the administrative desk.</p>
        </div>
      </div>
      <div class="loading-grid">
        <div class="loading-card skeleton"></div>
        <div class="loading-card skeleton"></div>
      </div>
    `;

    const [invitationResult, notificationResult, currentPushSubscription] = await Promise.all([
      state.client.rpc("list_approved_signup_emails"),
      state.client.rpc("get_notification_admin_overview", {
        p_limit: ADMIN_NOTIFICATION_OVERVIEW_LIMIT,
      }),
      getCurrentPushSubscription(),
    ]);
    if (getRoute().page !== "admin" || getAdminView() !== adminView) return;

    state.notificationAdminOverview = notificationResult.data || null;
    state.currentPushSubscriptionActive = Boolean(currentPushSubscription);
    state.currentPushSubscriptionEndpoint = currentPushSubscription?.endpoint || null;
    dom.main.innerHTML = buildAdminPageMarkup(
      adminView,
      invitationResult.data || [],
      notificationResult.data || null,
      invitationResult.error || null,
      notificationResult.error || null,
    );
    bindAdminPageEvents(invitationResult.data || []);
    if (adminView === "notifications") bindAdminNotificationPageEvents();
    setupScrollableTableFades();
  }

  function getAdminView() {
    const view = getRoute().id;
    return view === "notifications" ? "notifications" : "people";
  }

  function getNotificationTemplate(kind = "new_market", market = null) {
    const question = market?.question || "Will the committee reach an unnecessarily confident conclusion?";
    const creator = market?.creator?.display_name || state.profile?.display_name || "Administrator";
    const winner = market?.winner?.label || market?.outcomes?.[0]?.label || "Yes";
    const duration = market?.closes_at && market?.created_at
      ? new Date(market.closes_at).getTime() - new Date(market.created_at).getTime()
      : 24 * 60 * 60 * 1000;
    const closingLabel = duration >= 24 * 60 * 60 * 1000 ? "24 hours" : "1 hour";
    const templates = {
      new_market: {
        title: "New market listed",
        body: `${question} — opened by ${creator}.`,
      },
      closing_soon: {
        title: "Predictions close soon",
        body: `${question} — closes in ${closingLabel}.`,
      },
      resolution: {
        title: "Market resolved",
        body: `${question} — winner: ${winner}.`,
      },
      void: {
        title: "Market voided",
        body: `${question} — committed points have been returned.`,
      },
    };

    return {
      ...(templates[kind] || templates.new_market),
      targetUrl: market ? `#/market/${market.id}` : "#/markets",
    };
  }

  function notificationDeliveryStatus(status) {
    const labels = {
      pending: "Pending",
      processing: "Processing",
      sent: "Sent",
      failed: "Failed",
      expired: "Expired",
      suppressed: "Suppressed",
    };
    return labels[status] || status;
  }

  function getAdminInvitationCounts(invitations) {
    return {
      joined: invitations.filter(
        (invitation) => invitation.registered_user_id && invitation.confirmed_at,
      ).length,
      awaiting: invitations.filter(
        (invitation) => invitation.registered_user_id && !invitation.confirmed_at,
      ).length,
      available: invitations.filter(
        (invitation) => !invitation.registered_user_id,
      ).length,
    };
  }

  function buildAdminShellMarkup(activeView, content, badges = {}) {
    const sections = [
      { id: "people", label: "People", href: "#/admin" },
      { id: "notifications", label: "Notifications", href: "#/admin/notifications" },
    ];

    return `
      <div class="page-header admin-page-header">
        <div>
          <p class="eyebrow">Administrator</p>
          <h1>Exchange operations.</h1>
          <p>Manage the people, access, and delivery systems behind the exchange.</p>
        </div>
      </div>
      <nav class="admin-section-nav" aria-label="Admin sections">
        ${sections.map((section) => `
          <a
            class="admin-section-link${section.id === activeView ? " is-active" : ""}"
            href="${section.href}"
            ${section.id === activeView ? 'aria-current="page"' : ""}
          >${section.label}${badges[section.id]
            ? `<span class="admin-nav-badge">${escapeHtml(badges[section.id])}</span>`
            : ""}</a>
        `).join("")}
      </nav>
      <div class="admin-view">${content}</div>
    `;
  }

  function buildAdminPageMarkup(
    activeView,
    invitations,
    notificationOverview = null,
    invitationError = null,
    notificationError = null,
  ) {
    const counts = getAdminInvitationCounts(invitations);
    const failedDeliveries = Number(notificationOverview?.failed_deliveries) || 0;
    const badges = {
      people: invitationError ? "!" : counts.awaiting ? formatNumber(counts.awaiting) : "",
      notifications: notificationError ? "!" : failedDeliveries ? formatNumber(failedDeliveries) : "",
    };
    const content = activeView === "notifications"
      ? buildAdminNotificationsMarkup(notificationOverview, notificationError)
      : buildAdminPeopleMarkup(invitations, invitationError);

    return buildAdminShellMarkup(activeView, content, badges);
  }

  function buildAdminPeopleMarkup(invitations, invitationError = null) {
    return `
      <div class="admin-people-actions" role="group" aria-label="People actions">
        <button class="admin-people-action" data-admin-approve-email type="button">
          <span class="admin-people-action-icon"><i class="fa-solid fa-envelope-circle-check" aria-hidden="true"></i></span>
          <span class="admin-people-action-copy"><strong>Approve email</strong><small>Let someone join the exchange</small></span>
          <i class="fa-solid fa-arrow-right admin-people-action-arrow" aria-hidden="true"></i>
        </button>
        <button class="admin-people-action" data-admin-adjust-points type="button">
          <span class="admin-people-action-icon"><i class="fa-solid fa-coins" aria-hidden="true"></i></span>
          <span class="admin-people-action-copy"><strong>Adjust points</strong><small>Add or subtract a member's points</small></span>
          <i class="fa-solid fa-arrow-right admin-people-action-arrow" aria-hidden="true"></i>
        </button>
        <button class="admin-people-action" data-admin-edit-profile type="button">
          <span class="admin-people-action-icon"><i class="fa-solid fa-user-pen" aria-hidden="true"></i></span>
          <span class="admin-people-action-copy"><strong>Edit profile</strong><small>Change a member's name or icon</small></span>
          <i class="fa-solid fa-arrow-right admin-people-action-arrow" aria-hidden="true"></i>
        </button>
      </div>
      ${buildAdminInvitationRegistryMarkup(invitations, invitationError)}
    `;
  }

  function getAdminPeopleSortValue(invitation, key) {
    const isRegistered = Boolean(invitation.registered_user_id);
    const isConfirmed = Boolean(invitation.confirmed_at);
    const profile = isRegistered
      ? state.profiles.find((item) => item.id === invitation.registered_user_id)
      : null;

    if (key === "name") {
      return String(
        profile?.display_name || invitation.registered_display_name || invitation.email || "",
      ).toLocaleLowerCase();
    }
    if (key === "status") {
      if (isConfirmed) return 0;
      if (isRegistered) return 1;
      return 2;
    }
    if (key === "push") {
      if (!isConfirmed) return null;
      return { ready: 0, off: 1, not_set_up: 2 }[invitation.push_notification_status] ?? null;
    }
    if (key === "points") {
      return isConfirmed && profile ? Number(profile.balance) : null;
    }
    if (key === "joined") {
      const joinedAt = invitation.confirmed_at
        ? new Date(invitation.confirmed_at).getTime()
        : Number.NaN;
      return Number.isFinite(joinedAt) ? joinedAt : null;
    }

    const approvedAt = invitation.added_at
      ? new Date(invitation.added_at).getTime()
      : Number.NaN;
    return Number.isFinite(approvedAt) ? approvedAt : null;
  }

  function sortAdminPeople(invitations) {
    const key = state.adminPeopleSortKey || "approved";
    const direction = state.adminPeopleSortDirection === "asc" ? "asc" : "desc";

    return [...invitations].sort((a, b) => {
      const aValue = getAdminPeopleSortValue(a, key);
      const bValue = getAdminPeopleSortValue(b, key);
      const aMissing = aValue === null || aValue === "";
      const bMissing = bValue === null || bValue === "";
      if (aMissing !== bMissing) return aMissing ? 1 : -1;

      let comparison = 0;
      if (!aMissing && !bMissing) {
        comparison = typeof aValue === "string"
          ? aValue.localeCompare(bValue)
          : aValue - bValue;
      }
      if (comparison) return direction === "asc" ? comparison : -comparison;

      const aName = String(a.registered_display_name || a.email || "");
      const bName = String(b.registered_display_name || b.email || "");
      return aName.localeCompare(bName);
    });
  }

  function buildAdminInvitationRegistryMarkup(invitations, invitationError = null) {
    if (invitationError) {
      return `
        <section class="panel admin-registry-error">
          <div class="panel-heading">
            <div>
              <h2>Approved emails unavailable</h2>
              <p>${escapeHtml(invitationError.message || "The approved-email registry could not be loaded.")}</p>
            </div>
            <button class="button button-secondary" id="retry-admin-button" type="button">Try again</button>
          </div>
        </section>
      `;
    }

    const sortedInvitations = sortAdminPeople(invitations);
    const sortableHeader = (key, label, className = "") => {
      const isActive = state.adminPeopleSortKey === key;
      const ariaSort = isActive
        ? state.adminPeopleSortDirection === "asc" ? "ascending" : "descending"
        : "none";
      const indicator = isActive
        ? state.adminPeopleSortDirection === "asc" ? "↑" : "↓"
        : "↕";

      return `
        <th${className ? ` class="${className}"` : ""} aria-sort="${ariaSort}">
          <button class="table-sort-button" type="button" data-admin-people-sort="${key}">
            <span>${label}</span>
            <span class="sort-indicator" aria-hidden="true">${indicator}</span>
          </button>
        </th>
      `;
    };
    const rows = sortedInvitations.map((invitation) => {
      const isRegistered = Boolean(invitation.registered_user_id);
      const isConfirmed = Boolean(invitation.confirmed_at);
      const profile = isRegistered
        ? state.profiles.find((item) => item.id === invitation.registered_user_id)
        : null;
      const status = isConfirmed
        ? { label: "Joined", className: "status-resolved" }
        : isRegistered
          ? { label: "Awaiting confirmation", className: "status-closed" }
          : { label: "Approved", className: "status-open" };
      const traderDisplayName = profile?.display_name || invitation.registered_display_name;
      const traderName = traderDisplayName
        ? `<span class="admin-person-name"><span class="muted">${escapeHtml(traderDisplayName)}</span>${profile?.is_admin ? '<span class="tiny-pill admin-person-role">Admin</span>' : ""}</span>`
        : "";
      const avatar = isConfirmed
        ? renderProfileAvatar(profile || {
          display_name: invitation.registered_display_name || invitation.email,
        })
        : isRegistered
          ? '<span class="avatar admin-pending-avatar" aria-hidden="true"><i class="fa-solid fa-hourglass-half"></i></span>'
          : '<span class="avatar admin-approved-avatar" aria-hidden="true">@</span>';
      const activePushDeviceCount = Number(invitation.active_push_device_count) || 0;
      const pushStatus = isConfirmed && ["ready", "off", "not_set_up"].includes(
        invitation.push_notification_status,
      ) ? invitation.push_notification_status : null;
      const pushStatusDetails = {
        ready: { label: "Ready", className: "is-ready" },
        off: { label: "Off", className: "is-off" },
        not_set_up: { label: "Not set up", className: "is-not-set-up" },
      };
      const pushStatusMarkup = pushStatus
        ? `<span class="admin-push-status ${pushStatusDetails[pushStatus].className}" title="${activePushDeviceCount ? `${formatNumber(activePushDeviceCount)} active push ${pluralize(activePushDeviceCount, "device")}` : "No active push devices"}"><span aria-hidden="true"></span>${pushStatusDetails[pushStatus].label}</span>`
        : '<span class="mono admin-push-unavailable" aria-label="Push status not applicable">—</span>';
      const rowActions = isConfirmed
        ? `
          <button class="admin-row-action" data-adjust-member-points="${escapeAttribute(invitation.registered_user_id)}" type="button">Adjust points</button>
          <button class="admin-row-action" data-edit-member-profile="${escapeAttribute(invitation.registered_user_id)}" type="button">Edit profile</button>
        `
        : isRegistered
          ? `<button class="admin-row-action" data-resend-confirmation="${escapeAttribute(invitation.email)}" type="button">Resend confirmation</button>`
          : `<button class="admin-row-action is-danger" data-remove-invitation="${escapeAttribute(invitation.email)}" type="button">Remove approval</button>`;

      return `
        <tr>
          <td class="admin-person-icon-cell">${avatar}</td>
          <td><div class="invitation-email"><strong>${escapeHtml(invitation.email)}</strong>${traderName}</div></td>
          <td><span class="status-pill ${status.className}">${status.label}</span></td>
          <td class="admin-person-push-cell">${pushStatusMarkup}</td>
          <td class="mono admin-person-points-cell">${isConfirmed && profile ? formatNumber(profile.balance) : "—"}</td>
          <td class="mono">${invitation.added_at ? escapeHtml(formatDateTime(invitation.added_at)) : "—"}</td>
          <td class="mono">${isConfirmed ? escapeHtml(formatDateTime(invitation.confirmed_at)) : "—"}</td>
          <td class="admin-person-actions-cell">
            <details class="admin-overflow-menu admin-row-menu">
              <summary class="icon-button" aria-label="Actions for ${escapeAttribute(invitation.registered_display_name || invitation.email)}">
                <i class="fa-solid fa-ellipsis-vertical" aria-hidden="true"></i>
              </summary>
              <div class="admin-overflow-menu-popover">${rowActions}</div>
            </details>
          </td>
        </tr>
      `;
    }).join("");

    return `
      <section class="table-card admin-invitation-card">
        ${invitations.length ? `
          <div data-scrollable-table><div class="table-scroll">
            <table class="data-table invitation-table admin-people-table">
              <caption class="visually-hidden">People</caption>
              <thead><tr><th><span class="visually-hidden">Icon</span></th>${sortableHeader("name", "Email / name")}${sortableHeader("status", "Status")}${sortableHeader("push", "Push")}${sortableHeader("points", "Points", "admin-person-points-heading")}${sortableHeader("approved", "Approved on")}${sortableHeader("joined", "Joined on")}<th>Action</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div></div>
        ` : `
          <div class="empty-state compact-empty-state">
            <div class="empty-state-icon">@</div>
            <h2>No approved addresses yet.</h2>
            <p>Approve an email when the next friend is ready to join.</p>
          </div>
        `}
      </section>
    `;
  }

  function getAdminPushDiagnostics(overview) {
    const browserPermission = "Notification" in window
      ? window.Notification.permission
      : "unsupported";
    const workerStatus = state.serviceWorkerRegistration?.active
      ? "Active"
      : state.serviceWorkerRegistration
        ? "Installing"
        : "Unavailable";
    const installationStatus = isIosDevice()
      ? isStandaloneApp() ? "Home Screen app" : "Home Screen required"
      : "Browser supported";
    const lastSuccessfulDelivery = overview.last_successful_delivery_at
      ? formatRelativeDate(overview.last_successful_delivery_at)
      : "None yet";
    const publicKeyConfigured = hasConfiguredVapidKey();
    const fields = [
      {
        label: "Public push key",
        value: publicKeyConfigured ? "Configured" : "Needs setup",
        state: publicKeyConfigured ? "healthy" : "blocker",
        detail: publicKeyConfigured
          ? "The browser-safe delivery key is available."
          : "Add the public push key to the site settings.",
        problem: "The public push key needs to be configured.",
      },
      {
        label: "Service worker",
        value: workerStatus === "Installing" ? "Starting" : workerStatus,
        state: workerStatus === "Active"
          ? "healthy"
          : workerStatus === "Installing" ? "optional" : "blocker",
        detail: workerStatus === "Active"
          ? "The notification service is running."
          : workerStatus === "Installing"
            ? "The notification service is still starting."
            : "Reload the page. If this continues, the site setup needs to be checked.",
        problem: "The notification service is unavailable on this browser.",
      },
      {
        label: "Browser permission",
        value: browserPermission === "granted"
          ? "Granted"
          : browserPermission === "denied"
            ? "Blocked"
            : browserPermission === "default" ? "Not requested" : "Unsupported",
        state: browserPermission === "granted"
          ? "healthy"
          : browserPermission === "default" ? "optional" : "blocker",
        detail: browserPermission === "granted"
          ? "This browser allows notifications."
          : browserPermission === "denied"
            ? "Allow notifications in this browser or device's settings."
            : browserPermission === "default"
              ? "Permission will be requested when push is enabled."
              : "This browser cannot display push notifications.",
        problem: browserPermission === "denied"
          ? "Notification permission is blocked in this browser."
          : "This browser does not support notifications.",
      },
      {
        label: "Current browser",
        value: state.currentPushSubscriptionActive ? "Enrolled" : "Not enrolled",
        state: state.currentPushSubscriptionActive ? "healthy" : "optional",
        detail: state.currentPushSubscriptionActive
          ? "This browser can receive selected push alerts."
          : "Push has not been set up on this browser.",
        action: state.currentPushSubscriptionActive ? null : "push-settings",
      },
      {
        label: "Installation",
        value: installationStatus,
        state: installationStatus === "Home Screen required" ? "blocker" : "healthy",
        detail: installationStatus === "Home Screen required"
          ? "Open this site in Safari and add it to your Home Screen."
          : installationStatus === "Home Screen app"
            ? "The app is installed for push delivery."
            : "This browser can support push delivery.",
        problem: "Install the app on your Home Screen to enable push.",
      },
      {
        label: "Last accepted push",
        value: lastSuccessfulDelivery,
        state: overview.last_successful_delivery_at ? "healthy" : "optional",
        detail: overview.last_successful_delivery_at
          ? "A push service has recently accepted a delivery."
          : "No device has accepted a push yet.",
      },
    ];
    const blockers = fields.filter((field) => field.state === "blocker");
    const optionalSteps = fields.filter((field) => field.state === "optional");

    return {
      needsAttention: blockers.length > 0,
      headline: blockers.length ? "Push setup needs attention" : "Push setup is ready",
      summary: blockers.length
        ? blockers[0].problem
        : optionalSteps.length
          ? "No blocking issues were found. Optional setup steps are highlighted below."
          : "Everything needed for push delivery is working.",
      fields,
    };
  }

  function buildAdminNotificationControlsMarkup(overview) {
    const mode = overview.mode || "off";
    const currentMode = NOTIFICATION_MODE_OPTIONS.find((option) => option.value === mode)
      || NOTIFICATION_MODE_OPTIONS[0];
    const diagnostics = getAdminPushDiagnostics(overview);
    const failedDeliveries = Number(overview.failed_deliveries) || 0;

    return `
      <section class="panel notification-mode-card">
        <div class="notification-mode-header">
          <div class="notification-section-heading">
            <span class="notification-section-icon"><i class="fa-solid fa-bolt" aria-hidden="true"></i></span>
            <div>
              <div class="notification-mode-title">
                <h2>Automatic notifications</h2>
                <span class="status-pill notification-mode-status ${currentMode.className}">${currentMode.label}</span>
              </div>
              <p>This controls automatic market alerts. Manual tests remain available below.</p>
            </div>
          </div>
        </div>
        <form class="notification-mode-form" id="notification-mode-form" data-current-mode="${escapeAttribute(mode)}">
          <fieldset class="notification-mode-options">
            <legend class="visually-hidden">Automatic notification mode</legend>
            ${NOTIFICATION_MODE_OPTIONS.map((option) => `
              <label class="notification-mode-option ${option.className}">
                <input type="radio" name="deliveryMode" value="${option.value}"${option.value === mode ? " checked" : ""} />
                <span class="notification-mode-option-icon"><i class="fa-solid fa-${option.icon}" aria-hidden="true"></i></span>
                <span><strong>${option.label}</strong><small>${option.description}</small></span>
              </label>
            `).join("")}
          </fieldset>
          <div class="notification-mode-footer">
            <div class="notification-mode-health" aria-label="Notification delivery health">
              <div><strong>${formatNumber(overview.active_subscriptions)}</strong><span>Active ${pluralize(overview.active_subscriptions, "device")}</span></div>
              <div><strong>${formatNumber(overview.pending_deliveries)}</strong><span>Waiting</span></div>
              ${failedDeliveries ? `
                <button class="notification-mode-health-item has-failures" data-show-failed-notifications type="button" aria-label="Show ${formatNumber(failedDeliveries)} failed or expired deliveries in notification history">
                  <strong>${formatNumber(failedDeliveries)}</strong><span>Failed / expired</span>
                </button>
              ` : '<div><strong>0</strong><span>Failed / expired</span></div>'}
            </div>
            <div class="notification-mode-footer-actions">
              <button class="notification-push-setup" data-open-notification-diagnostics type="button">
                <span>Push setup</span>
                <span class="notification-push-setup-status ${diagnostics.needsAttention ? "is-attention" : "is-ready"}">${diagnostics.needsAttention ? "Needs attention" : "Ready"}</span>
                <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
              </button>
              <button class="button button-primary notification-mode-apply hidden" type="submit">Apply mode</button>
            </div>
          </div>
        </form>
      </section>
    `;
  }

  function buildAdminNotificationUnavailableMarkup(notificationError = null) {
    return `
      <section class="panel notification-lab-panel">
        <div class="panel-heading">
          <div>
            <h2>Delivery controls unavailable</h2>
            <p>${escapeHtml(notificationError?.message || "Install the notification migration to activate the lab.")}</p>
          </div>
        </div>
      </section>
    `;
  }

  function buildNotificationTestResultMarkup(result = state.notificationTestResult) {
    if (!result) {
      return '<div class="notification-test-result hidden" id="notification-test-result" aria-live="polite"></div>';
    }

    const tone = ["success", "pending", "error"].includes(result.tone)
      ? result.tone
      : "pending";
    const icon = tone === "success"
      ? "circle-check"
      : tone === "error" ? "circle-exclamation" : "clock";

    return `
      <div class="notification-test-result is-${tone}" id="notification-test-result" aria-live="polite">
        <span class="notification-test-result-icon" aria-hidden="true"><i class="fa-solid fa-${icon}"></i></span>
        <div>
          <strong>${escapeHtml(result.title)}</strong>
          <p>${escapeHtml(result.detail)}</p>
        </div>
        ${result.notificationId ? `<button class="button button-secondary button-small" data-view-notification-deliveries="${escapeAttribute(result.notificationId)}" type="button">View details</button>` : ""}
      </div>
    `;
  }

  function buildAdminNotificationLabMarkup(overview, notificationError = null) {
    if (notificationError || !overview) {
      return buildAdminNotificationUnavailableMarkup(notificationError);
    }

    const markets = getAllMarkets();
    const selectedMarket = markets[0] || null;
    const template = getNotificationTemplate("new_market", selectedMarket);
    const deviceOptions = state.pushSubscriptions.map((subscription) => {
      const isCurrentDevice = subscription.endpoint === state.currentPushSubscriptionEndpoint;
      return `
        <div class="notification-device-option">
          <label class="notification-device-choice">
            <input type="checkbox" name="subscriptionId" value="${escapeAttribute(subscription.id)}" checked />
            <span>
              <strong>${escapeHtml(subscription.device_label)}</strong>
              <small>Connected ${escapeHtml(formatRelativeDate(subscription.last_seen_at))}</small>
            </span>
          </label>
          ${isCurrentDevice ? '<span class="tiny-pill notification-device-current">This device</span>' : ""}
        </div>
      `;
    }).join("");
    const isOpen = Boolean(state.notificationLabOpen);

    return `
      <section class="panel notification-lab-panel${isOpen ? " is-open" : ""}">
        <button class="notification-lab-heading notification-lab-toggle" id="notification-lab-toggle" type="button" aria-expanded="${isOpen}" aria-controls="notification-lab-content">
          <span class="notification-section-heading">
            <span class="notification-section-icon"><i class="fa-solid fa-flask" aria-hidden="true"></i></span>
            <span class="notification-lab-heading-copy">
              <span class="notification-lab-title" role="heading" aria-level="2">Test lab</span>
              <span class="notification-lab-description">Tests are enforced as administrator-to-self. Production wording remains fixed.</span>
            </span>
          </span>
          <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
        </button>
        <div class="notification-lab-content${isOpen ? "" : " hidden"}" id="notification-lab-content">
          ${buildNotificationTestResultMarkup()}
          <div class="notification-lab-grid">
            <form id="notification-test-form" class="notification-test-form">
              <div class="form-grid two-column">
                <div class="form-field">
                  <label for="notification-test-kind">Notification type</label>
                  <select id="notification-test-kind" name="kind">
                    <option value="new_market">New market</option>
                    <option value="closing_soon">Closing soon</option>
                    <option value="resolution">Resolution</option>
                    <option value="void">Voided market</option>
                  </select>
                </div>
                <div class="form-field">
                  <label for="notification-test-market">Preview market</label>
                  <select id="notification-test-market" name="marketId">
                    <option value="">Fictional sample</option>
                    ${markets.map((market) => `
                      <option value="${market.id}"${market.id === selectedMarket?.id ? " selected" : ""}>${escapeHtml(market.question)}</option>
                    `).join("")}
                  </select>
                </div>
              </div>
              <div class="form-field">
                <label for="notification-test-title">Title</label>
                <input id="notification-test-title" name="title" maxlength="82" value="${escapeAttribute(template.title)}" required />
              </div>
              <div class="form-field">
                <label for="notification-test-body">Message</label>
                <textarea id="notification-test-body" name="body" maxlength="300" required>${escapeHtml(template.body)}</textarea>
              </div>
              <input id="notification-test-target" name="targetUrl" type="hidden" value="${escapeAttribute(template.targetUrl)}" />
              <fieldset class="notification-device-field">
                <legend>Your delivery devices</legend>
                ${deviceOptions || '<p class="push-capability-note is-warning">Enable push from Settings on one of your devices. The test will still create an administrator audit record.</p>'}
              </fieldset>
              <button class="button button-primary" type="submit">Send test to me</button>
            </form>

            <div class="notification-preview-panel">
              <p class="eyebrow">Lock-screen preview</p>
              <div class="notification-preview">
                <div class="notification-preview-app">
                  <img src="img/icon-192.png" alt="" />
                  <span>The Friend Exchange</span>
                  <small>now</small>
                </div>
                <strong id="notification-preview-title">[TEST] ${escapeHtml(template.title)}</strong>
                <p id="notification-preview-body">${escapeHtml(template.body)}</p>
              </div>
              <p class="fine-print">Operating systems may truncate long questions. Tapping opens the selected market.</p>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function buildAdminNotificationHistoryMarkup(overview, notificationError = null) {
    if (notificationError || !overview) {
      return buildAdminNotificationUnavailableMarkup(notificationError);
    }

    const notifications = overview.notifications || [];
    const activeFilter = NOTIFICATION_HISTORY_FILTERS.some(
      (filter) => filter.value === state.notificationHistoryFilter,
    ) ? state.notificationHistoryFilter : "all";
    const matchesFilter = (notification) => {
      if (activeFilter === "failed") return Number(notification.failed_count) > 0;
      if (activeFilter === "tests") return Boolean(notification.is_test);
      if (activeFilter === "automatic") return !notification.is_test;
      return true;
    };
    let matchingIndex = 0;
    const matchingCount = notifications.filter(matchesFilter).length;
    const recentNotifications = notifications.map((notification) => {
      const matches = matchesFilter(notification);
      const visible = matches && matchingIndex < NOTIFICATION_HISTORY_PAGE_SIZE;
      if (matches) matchingIndex += 1;
      return `
      <tr data-notification-history-row data-history-category="${notification.is_test ? "tests" : "automatic"}" data-history-failed="${Number(notification.failed_count) > 0}"${visible ? "" : ' class="hidden"'}>
        <td>
          <div class="notification-history-title">
            <strong>${escapeHtml(notification.title)}</strong>
            ${notification.is_test ? '<span class="tiny-pill">Test</span>' : ""}
          </div>
          <span class="muted">${escapeHtml(notification.body)}</span>
        </td>
        <td>${escapeHtml(NOTIFICATION_KIND_LABELS[notification.kind] || notification.kind)}</td>
        <td><span class="status-pill status-${escapeAttribute(notification.delivery_mode === "live" ? "resolved" : "closed")}">${escapeHtml(notification.delivery_mode)}</span></td>
        <td class="mono">${formatNumber(notification.actual_recipient_count)} / ${formatNumber(notification.intended_recipient_count)}</td>
        <td>
          <button class="notification-delivery-summary" data-view-notification-deliveries="${escapeAttribute(notification.id)}" type="button">
            <strong>${formatNumber(notification.sent_count)} sent${notification.failed_count ? ` · ${formatNumber(notification.failed_count)} failed` : ""}</strong>
            <small>View details</small>
          </button>
        </td>
        <td class="mono">${escapeHtml(formatDateTime(notification.created_at))}</td>
      </tr>
    `;
    }).join("");
    const visibleCount = Math.min(NOTIFICATION_HISTORY_PAGE_SIZE, matchingCount);
    const pagination = notifications.length > NOTIFICATION_HISTORY_PAGE_SIZE ? `
      <div class="notification-history-pagination${matchingCount ? "" : " hidden"}" id="notification-history-pagination">
        <span id="notification-history-count">Showing ${formatNumber(visibleCount)} of ${formatNumber(matchingCount)} matching records</span>
        <div>
          <button class="button button-ghost button-small hidden" id="show-less-notification-history" type="button">Show less</button>
          <button class="button button-secondary button-small${matchingCount > NOTIFICATION_HISTORY_PAGE_SIZE ? "" : " hidden"}" id="view-more-notification-history" type="button">View more</button>
        </div>
      </div>
    ` : "";

    return `
      <section class="table-card notification-history-card">
        <div class="admin-table-heading">
          <div class="notification-section-heading">
            <span class="notification-section-icon"><i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i></span>
            <div><h2>Notification history</h2><p>Select a delivery summary to inspect its device attempts.</p></div>
          </div>
          <details class="admin-overflow-menu">
            <summary class="icon-button" aria-label="History actions"><i class="fa-solid fa-ellipsis"></i></summary>
            <div class="admin-overflow-menu-popover">
              <button class="text-button" id="clear-notification-test-history" type="button">Clear test history</button>
            </div>
          </details>
        </div>
        ${notifications.length ? `
          <div class="notification-history-toolbar" role="group" aria-label="Filter notification history">
            ${NOTIFICATION_HISTORY_FILTERS.map((filter) => `
              <button class="filter-chip${filter.value === activeFilter ? " active" : ""}" data-notification-history-filter="${filter.value}" type="button" aria-pressed="${filter.value === activeFilter}">${filter.label}</button>
            `).join("")}
          </div>
        ` : ""}
        ${recentNotifications ? `
          <div id="notification-history-table-wrap"${matchingCount ? "" : ' class="hidden"'} data-scrollable-table><div class="table-scroll">
            <table class="data-table notification-history-table">
              <thead><tr><th>Notice</th><th>Type</th><th>Mode</th><th>Recipients</th><th>Delivery</th><th>Created</th></tr></thead>
              <tbody>${recentNotifications}</tbody>
            </table>
          </div></div>
          <div class="notification-history-filter-empty${matchingCount ? " hidden" : ""}" id="notification-history-filter-empty"><p>No notifications match this filter.</p></div>
          ${pagination}
        ` : '<div class="notification-empty"><p>No notification records yet.</p></div>'}
      </section>
    `;
  }

  function buildAdminNotificationsMarkup(overview, notificationError = null) {
    if (notificationError || !overview) {
      return buildAdminNotificationUnavailableMarkup(notificationError);
    }

    return `
      ${buildAdminNotificationControlsMarkup(overview)}
      ${buildAdminNotificationHistoryMarkup(overview)}
      ${buildAdminNotificationLabMarkup(overview)}
    `;
  }

  function buildAdminInvitationMarkup(invitations, notificationOverview = null, notificationError = null) {
    return buildAdminPageMarkup(
      "people",
      invitations,
      notificationOverview,
      null,
      notificationError,
    );
  }

  function bindAdminPageEvents(invitations) {
    const joinedUserIds = invitations
      .filter((invitation) => invitation.registered_user_id && invitation.confirmed_at)
      .map((invitation) => invitation.registered_user_id);
    document.querySelectorAll("[data-admin-approve-email]").forEach((button) => {
      button.addEventListener("click", () => openApproveEmailModal(invitations));
    });
    document.querySelectorAll("[data-admin-adjust-points]").forEach((button) => {
      button.addEventListener("click", () => openAdminPointsModal("", joinedUserIds));
    });
    document.querySelectorAll("[data-admin-edit-profile]").forEach((button) => {
      button.addEventListener("click", () => openAdminProfileModal("", joinedUserIds));
    });
    document.querySelectorAll("[data-adjust-member-points]").forEach((button) => {
      button.addEventListener("click", () => {
        button.closest("details")?.removeAttribute("open");
        openAdminPointsModal(button.dataset.adjustMemberPoints, joinedUserIds);
      });
    });
    document.querySelectorAll("[data-edit-member-profile]").forEach((button) => {
      button.addEventListener("click", () => {
        button.closest("details")?.removeAttribute("open");
        openAdminProfileModal(button.dataset.editMemberProfile, joinedUserIds);
      });
    });
    document.querySelectorAll("[data-resend-confirmation]").forEach((button) => {
      button.addEventListener("click", () => resendSignupConfirmation(
        button.dataset.resendConfirmation,
        button,
      ));
    });
    document.querySelectorAll("[data-remove-invitation]").forEach((button) => {
      button.addEventListener("click", () => {
        button.closest("details")?.removeAttribute("open");
        openRemoveInvitationModal(button.dataset.removeInvitation);
      });
    });
    document.querySelectorAll("[data-admin-people-sort]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextKey = button.dataset.adminPeopleSort;
        if (state.adminPeopleSortKey === nextKey) {
          state.adminPeopleSortDirection = state.adminPeopleSortDirection === "desc"
            ? "asc"
            : "desc";
        } else {
          state.adminPeopleSortKey = nextKey;
          state.adminPeopleSortDirection = ["name", "status", "push"].includes(nextKey)
            ? "asc"
            : "desc";
        }
        dom.main.innerHTML = buildAdminPageMarkup(
          "people",
          invitations,
          state.notificationAdminOverview,
        );
        bindAdminPageEvents(invitations);
        setupScrollableTableFades();
      });
    });
    document.querySelector("#retry-admin-button")?.addEventListener("click", renderAdmin);
  }

  function openApproveEmailModal(invitations = []) {
    if (!state.profile?.is_admin) return;

    openModal(`
      <div class="modal-header">
        <div>
          <p class="eyebrow">People &amp; access</p>
          <h2>Approve an email address</h2>
          <p>The person may register after this address is approved.</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <form id="approve-email-form">
        <div class="modal-body">
          <div class="form-field">
            <label for="approved-email">Email address</label>
            <input id="approved-email" name="email" type="email" maxlength="254" autocomplete="off" placeholder="friend@example.com" required />
          </div>
        </div>
        <div class="modal-footer">
          <button class="button button-secondary" data-modal-close type="button">Cancel</button>
          <button class="button button-primary" type="submit">Approve email</button>
        </div>
      </form>
    `);

    const form = document.querySelector("#approve-email-form");
    const emailInput = document.querySelector("#approved-email");
    emailInput?.focus();
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = String(new FormData(event.currentTarget).get("email") || "").trim();
      const submit = event.currentTarget.querySelector("button[type='submit']");
      const wasAlreadyApproved = invitations.some(
        (invitation) => invitation.email.toLowerCase() === email.toLowerCase(),
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

      closeModal();
      await renderAdmin();
      showToast(
        wasAlreadyApproved
          ? `${email} is already in the approved-email registry.`
          : `${email} may now create an account.`,
        "success",
      );
    });
  }

  async function resendSignupConfirmation(email, button = null) {
    if (!state.profile?.is_admin) return;

    setButtonLoading(button, true, "Sending…");
    const { error } = await state.client.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });
    setButtonLoading(button, false);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    button?.closest("details")?.removeAttribute("open");
    showToast(`A new confirmation email was sent to ${email}.`, "success");
  }

  async function applyNotificationMode(mode, button = null, { closeOnSuccess = false } = {}) {
    setButtonLoading(button, true, "Updating…");
    const { error } = await state.client.rpc("admin_set_notification_mode", {
      p_delivery_mode: mode,
    });
    setButtonLoading(button, false);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    if (closeOnSuccess) closeModal();
    await renderAdmin();
    const modeLabel = NOTIFICATION_MODE_OPTIONS.find((option) => option.value === mode)?.label
      || mode;
    showToast(`Automatic notifications are now ${modeLabel.toLowerCase()}.`, "success");
  }

  function getLiveNotificationImpact(overview = state.notificationAdminOverview) {
    const impact = overview?.live_impact;
    if (!impact) return null;

    return [
      { key: "new_market", label: "New markets", icon: "bullhorn" },
      { key: "closing_soon", label: "Closing soon", icon: "hourglass-half" },
      { key: "resolution", label: "Resolutions & voids", icon: "gavel" },
    ].map((item) => ({
      ...item,
      members: Number(impact[item.key]?.members) || 0,
      devices: Number(impact[item.key]?.devices) || 0,
    }));
  }

  function confirmLiveNotificationMode(button) {
    const liveImpact = getLiveNotificationImpact();
    openModal(`
      <div class="modal-header">
        <div>
          <p class="eyebrow">Enable live delivery</p>
          <h2>Open the notification desk?</h2>
          <p>Future events will be recorded and pushed to opted-in member devices.</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <section class="notification-live-impact" aria-label="Current opted-in notification reach">
          <div class="notification-live-impact-heading">
            <strong>Current opted-in reach</strong>
            <span>Based on active push devices</span>
          </div>
          ${liveImpact ? `
            <div class="notification-live-impact-grid">
              ${liveImpact.map((item) => `
                <div data-live-impact-key="${item.key}">
                  <span class="notification-live-impact-icon"><i class="fa-solid fa-${item.icon}" aria-hidden="true"></i></span>
                  <strong>${escapeHtml(item.label)}</strong>
                  <span>${formatNumber(item.members)} ${pluralize(item.members, "member")} · ${formatNumber(item.devices)} ${pluralize(item.devices, "device")}</span>
                </div>
              `).join("")}
            </div>
            <p>Actual totals can vary by event; a market creator does not receive their own new-market alert.</p>
          ` : `
            <p>Current reach totals are unavailable. Live delivery will still follow each member’s saved preferences.</p>
          `}
        </section>
        <p class="trade-warning">Test and shadow records will not be sent retroactively.</p>
      </div>
      <div class="modal-footer">
        <button class="button button-secondary" data-modal-close type="button">Keep current mode</button>
        <button class="button button-primary" id="confirm-live-notifications" type="button">Enable Live mode</button>
      </div>
    `);

    document.querySelector("#confirm-live-notifications")?.addEventListener("click", (event) => {
      void applyNotificationMode("live", event.currentTarget || button, { closeOnSuccess: true });
    });
  }

  function openNotificationDiagnosticsModal(overview) {
    const diagnostics = getAdminPushDiagnostics(overview);
    openModal(`
      <div class="modal-header">
        <div>
          <p class="eyebrow">Notifications</p>
          <h2>Push diagnostics</h2>
          <p>Technical details for this browser and the current delivery setup.</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <div class="notification-diagnostic-summary ${diagnostics.needsAttention ? "is-attention" : "is-ready"}">
          <span class="notification-diagnostic-summary-icon" aria-hidden="true"><i class="fa-solid fa-${diagnostics.needsAttention ? "triangle-exclamation" : "circle-check"}"></i></span>
          <div>
            <strong>${escapeHtml(diagnostics.headline)}</strong>
            <p>${escapeHtml(diagnostics.summary)}</p>
          </div>
        </div>
        <div class="notification-diagnostic-grid" aria-label="Current browser push diagnostics">
          ${diagnostics.fields.map((field) => `
            <div class="notification-diagnostic-item is-${field.state}">
              <span>${escapeHtml(field.label)}</span>
              <strong><i class="fa-solid fa-${field.state === "healthy" ? "circle-check" : field.state === "blocker" ? "circle-exclamation" : "circle-info"}" aria-hidden="true"></i>${escapeHtml(field.value)}</strong>
              <small>${escapeHtml(field.detail)}</small>
              ${field.action === "push-settings" ? '<button class="button button-secondary button-small notification-diagnostic-action" id="open-push-settings-from-diagnostics" type="button">Open push settings</button>' : ""}
            </div>
          `).join("")}
        </div>
      </div>
      <div class="modal-footer">
        <button class="button button-secondary" data-modal-close type="button">Done</button>
      </div>
    `, "notification-diagnostics-modal");

    document.querySelector("#open-push-settings-from-diagnostics")?.addEventListener("click", () => {
      closeModal();
      window.location.hash = "#/settings/push";
    });
  }

  function openNotificationDeliveryDetailsModal(notification, deliveries) {
    const rows = deliveries.map((delivery) => `
      <div class="notification-delivery-detail-row">
        <div>
          <strong>${escapeHtml(delivery.device_label || "Removed device")}</strong>
          <small>${escapeHtml(delivery.display_name || "Unknown trader")}</small>
        </div>
        <span class="status-pill status-${delivery.status === "sent" ? "resolved" : delivery.status === "failed" || delivery.status === "expired" ? "void" : "closed"}">${escapeHtml(notificationDeliveryStatus(delivery.status))}</span>
        <div class="notification-delivery-detail-meta">
          <span>${formatNumber(delivery.attempt_count)} ${pluralize(delivery.attempt_count, "attempt")}</span>
          <span>${delivery.response_status ? `HTTP ${formatNumber(delivery.response_status)}` : "No response code"}</span>
        </div>
        ${delivery.last_error ? `<p>${escapeHtml(delivery.last_error)}</p>` : ""}
      </div>
    `).join("");

    openModal(`
      <div class="modal-header">
        <div>
          <p class="eyebrow">Delivery details</p>
          <h2>${escapeHtml(notification.title)}</h2>
          <p>${escapeHtml(notification.body)}</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        ${rows || '<div class="notification-empty"><p>No device deliveries were created for this notification.</p></div>'}
        <p class="fine-print notification-delivery-detail-note">An accepted push confirms the browser service received it, not that the recipient opened it.</p>
      </div>
      <div class="modal-footer">
        <button class="button button-secondary" data-modal-close type="button">Done</button>
      </div>
    `, "notification-delivery-modal");
  }

  function openClearNotificationTestHistoryModal() {
    openModal(`
      <div class="modal-header">
        <div>
          <p class="eyebrow">Clear test history</p>
          <h2>Remove the testing paper trail?</h2>
          <p>This cannot be undone.</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <p style="margin-top:0">
          This permanently removes self-tests, Test-mode shadow records, and their delivery attempts.
          Live notification records, push preferences, and enrolled devices will remain untouched.
        </p>
      </div>
      <div class="modal-footer">
        <button class="button button-secondary" data-modal-close type="button">Keep history</button>
        <button class="button button-danger" id="confirm-clear-notification-test-history" type="button">Clear test history</button>
      </div>
    `);

    document.querySelector("#confirm-clear-notification-test-history")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      setButtonLoading(button, true, "Clearing…");
      const { data, error } = await state.client.rpc("admin_clear_notification_test_history");

      if (error) {
        setButtonLoading(button, false);
        showToast(error.message, "error");
        return;
      }

      const notificationCount = Number(data?.notification_count) || 0;
      const deliveryCount = Number(data?.delivery_count) || 0;
      closeModal();
      await renderAdmin();
      showToast(
        notificationCount
          ? `Cleared ${formatNumber(notificationCount)} test ${pluralize(notificationCount, "record")} and ${formatNumber(deliveryCount)} delivery ${pluralize(deliveryCount, "attempt")}.`
          : "There was no test history to clear.",
        "success",
      );
    });
  }

  function bindAdminNotificationPageEvents() {
    const overview = state.notificationAdminOverview;
    if (!overview) return;

    const labToggle = document.querySelector("#notification-lab-toggle");
    const labPanel = labToggle?.closest(".notification-lab-panel");
    const labContent = document.querySelector("#notification-lab-content");
    labToggle?.addEventListener("click", () => {
      state.notificationLabOpen = !state.notificationLabOpen;
      labToggle.setAttribute("aria-expanded", String(state.notificationLabOpen));
      labContent?.classList.toggle("hidden", !state.notificationLabOpen);
      labPanel?.classList.toggle("is-open", state.notificationLabOpen);
    });

    document.querySelector("[data-open-notification-diagnostics]")?.addEventListener("click", () => {
      openNotificationDiagnosticsModal(overview);
    });
    const modeForm = document.querySelector("#notification-mode-form");
    const modeInputs = [...document.querySelectorAll("[name='deliveryMode']")];
    const applyModeButton = modeForm?.querySelector("button[type='submit']");
    const currentMode = modeForm?.dataset.currentMode || "off";
    modeInputs.forEach((input) => {
      input.addEventListener("change", () => {
        applyModeButton?.classList.toggle("hidden", input.value === currentMode);
      });
    });
    modeForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const selectedMode = String(new FormData(event.currentTarget).get("deliveryMode") || currentMode);
      if (selectedMode === currentMode) return;
      if (selectedMode === "live" && currentMode !== "live") {
        confirmLiveNotificationMode(applyModeButton);
        return;
      }
      await applyNotificationMode(selectedMode, applyModeButton);
    });
    document.querySelectorAll("[data-view-notification-deliveries]").forEach((button) => {
      button.addEventListener("click", () => {
        const notification = (overview.notifications || []).find(
          (item) => String(item.id) === button.dataset.viewNotificationDeliveries,
        );
        if (!notification) return;
        const deliveries = (overview.deliveries || []).filter(
          (delivery) => String(delivery.notification_id) === String(notification.id),
        );
        openNotificationDeliveryDetailsModal(notification, deliveries);
      });
    });

    document.querySelector("#clear-notification-test-history")?.addEventListener("click", () => {
      openClearNotificationTestHistoryModal();
    });

    const historyRows = [...document.querySelectorAll("[data-notification-history-row]")];
    const historyFilterButtons = [...document.querySelectorAll("[data-notification-history-filter]")];
    const historyTableWrap = document.querySelector("#notification-history-table-wrap");
    const historyFilterEmpty = document.querySelector("#notification-history-filter-empty");
    const historyPagination = document.querySelector("#notification-history-pagination");
    const viewMoreHistoryButton = document.querySelector("#view-more-notification-history");
    const showLessHistoryButton = document.querySelector("#show-less-notification-history");
    const historyCount = document.querySelector("#notification-history-count");
    let historyVisibleLimit = NOTIFICATION_HISTORY_PAGE_SIZE;
    const rowMatchesHistoryFilter = (row, filter) => {
      if (filter === "failed") return row.dataset.historyFailed === "true";
      if (filter === "tests" || filter === "automatic") {
        return row.dataset.historyCategory === filter;
      }
      return true;
    };
    const updateVisibleHistory = () => {
      const activeFilter = NOTIFICATION_HISTORY_FILTERS.some(
        (filter) => filter.value === state.notificationHistoryFilter,
      ) ? state.notificationHistoryFilter : "all";
      const matchingRows = historyRows.filter((row) => rowMatchesHistoryFilter(row, activeFilter));
      const visibleCount = Math.min(historyVisibleLimit, matchingRows.length);
      historyRows.forEach((row) => {
        const matchingIndex = matchingRows.indexOf(row);
        row.classList.toggle("hidden", matchingIndex < 0 || matchingIndex >= visibleCount);
      });
      historyFilterButtons.forEach((button) => {
        const isActive = button.dataset.notificationHistoryFilter === activeFilter;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
      historyTableWrap?.classList.toggle("hidden", matchingRows.length === 0);
      historyFilterEmpty?.classList.toggle("hidden", matchingRows.length > 0);
      historyPagination?.classList.toggle("hidden", matchingRows.length === 0);
      if (historyCount) {
        historyCount.textContent = `Showing ${formatNumber(visibleCount)} of ${formatNumber(matchingRows.length)} matching records`;
      }
      viewMoreHistoryButton?.classList.toggle("hidden", visibleCount >= matchingRows.length);
      showLessHistoryButton?.classList.toggle(
        "hidden",
        visibleCount <= NOTIFICATION_HISTORY_PAGE_SIZE,
      );
    };
    const applyHistoryFilter = (filter, { scroll = false } = {}) => {
      state.notificationHistoryFilter = NOTIFICATION_HISTORY_FILTERS.some(
        (option) => option.value === filter,
      ) ? filter : "all";
      historyVisibleLimit = NOTIFICATION_HISTORY_PAGE_SIZE;
      updateVisibleHistory();
      if (scroll) {
        document.querySelector(".notification-history-card")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    };

    historyFilterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        applyHistoryFilter(button.dataset.notificationHistoryFilter || "all");
      });
    });
    document.querySelector("[data-show-failed-notifications]")?.addEventListener("click", () => {
      applyHistoryFilter("failed", { scroll: true });
    });

    viewMoreHistoryButton?.addEventListener("click", () => {
      historyVisibleLimit += NOTIFICATION_HISTORY_PAGE_SIZE;
      updateVisibleHistory();
    });
    showLessHistoryButton?.addEventListener("click", () => {
      historyVisibleLimit = NOTIFICATION_HISTORY_PAGE_SIZE;
      updateVisibleHistory();
    });
    updateVisibleHistory();

    const testForm = document.querySelector("#notification-test-form");
    const kindInput = document.querySelector("#notification-test-kind");
    const marketInput = document.querySelector("#notification-test-market");
    const titleInput = document.querySelector("#notification-test-title");
    const bodyInput = document.querySelector("#notification-test-body");
    const targetInput = document.querySelector("#notification-test-target");
    const previewTitle = document.querySelector("#notification-preview-title");
    const previewBody = document.querySelector("#notification-preview-body");

    const updatePreview = ({ resetCopy = false } = {}) => {
      const market = getAllMarkets().find((item) => String(item.id) === marketInput?.value) || null;
      const template = getNotificationTemplate(kindInput?.value || "new_market", market);
      if (resetCopy) {
        titleInput.value = template.title;
        bodyInput.value = template.body;
        targetInput.value = template.targetUrl;
      }
      previewTitle.textContent = `[TEST] ${titleInput.value}`;
      previewBody.textContent = bodyInput.value;
    };

    kindInput?.addEventListener("change", () => updatePreview({ resetCopy: true }));
    marketInput?.addEventListener("change", () => updatePreview({ resetCopy: true }));
    titleInput?.addEventListener("input", () => updatePreview());
    bodyInput?.addEventListener("input", () => updatePreview());

    testForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      state.notificationLabOpen = true;
      state.notificationTestResult = null;
      const form = new FormData(event.currentTarget);
      const submit = event.currentTarget.querySelector("button[type='submit']");
      const subscriptionIds = form.getAll("subscriptionId").map(String);
      setButtonLoading(submit, true, "Filing test…");

      const { data, error } = await state.client.rpc("admin_send_notification_test", {
        p_kind: String(form.get("kind") || "new_market"),
        p_title: String(form.get("title") || "").trim(),
        p_body: String(form.get("body") || "").trim(),
        p_target_url: String(form.get("targetUrl") || "#/markets"),
        p_subscription_ids: subscriptionIds,
      });

      if (error) {
        setButtonLoading(submit, false);
        state.notificationTestResult = {
          tone: "error",
          title: "Test could not be sent.",
          detail: error.message,
          notificationId: null,
        };
        await renderAdmin();
        showToast(error.message, "error");
        return;
      }

      const deliveryIds = Array.isArray(data?.delivery_ids) ? data.delivery_ids : [];
      const results = await Promise.all(deliveryIds.map((deliveryId) =>
        state.client.functions.invoke("notification-delivery", {
          body: { delivery_id: deliveryId },
        })
      ));
      const deliveredCount = results.filter(
        (result) => !result.error && result.data?.status === "sent",
      ).length;
      const failureCount = results.filter(
        (result) => result.error || ["failed", "expired"].includes(result.data?.status),
      ).length;
      const pendingCount = Math.max(deliveryIds.length - deliveredCount - failureCount, 0);
      const notificationId = Number(data?.notification_id) || null;
      if (!deliveryIds.length) {
        state.notificationTestResult = {
          tone: "pending",
          title: "Test record created.",
          detail: "No push devices were selected, so no lock-screen delivery was attempted.",
          notificationId,
        };
      } else if (failureCount) {
        state.notificationTestResult = {
          tone: "error",
          title: `Delivered to ${formatNumber(deliveredCount)} of ${formatNumber(deliveryIds.length)} ${pluralize(deliveryIds.length, "device")}.`,
          detail: `${formatNumber(failureCount)} ${pluralize(failureCount, "delivery")} failed. Open the delivery details for the recorded response.`,
          notificationId,
        };
      } else if (pendingCount) {
        state.notificationTestResult = {
          tone: "pending",
          title: `Test queued for ${formatNumber(deliveryIds.length)} ${pluralize(deliveryIds.length, "device")}.`,
          detail: `${formatNumber(pendingCount)} ${pluralize(pendingCount, "delivery")} still processing.`,
          notificationId,
        };
      } else {
        state.notificationTestResult = {
          tone: "success",
          title: `Delivered to ${formatNumber(deliveredCount)} of ${formatNumber(deliveryIds.length)} ${pluralize(deliveryIds.length, "device")}.`,
          detail: "The selected push services accepted the test.",
          notificationId,
        };
      }
      setButtonLoading(submit, false);
      await refreshNotificationData();
      await renderAdmin();

      if (!deliveryIds.length) {
        showToast("Test record created. Enable a push device to test lock-screen delivery.", "success");
      } else if (failureCount) {
        showToast("Test filed, but one or more push attempts failed. Review the delivery table.", "error");
      } else {
        showToast("Test filed and dispatched to your selected devices.", "success");
      }
    });
  }

  function openRemovePushSubscriptionModal(subscription) {
    openModal(`
      <div class="modal-header">
        <div>
          <p class="eyebrow">Remove device</p>
          <h2>Stop notifications on this device?</h2>
          <p>${escapeHtml(subscription.device_label)}</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <p style="margin-top:0">
          This removes the device from future push delivery while preserving its past delivery history.
          Connected ${escapeHtml(formatRelativeDate(subscription.last_seen_at))}.
        </p>
      </div>
      <div class="modal-footer">
        <button class="button button-secondary" data-modal-close type="button">Keep device</button>
        <button class="button button-danger" id="confirm-remove-push-subscription" type="button">Remove device</button>
      </div>
    `);

    document.querySelector("#confirm-remove-push-subscription")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      setButtonLoading(button, true, "Removing…");
      const { data, error } = await state.client.rpc("unregister_push_subscription", {
        p_endpoint: subscription.endpoint,
      });

      if (error || data !== true) {
        setButtonLoading(button, false);
        showToast(error?.message || "That device is already inactive.", "error");
        return;
      }

      closeModal();
      await refreshNotificationData();
      if (getRoute().page === "settings") {
        await renderSettings();
      } else if (getRoute().page === "admin") {
        await renderAdmin();
      }
      showToast(`${subscription.device_label} was removed from push delivery.`, "success");
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
            <button data-quick-amount="50" type="button">50 pts</button>
            <button data-quick-amount="100" type="button">100 pts</button>
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

      state.selectedOutcomeByMarket.delete(market.id);
      closeModal();
      await refreshData({ quiet: true });
      showToast(`${formatNumber(amount)} points committed to “${outcome.label}.”`, "success");
    });
  }

  function calculateResolutionPreview(market, winningOutcomeId, outcomeKnownAt) {
    const outcomeKnownTimestamp = getTimestamp(outcomeKnownAt);
    const scheduledCloseTimestamp = getTimestamp(market.closes_at);
    const closeMode = market.closeMode || market.close_mode || "date";
    const eligibilityCutoff = closeMode === "date" && Number.isFinite(scheduledCloseTimestamp)
      ? Math.min(scheduledCloseTimestamp, outcomeKnownTimestamp)
      : outcomeKnownTimestamp;
    const eligiblePredictions = market.predictions.filter(
      (prediction) => getTimestamp(prediction.created_at, 0) < eligibilityCutoff,
    );
    const latePredictions = market.predictions.filter(
      (prediction) => getTimestamp(prediction.created_at, 0) >= eligibilityCutoff,
    );
    const eligiblePool = eligiblePredictions.reduce(
      (sum, prediction) => sum + prediction.amount,
      0,
    );
    const winningPool = eligiblePredictions
      .filter((prediction) => prediction.outcome_id === winningOutcomeId)
      .reduce((sum, prediction) => sum + prediction.amount, 0);
    const lateRefundTotal = latePredictions.reduce(
      (sum, prediction) => sum + prediction.amount,
      0,
    );

    return {
      eligibilityCutoff,
      eligiblePredictionCount: eligiblePredictions.length,
      eligiblePool,
      winningPool,
      latePredictionCount: latePredictions.length,
      lateRefundTotal,
      noWinnerRefund: eligiblePool > 0 && winningPool === 0,
    };
  }

  function openResolveModal(market) {
    const defaultOutcomeKnown = toLocalDateTimeInput(new Date());
    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local time";
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
          <div class="form-grid resolution-settlement-fields">
            <div class="form-field form-field-full">
              <label for="outcome-known-at">Outcome became known</label>
              <input
                id="outcome-known-at"
                name="outcomeKnownAt"
                type="datetime-local"
                step="60"
                max="${defaultOutcomeKnown}"
                value="${defaultOutcomeKnown}"
                required
              />
              <small>Enter the earliest minute the answer was clear—not when you happened to notice. Times are shown in ${escapeHtml(localTimeZone)}.</small>
            </div>
            <div class="form-field form-field-full">
              <label for="resolution-source-url">Source link <span class="muted">(optional)</span></label>
              <input
                id="resolution-source-url"
                name="resolutionSourceUrl"
                type="url"
                maxlength="2048"
                placeholder="https://…"
              />
            </div>
          </div>
          <div class="form-field resolution-note-field">
            <label for="resolution-note">Result note</label>
            <textarea
              id="resolution-note"
              name="resolutionNote"
              maxlength="280"
              aria-describedby="resolution-note-help resolution-note-count"
              placeholder="Spain beat Argentina 1-0"
              required
            ></textarea>
            <small id="resolution-note-help">
              Briefly record what happened. This becomes part of the permanent result record.
            </small>
            <div class="character-counter-row">
              <output id="resolution-note-count" class="character-counter" for="resolution-note" aria-label="Result note character count">0 / 280</output>
            </div>
          </div>
          <div class="resolution-preview" aria-live="polite">
            <div class="trade-summary-row">
              <span>Prediction cutoff</span>
              <strong id="resolution-cutoff-preview">—</strong>
            </div>
            <div class="trade-summary-row">
              <span>Predictions that count</span>
              <strong id="resolution-eligible-preview">—</strong>
            </div>
            <div class="trade-summary-row">
              <span>Points on the winner</span>
              <strong id="resolution-winning-preview">—</strong>
            </div>
            <div class="trade-summary-row">
              <span>Late predictions refunded</span>
              <strong id="resolution-late-preview">—</strong>
            </div>
            <p class="trade-warning" id="resolution-refund-preview"></p>
          </div>
          <p class="trade-warning">
            This result is permanent. The pool is split among the winners based on how many points they put in.
            Predictions made from the cutoff on don’t count and are refunded.
          </p>
        </div>
        <div class="modal-footer">
          <button class="button button-secondary" data-modal-close type="button">Cancel</button>
          <button class="button button-primary" type="submit">Make it official &amp; pay out</button>
        </div>
      </form>
    `);

    bindCharacterCounter("resolution-note", "resolution-note-count", 280);

    const outcomeKnownField = document.querySelector("#outcome-known-at");
    const updateResolutionPreview = () => {
      const winner = Number(document.querySelector('input[name="winner"]:checked')?.value);
      const outcomeKnownAt = new Date(String(outcomeKnownField?.value || ""));
      if (!winner || Number.isNaN(outcomeKnownAt.getTime())) return;
      const preview = calculateResolutionPreview(market, winner, outcomeKnownAt);
      const cutoffOutput = document.querySelector("#resolution-cutoff-preview");
      const eligibleOutput = document.querySelector("#resolution-eligible-preview");
      const winningOutput = document.querySelector("#resolution-winning-preview");
      const lateOutput = document.querySelector("#resolution-late-preview");
      const refundOutput = document.querySelector("#resolution-refund-preview");
      if (cutoffOutput) cutoffOutput.textContent = formatDateTime(preview.eligibilityCutoff);
      if (eligibleOutput) {
        eligibleOutput.textContent = `${preview.eligiblePredictionCount} · ${formatNumber(preview.eligiblePool)} pts`;
      }
      if (winningOutput) winningOutput.textContent = `${formatNumber(preview.winningPool)} pts`;
      if (lateOutput) {
        lateOutput.textContent = `${preview.latePredictionCount} · ${formatNumber(preview.lateRefundTotal)} pts`;
      }
      if (refundOutput) {
        refundOutput.textContent = preview.noWinnerRefund
          ? "Nobody backed this outcome before the cutoff, so every point that counted will be refunded."
          : "";
      }
    };
    outcomeKnownField?.addEventListener("input", updateResolutionPreview);
    document.querySelectorAll('input[name="winner"]').forEach((input) => {
      input.addEventListener("change", updateResolutionPreview);
    });
    updateResolutionPreview();

    document.querySelector("#resolve-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const winner = Number(formData.get("winner"));
      const resolutionNote = String(formData.get("resolutionNote") || "").trim();
      const outcomeKnownAt = new Date(String(formData.get("outcomeKnownAt") || ""));
      const resolutionSourceUrl = String(formData.get("resolutionSourceUrl") || "").trim();
      const resolutionNoteField = event.currentTarget.querySelector("#resolution-note");
      const button = event.currentTarget.querySelector("button[type='submit']");
      const winningOutcome = market.outcomes.find((outcome) => outcome.id === winner);

      if (!resolutionNote) {
        showToast("Add a result note before resolving the market.", "error");
        resolutionNoteField?.focus();
        return;
      }

      if (Number.isNaN(outcomeKnownAt.getTime()) || outcomeKnownAt.getTime() > Date.now()) {
        showToast("Enter when the outcome became known. It cannot be in the future.", "error");
        outcomeKnownField?.focus();
        return;
      }

      if (resolutionSourceUrl && !/^https?:\/\//i.test(resolutionSourceUrl)) {
        showToast("Enter a complete http or https source link.", "error");
        document.querySelector("#resolution-source-url")?.focus();
        return;
      }

      setButtonLoading(button, true, "Distributing points…");
      const { data, error } = await state.client.rpc("resolve_market", {
        p_market_id: market.id,
        p_winning_outcome_id: winner,
        p_resolution_note: resolutionNote,
        p_outcome_known_at: outcomeKnownAt.toISOString(),
        p_resolution_source_url: resolutionSourceUrl || null,
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
          : data?.late_prediction_count
            ? `Market resolved: “${winningOutcome?.label}.” ${data.late_prediction_count} late ${pluralize(data.late_prediction_count, "prediction")} refunded.`
            : `Market resolved: “${winningOutcome?.label}.” The fake fortunes have been distributed.`,
        "success",
      );
    });
  }

  function openEditMarketModal(market) {
    if (!state.profile?.is_admin || market.status !== "open") return;
    const currentCloseMode = market.closeMode || market.close_mode || "date";
    const editableOutcomes = [
      ...(Array.isArray(market.outcomes)
        ? market.outcomes
        : state.outcomes.filter((outcome) => outcome.market_id === market.id)),
    ].sort((first, second) => Number(first.sort_order || 0) - Number(second.sort_order || 0));
    const editCloseValue = toLocalDateTimeInput(
      market.closes_at ? new Date(market.closes_at) : new Date(Date.now() + 24 * 60 * 60 * 1000),
    );

    openModal(`
      <div class="modal-header">
        <div>
          <p class="eyebrow">Administrator correction</p>
          <h2>Edit market.</h2>
          <p>Correct the market without changing its positions or prediction history.</p>
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
              <span class="field-label">Outcome names</span>
              <div class="edit-market-outcomes" aria-describedby="edit-market-outcomes-help">
                ${editableOutcomes.map((outcome, index) => `
                  <div class="edit-market-outcome-row">
                    <span class="choice-handle" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
                    <input
                      id="edit-market-outcome-${outcome.id}"
                      name="outcome-${outcome.id}"
                      type="text"
                      maxlength="80"
                      value="${escapeAttribute(outcome.label)}"
                      aria-label="Outcome ${index + 1}"
                      required
                    />
                  </div>
                `).join("")}
              </div>
              <small id="edit-market-outcomes-help">Correct the labels only. Outcomes cannot be added, removed, or reordered.</small>
            </div>
            <div class="form-field form-field-full">
              <label for="edit-market-close-mode">Closing rule</label>
              <select id="edit-market-close-mode" name="closeMode">
                <option value="date"${currentCloseMode === "date" ? " selected" : ""}>Open until date</option>
                <option value="outcome"${currentCloseMode === "outcome" ? " selected" : ""}>Open until outcome</option>
              </select>
              <small>Changing a closed market to open until outcome reopens it immediately.</small>
            </div>
            <div class="form-field form-field-full${currentCloseMode === "outcome" ? " hidden" : ""}" id="edit-scheduled-close-field">
              <label for="edit-market-closes">Predictions close</label>
              <input
                id="edit-market-closes"
                name="closesAt"
                type="datetime-local"
                value="${editCloseValue}"
                ${currentCloseMode === "date" ? "required" : "disabled"}
              />
              <small>The corrected closing time must still be in the future.</small>
            </div>
          </div>
          <p class="trade-warning">
            This admin-only correction changes outcome names everywhere. Existing predictions stay attached to the same outcomes.
          </p>
        </div>
        <div class="modal-footer">
          <button class="button button-secondary" data-modal-close type="button">Cancel</button>
          <button class="button button-primary" type="submit">Save correction</button>
        </div>
      </form>
    `, "edit-market-modal");

    bindCharacterCounter("edit-market-description", "edit-market-description-count");

    const editCloseMode = document.querySelector("#edit-market-close-mode");
    const editScheduledCloseField = document.querySelector("#edit-scheduled-close-field");
    const editScheduledCloseInput = document.querySelector("#edit-market-closes");
    const updateEditCloseMode = () => {
      const usesDate = editCloseMode?.value !== "outcome";
      editScheduledCloseField?.classList.toggle("hidden", !usesDate);
      if (editScheduledCloseInput) {
        editScheduledCloseInput.required = usesDate;
        editScheduledCloseInput.disabled = !usesDate;
      }
    };
    editCloseMode?.addEventListener("change", updateEditCloseMode);
    updateEditCloseMode();

    document.querySelector("#edit-market-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const question = String(form.get("question") || "").trim();
      const description = String(form.get("description") || "").trim();
      const closeMode = String(form.get("closeMode") || "date");
      const outcomeEdits = editableOutcomes.map((outcome) => ({
        id: outcome.id,
        label: String(form.get(`outcome-${outcome.id}`) || "").trim(),
      }));
      const closesAt = closeMode === "date"
        ? new Date(String(form.get("closesAt") || ""))
        : null;
      const button = event.currentTarget.querySelector("button[type='submit']");

      if (question.length < 5 || question.length > 180) {
        showToast("Questions must be between 5 and 180 characters.", "error");
        return;
      }

      if (
        outcomeEdits.length < 2 ||
        outcomeEdits.length > MAX_MARKET_OUTCOMES ||
        outcomeEdits.some(({ label }) => label.length < 1 || label.length > 80)
      ) {
        showToast("Each outcome must be between 1 and 80 characters.", "error");
        return;
      }

      const normalizedOutcomeLabels = outcomeEdits.map(({ label }) => label.toLocaleLowerCase());
      if (new Set(normalizedOutcomeLabels).size !== normalizedOutcomeLabels.length) {
        showToast("Each outcome needs a unique name.", "error");
        return;
      }

      if (
        closeMode === "date" &&
        (Number.isNaN(closesAt.getTime()) || closesAt.getTime() <= Date.now())
      ) {
        showToast("Choose a corrected closing time in the future.", "error");
        return;
      }

      setButtonLoading(button, true, "Saving correction…");
      const { error } = await state.client.rpc("edit_market", {
        p_market_id: market.id,
        p_question: question,
        p_description: description || null,
        p_close_mode: closeMode,
        p_closes_at: closesAt ? closesAt.toISOString() : null,
        p_outcomes: outcomeEdits,
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

  function buildProfileIconChoices(profile) {
    const selectedIcon = normalizeProfileIcon(profile?.profile_icon);
    return [
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
            ${escapeHtml(initials(profile?.display_name))}
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
  }

  function openAdminProfileModal(initialUserId = "", allowedUserIds = null) {
    if (!state.profile?.is_admin) return;

    const allowedUserIdSet = Array.isArray(allowedUserIds) ? new Set(allowedUserIds) : null;
    const sortedProfiles = state.profiles.filter((profile) =>
      !allowedUserIdSet || allowedUserIdSet.has(profile.id)
    ).sort((a, b) =>
      a.display_name.localeCompare(b.display_name)
    );
    const iconChoices = buildProfileIconChoices(null);

    openModal(`
      <div class="modal-header">
        <div>
          <p class="eyebrow">Administrator</p>
          <h2>Edit trader profile.</h2>
          <p>Correct a trader’s display name or curated profile icon.</p>
        </div>
        <button class="modal-close" data-modal-close type="button" aria-label="Close">×</button>
      </div>
      <form id="admin-profile-form">
        <div class="modal-body">
          <div class="form-field">
            <label for="admin-profile-user">Trader</label>
            <select id="admin-profile-user" name="userId" required>
              <option value=""${initialUserId ? "" : " selected"}>Choose a trader…</option>
              ${sortedProfiles.map((profile) => `
                <option value="${profile.id}"${profile.id === initialUserId ? " selected" : ""}>${escapeHtml(profile.display_name)}</option>
              `).join("")}
            </select>
          </div>
          <div class="form-field">
            <label for="admin-profile-name">Display name</label>
            <input
              id="admin-profile-name"
              name="displayName"
              minlength="2"
              maxlength="32"
              required
              disabled
            />
          </div>
          <fieldset class="profile-icon-field" aria-describedby="admin-profile-icon-help" disabled>
            <legend>Profile icon</legend>
            <p id="admin-profile-icon-help">Choose how this trader appears across the exchange.</p>
            <div class="profile-icon-grid">
              ${iconChoices}
            </div>
          </fieldset>
        </div>
        <div class="modal-footer">
          <button class="button button-secondary" data-modal-close type="button">Cancel</button>
          <button class="button button-primary" type="submit" disabled>Save changes</button>
        </div>
      </form>
    `, "account-modal admin-profile-modal");

    const form = document.querySelector("#admin-profile-form");
    const userSelect = document.querySelector("#admin-profile-user");
    const nameInput = document.querySelector("#admin-profile-name");
    const iconField = form.querySelector(".profile-icon-field");
    const initialsPreview = form.querySelector(".profile-icon-initials");
    const iconInputs = form.querySelectorAll("[name='profileIcon']");
    const submit = form.querySelector("button[type='submit']");

    const populateSelectedProfile = () => {
      const profile = state.profiles.find((item) => item.id === userSelect.value);
      const selectedIcon = normalizeProfileIcon(profile?.profile_icon) || "";

      nameInput.value = profile?.display_name || "";
      nameInput.disabled = !profile;
      iconField.disabled = !profile;
      submit.disabled = !profile;
      initialsPreview.textContent = initials(profile?.display_name);
      iconInputs.forEach((input) => {
        input.checked = input.value === selectedIcon;
      });
    };

    userSelect.addEventListener("change", populateSelectedProfile);
    nameInput.addEventListener("input", () => {
      initialsPreview.textContent = initials(nameInput.value);
    });
    populateSelectedProfile();
    if (!initialUserId) userSelect.focus();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const userId = String(formData.get("userId") || "");
      const profile = state.profiles.find((item) => item.id === userId);
      const name = String(formData.get("displayName") || "").trim();
      const profileIcon = normalizeProfileIcon(formData.get("profileIcon"));

      if (!profile || name.length < 2 || name.length > 32) {
        showToast("Choose a trader and enter a display name between 2 and 32 characters.", "error");
        return;
      }

      setButtonLoading(submit, true, "Saving…");
      const { error } = await state.client.rpc("admin_update_profile", {
        p_user_id: userId,
        p_display_name: name,
        p_profile_icon: profileIcon,
      });
      setButtonLoading(submit, false);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      closeModal();
      await refreshData({ quiet: true });
      showToast(`${name}’s profile was updated.`, "success");
    });
  }

  function openAdminPointsModal(initialUserId = "", allowedUserIds = null) {
    if (!state.profile.is_admin) return;

    const allowedUserIdSet = Array.isArray(allowedUserIds) ? new Set(allowedUserIds) : null;
    const sortedProfiles = state.profiles.filter((profile) =>
      !allowedUserIdSet || allowedUserIdSet.has(profile.id)
    ).sort((a, b) => a.display_name.localeCompare(b.display_name));
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
                <option value=""${initialUserId ? "" : " selected"}>Choose a trader…</option>
                ${sortedProfiles.map((profile) => `
                  <option value="${profile.id}"${profile.id === initialUserId ? " selected" : ""}>${escapeHtml(profile.display_name)}</option>
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
    if (!initialUserId) userSelect.focus();

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
    state.modalReturnFocusElement = document.activeElement || null;
    dom.modalRoot.innerHTML = `
      <div class="modal-backdrop" role="presentation">
        <section class="modal${modalClass ? ` ${escapeAttribute(modalClass)}` : ""}" role="dialog" aria-modal="true">
          ${content}
        </section>
      </div>
    `;
    document.body.classList.add("modal-open");
    window.setTimeout(() => dom.modalRoot.querySelector(".modal-close")?.focus(), 0);
  }

  function closeModal({ acknowledgeAllowance = true, returnFocusElement = null } = {}) {
    const allowanceNotice = state.allowanceNoticeOpen
      ? state.allowanceNoticeCurrent
      : null;
    const focusAfterClose = returnFocusElement || state.modalReturnFocusElement;
    state.allowanceNoticeOpen = false;
    state.allowanceNoticeCurrent = null;
    state.modalReturnFocusElement = null;
    dom.modalRoot.innerHTML = "";
    document.body.classList.remove("modal-open");

    if (allowanceNotice) {
      suppressAllowanceNoticeThrough(allowanceNotice.latestPeriod);
      if (acknowledgeAllowance) void acknowledgeAllowanceNotice(allowanceNotice);
      return;
    }

    if (state.pendingAllowanceNotice) {
      window.setTimeout(showPendingAllowanceNotice, 0);
      return;
    }

    window.setTimeout(() => focusAfterClose?.focus?.(), 0);
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

  function formatHeaderBalance(value, compact = false) {
    const number = Number(value) || 0;
    if (!compact || Math.abs(number) < 1000) return formatNumber(number);
    return formatCompact(number).toLowerCase();
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

  function formatAllowanceMonth(value) {
    const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(String(value || ""));
    if (!match) return "Monthly";
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      timeZone: "UTC",
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
