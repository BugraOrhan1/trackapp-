const __isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);

window.APP_CONFIG = {
  apiBaseUrl: __isLocalHost ? "/api" : "/.netlify/functions",
  appName: "Flitser Alert Pro",
  uiMode: "map",
  // Temporary: auth/login/register disabled.
  requireAuth: false,
  // Demo profile used when requireAuth is false.
  demoUser: {
    id: "demo-user",
    email: "demo@local",
    name: "Demo User",
    birth_date: "1990-01-01",
    email_verified: true,
  },
  requestTimeoutMs: 10000,
};
