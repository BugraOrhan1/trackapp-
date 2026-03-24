window.APP_CONFIG = {
  apiBaseUrl: "/.netlify/functions",
  appName: "Flitser Alert Pro",
  // If false, app starts directly in demo mode without login.
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
