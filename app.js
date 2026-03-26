// ============================================
// HULPDIENSTEN DETECTIVE - PRO VERSION
// ============================================

function normalizeLevel(rawValue) {
  const value = Number(rawValue);
  if (value === 1 || value === 2 || value === 3) {
    return value;
  }
  return 1;
}

const LEVEL_CONFIG = {
  1: { color: "#22c55e", radius: 400, text: "LEVEL 1 - GROEN (400m)", label: "Groen", sound: "low" },
  2: { color: "#f59e0b", radius: 200, text: "LEVEL 2 - ORANJE (200m)", label: "Oranje", sound: "medium" },
  3: { color: "#ef4444", radius: 50, text: "LEVEL 3 - ROOD (50m)", label: "Rood", sound: "high" },
};

// State
let currentLevel = 1;
let map;
let baseTileLayer;
let userMarker;
let alertCircle;
let emergencyMarker;
let latestUserLocation = { lat: 52.0116, lng: 4.7571 };
let publicCameraLayer;
let publicCamerasLoaded = false;
let publicCameraCount = 0;
let loadingPublicCameras = false;
let publicCameraStats = null;
let publicDataRefreshTimer = null;
let publicPointsIndex = [];
let alertedPublicPoints = {};
let previousDistance = null;
let lastManualMapInteractionAt = 0;
let lastSpeed = 0;
let lastPosition = null;
let lastPositionTime = null;
let lastSpeechAt = 0;
let lastDataLoadTime = 0;
let lastDataLoadCenter = null;
let lastCameraCheckTime = 0;
let currentHeading = 0;
let accelStartTime = null;
let lastZeroToHundredMs = null;
let currentUser = null;
let authAccessToken = null;
let authRefreshToken = null;
let manualFollowPaused = false;
let activeMapTheme = null;
let lastMapUpdateTime = 0;
let lastCompassUpdateTime = 0;
let btPort = null;
let btReader = null;
let btReadLoopActive = false;
let btLineBuffer = "";
let btConnected = false;
let lastRfSignalDb = 0;
let lastRfSignalLevel = "green";
let lastRfSignalAlert = false;
let lastRfSignalUpdateAt = 0;
let rfSignalDecayTimer = null;

const SPEED_CAMERA_ALERT_COOLDOWN_MS = 90 * 1000;
const SPEED_CAMERA_SPEECH_COOLDOWN_MS = 20 * 1000;
const DATA_CACHE_TIME_MS = 10 * 60 * 1000; // 10 minuten cache
const MIN_RELOAD_DISTANCE_M = 10000; // 10km - herladen als ver verplaatst
const FAST_LOAD_RADIUS_KM = 20;
const FULL_LOAD_RADIUS_KM = 50;
const MAP_RECENTER_PAUSE_MS = 8000;
const AUTH_SESSION_KEY = "flitserSession";
const AUTH_ACCESS_TOKEN_KEY = "flitserAccessToken";
const AUTH_REFRESH_TOKEN_KEY = "flitserRefreshToken";
const PROFILE_KEY = "flitserProfile";

const PUBLIC_POINT_INFO = {
  speed_camera: { icon: "📷", label: "Flitsers" },
  police: { icon: "👮", label: "Politie" },
  hospital: { icon: "🏥", label: "Ziekenhuizen" },
  fire_station: { icon: "🚒", label: "Brandweer" },
  ambulance_station: { icon: "🚑", label: "Ambulanceposten" },
  traffic_signal: { icon: "🚦", label: "Verkeerslichten" },
  traffic_calming: { icon: "🛑", label: "Verkeersremmers" },
  fuel: { icon: "⛽", label: "Tankstations" },
  enforcement: { icon: "⚠️", label: "Controlepunten" },
  other: { icon: "📍", label: "Overig" },
};

// Settings
let settings = {
  notificationsEnabled: false,
  soundEnabled: true,
  voiceEnabled: true,
  autoCenter: true,
  speedCameraAlertRadius: 450,
  selectedVoice: "auto",
  showDebugInfo: false,
  mapTheme: "auto",
};

let profile = {
  name: "",
  vehicle: "",
};

// Load settings from localStorage
function loadSettings() {
  const saved = localStorage.getItem("hulpdienstenSettings");
  if (saved) {
    settings = { ...settings, ...JSON.parse(saved) };
  }

  const savedProfile = localStorage.getItem(PROFILE_KEY);
  if (savedProfile) {
    profile = { ...profile, ...JSON.parse(savedProfile) };
  }

  updateUISettings();
}

function saveSettings() {
  localStorage.setItem("hulpdienstenSettings", JSON.stringify(settings));
}

function saveProfile() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function populateVoiceSelect() {
  const voiceSelect = document.getElementById("voiceSelect");
  if (!voiceSelect || !("speechSynthesis" in window)) {
    return;
  }

  const voices = window.speechSynthesis.getVoices()
    .filter((voice) => voice.lang && voice.lang.toLowerCase().startsWith("nl"));

  const selectedBefore = settings.selectedVoice || "auto";
  voiceSelect.innerHTML = '<option value="auto">Automatisch (NL)</option>';

  voices.forEach((voice) => {
    const option = document.createElement("option");
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceSelect.appendChild(option);
  });

  voiceSelect.value = selectedBefore;
}

function updateUISettings() {
  const notifBtn = document.getElementById("notifBtn");
  const soundBtn = document.getElementById("soundBtn");
  const distanceSelect = document.getElementById("cameraAlertDistanceSelect");
  const cameraAlertStatus = document.getElementById("cameraAlertStatus");
  const autoCenterToggle = document.getElementById("autoCenterToggle");
  const voiceToggle = document.getElementById("voiceToggle");
  const debugInfoToggle = document.getElementById("debugInfoToggle");
  const mapThemeSelect = document.getElementById("mapThemeSelect");
  const voiceSelect = document.getElementById("voiceSelect");
  const profileName = document.getElementById("profileName");
  const profileVehicle = document.getElementById("profileVehicle");
  const lastZeroToHundred = document.getElementById("lastZeroToHundred");

  if (notifBtn && settings.notificationsEnabled) {
    notifBtn.classList.add("active");
  } else if (notifBtn) {
    notifBtn.classList.remove("active");
  }

  if (soundBtn && settings.soundEnabled) {
    soundBtn.classList.add("active");
  } else if (soundBtn) {
    soundBtn.classList.remove("active");
  }

  if (distanceSelect) {
    distanceSelect.value = String(settings.speedCameraAlertRadius || 450);
  }

  if (cameraAlertStatus) {
    cameraAlertStatus.textContent = settings.showDebugInfo 
      ? `Flitser-alert actief op ${settings.speedCameraAlertRadius}m.`
      : '';
    cameraAlertStatus.style.display = settings.showDebugInfo ? 'block' : 'none';
  }

  if (autoCenterToggle) {
    autoCenterToggle.checked = Boolean(settings.autoCenter);
  }

  if (voiceToggle) {
    voiceToggle.checked = Boolean(settings.voiceEnabled);
  }

  if (debugInfoToggle) {
    debugInfoToggle.checked = Boolean(settings.showDebugInfo);
  }

  if (mapThemeSelect) {
    mapThemeSelect.value = settings.mapTheme || "auto";
  }

  if (voiceSelect) {
    voiceSelect.value = settings.selectedVoice || "auto";
  }

  if (profileName) {
    profileName.value = profile.name || "";
  }

  if (profileVehicle) {
    profileVehicle.value = profile.vehicle || "";
  }

  if (lastZeroToHundred) {
    lastZeroToHundred.textContent = `Laatste 0-100: ${lastZeroToHundredMs ? `${(lastZeroToHundredMs / 1000).toFixed(1)}s` : "--"}`;
  }

  // Toggle status card visibility
  const statusCard = document.querySelector('.status-card');
  if (statusCard) {
    if (settings.showDebugInfo) {
      statusCard.classList.remove('hidden');
    } else {
      statusCard.classList.add('hidden');
    }
  }

  // Update public data summary
  updatePublicDataSummary();
  updateFollowButtonVisibility();
}

function getEffectiveMapTheme() {
  const mode = settings.mapTheme || "auto";
  if (mode === "day" || mode === "night") {
    return mode;
  }

  const hour = new Date().getHours();
  return (hour >= 19 || hour < 7) ? "night" : "day";
}

function applyMapTheme() {
  if (!map) {
    return;
  }

  const theme = getEffectiveMapTheme();
  if (theme === activeMapTheme && baseTileLayer) {
    return;
  }

  if (baseTileLayer) {
    map.removeLayer(baseTileLayer);
  }

  const tileUrl = theme === "night"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  baseTileLayer = L.tileLayer(tileUrl, {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap &copy; CARTO",
  }).addTo(map);

  activeMapTheme = theme;
}

function updateFollowButtonVisibility() {
  const followButton = document.getElementById("followMapBtn");
  if (!followButton) {
    return;
  }

  const shouldShow = Boolean(settings.autoCenter && manualFollowPaused);
  followButton.classList.toggle("hidden", !shouldShow);
}

function updateCompassWidget() {
  const now = Date.now();
  if (now - lastCompassUpdateTime < 100) {
    return; // Skip if updated within last 100ms
  }
  lastCompassUpdateTime = now;

  const compassNeedle = document.getElementById("compassNeedle");
  if (!compassNeedle) {
    return;
  }

  const heading = Number.isFinite(currentHeading) ? currentHeading : 0;
  compassNeedle.style.transform = `rotate(${heading}deg)`;
}

function setBluetoothUiState(connected, text) {
  const connectBtBtn = document.getElementById("connectBtBtn");
  const btStatusText = document.getElementById("btStatusText");

  if (connectBtBtn) {
    connectBtBtn.classList.toggle("active", connected);
    connectBtBtn.textContent = connected ? "🟢 Bluetooth verbonden (klik om te ontkoppelen)" : "🔵 Koppel Raspberry Bluetooth";
  }

  if (btStatusText) {
    btStatusText.textContent = text || (connected ? "Bluetooth: verbonden" : "Bluetooth: niet verbonden");
  }
}

function getSignalScaleFromDb(valueDb) {
  const normalized = Math.max(0, Math.min(18, Number(valueDb) || 0));
  return 0.65 + (normalized / 18) * 1.35;
}

function getSignalSizeFromDb(valueDb) {
  const normalized = Math.max(0, Math.min(18, Number(valueDb) || 0));
  return 64 + (normalized / 18) * 54;
}

function getSignalPulseFromDb(valueDb, alert) {
  const normalized = Math.max(0, Math.min(18, Number(valueDb) || 0));
  const base = alert ? 1.18 : 1.06;
  return base + (normalized / 18) * 0.16;
}

function updateSignalOrbVisual(valueDb, alert, level = "green", markFresh = true) {
  const rfSignalOrb = document.getElementById("rfSignalOrb");
  const rfSignalText = document.getElementById("rfSignalText");
  const rfSignalMeta = document.getElementById("rfSignalMeta");

  if (!rfSignalOrb || !rfSignalText || !rfSignalMeta) {
    return;
  }

  const safeDb = Number.isFinite(Number(valueDb)) ? Number(valueDb) : 0;
  const scale = getSignalScaleFromDb(safeDb);
  const sizePx = getSignalSizeFromDb(safeDb);
  const pulseScale = getSignalPulseFromDb(safeDb, Boolean(alert));

  rfSignalOrb.style.setProperty("--signal-scale", scale.toFixed(3));
  rfSignalOrb.style.setProperty("--signal-size", `${sizePx.toFixed(0)}px`);
  rfSignalOrb.style.setProperty("--signal-pulse-scale", pulseScale.toFixed(3));
  rfSignalOrb.classList.toggle("alert", Boolean(alert));
  rfSignalOrb.classList.toggle("warn", String(level).toLowerCase() === "yellow");
  rfSignalText.textContent = `${safeDb.toFixed(1)} dB`;
  if (alert) {
    rfSignalMeta.textContent = "ALERT: sterk signaal";
  } else if (String(level).toLowerCase() === "yellow") {
    rfSignalMeta.textContent = "Waarschuwing: verhoogd signaal";
  } else {
    rfSignalMeta.textContent = "Live signaal van Raspberry Pi";
  }
  lastRfSignalDb = safeDb;
  lastRfSignalLevel = String(level || "green").toLowerCase();
  lastRfSignalAlert = Boolean(alert);
  if (markFresh) {
    lastRfSignalUpdateAt = Date.now();
  }
}

function startRfSignalDecayLoop() {
  if (rfSignalDecayTimer) {
    return;
  }

  rfSignalDecayTimer = setInterval(() => {
    const now = Date.now();
    const msSinceLastFrame = now - lastRfSignalUpdateAt;

    // Keep orb stable while fresh frames are arriving.
    if (msSinceLastFrame <= 900) {
      return;
    }

    // Smoothly decay towards zero when signal is lost.
    const decayedDb = Math.max(0, lastRfSignalDb * 0.86 - 0.08);
    const shouldKeepWarning = decayedDb > 3.5;
    const level = shouldKeepWarning ? lastRfSignalLevel : "green";
    const alert = shouldKeepWarning ? lastRfSignalAlert : false;
    updateSignalOrbVisual(decayedDb, alert, level, false);
  }, 220);
}

function parseBluetoothJsonLine(line) {
  let payload;
  try {
    payload = JSON.parse(line);
  } catch {
    return;
  }

  if (payload.status === "BASELINE") {
    addLogEntry(`📡 Baseline ${payload.cycle || "?"}/14`, "info");
    return;
  }

  if (payload.status === "BASELINE_READY") {
    addLogEntry("✅ Raspberry baseline klaar", "success");
    return;
  }

  if (payload.status === "SCANNING") {
    addLogEntry("📶 Raspberry live scanner actief", "success");
    return;
  }

  const displayDb = typeof payload.peak_delta_db === "number"
    ? payload.peak_delta_db
    : (typeof payload.peak_db === "number" ? payload.peak_db : null);

  if (typeof displayDb === "number") {
    updateSignalOrbVisual(displayDb, Boolean(payload.alert), payload.level || "green");
  }

  if (payload.alert && typeof payload.peak_freq_mhz === "number") {
    addLogEntry(`🚨 RF alert ${payload.peak_freq_mhz.toFixed(2)} MHz (${(payload.peak_db || 0).toFixed(1)} dB)`, "danger");
  }
}

async function disconnectBluetoothSerial(logMessage = true) {
  btReadLoopActive = false;

  if (btReader) {
    try {
      await btReader.cancel();
    } catch {
    }
    btReader = null;
  }

  if (btPort) {
    try {
      await btPort.close();
    } catch {
    }
    btPort = null;
  }

  btConnected = false;
  setBluetoothUiState(false, "Bluetooth: niet verbonden");
  updateSignalOrbVisual(0, false, "green", false);
  if (logMessage) {
    addLogEntry("Bluetooth koppeling verbroken", "info");
  }
}

async function connectBluetoothSerial() {
  if (!("serial" in navigator)) {
    addLogEntry("Deze browser ondersteunt geen Web Serial. Gebruik Chrome/Edge over HTTPS.", "warning");
    setBluetoothUiState(false, "Bluetooth: browser ondersteunt dit niet");
    return;
  }

  try {
    setBluetoothUiState(false, "Bluetooth: kies je Raspberry seriele poort...");
    btPort = await navigator.serial.requestPort();
    await btPort.open({ baudRate: 115200 });

    const decoder = new TextDecoderStream();
    btPort.readable.pipeTo(decoder.writable).catch(() => {});
    btReader = decoder.readable.getReader();
    btConnected = true;
    btReadLoopActive = true;
    btLineBuffer = "";

    setBluetoothUiState(true, "Bluetooth: verbonden met Raspberry stream");
    addLogEntry("Bluetooth stream verbonden", "success");

    while (btReadLoopActive) {
      const { value, done } = await btReader.read();
      if (done) {
        break;
      }
      btLineBuffer += value || "";

      let newlineIndex = btLineBuffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const rawLine = btLineBuffer.slice(0, newlineIndex).trim();
        btLineBuffer = btLineBuffer.slice(newlineIndex + 1);
        if (rawLine) {
          parseBluetoothJsonLine(rawLine);
        }
        newlineIndex = btLineBuffer.indexOf("\n");
      }
    }
  } catch (error) {
    addLogEntry(`Bluetooth connectie mislukt: ${error.message || error}`, "warning");
    setBluetoothUiState(false, "Bluetooth: verbinden mislukt");
  } finally {
    if (btConnected) {
      await disconnectBluetoothSerial(false);
    }
  }
}

// ============================================
// AUDIO & NOTIFICATION SYSTEM
// ============================================

function playAlertSound(level) {
  if (!settings.soundEnabled) return;

  // Voeg vibratie toe voor mobiel (subtiel)
  if ('vibrate' in navigator) {
    if (level === 3) {
      navigator.vibrate([100, 50, 100]); // Dubbele vibratie voor hoog alarm
    } else if (level === 2) {
      navigator.vibrate(100); // Enkele vibratie voor medium alarm
    } else {
      navigator.vibrate(50); // Korte vibratie voor laag alarm
    }
  }

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  const playBeep = (frequency, duration, delay, volume) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    gainNode.gain.value = volume;
    oscillator.start(audioContext.currentTime + delay);
    oscillator.stop(audioContext.currentTime + delay + duration);
  };

  if (level === 3) {
    playBeep(1000, 0.16, 0, 0.3);
    playBeep(1200, 0.16, 0.22, 0.3);
    return;
  }

  if (level === 2) {
    playBeep(740, 0.12, 0, 0.24);
    playBeep(880, 0.12, 0.18, 0.24);
    return;
  }

  playBeep(400, 0.1, 0, 0.15);
}

function showNotification(title, message, level) {
  if (!settings.notificationsEnabled) return;
  
  if ("Notification" in window && Notification.permission === "granted") {
    const icon = level === 3 ? "🚨" : level === 2 ? "⚠️" : "✅";
    new Notification(icon + " " + title, {
      body: message,
      icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='75' font-size='75'>🚨</text></svg>",
      tag: "hulpdiensten-alert",
      requireInteraction: level === 3,
    });
  }
}

async function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      settings.notificationsEnabled = true;
      saveSettings();
      updateUISettings();
      addLogEntry("Notificaties ingeschakeld", "success");
    }
  }
}

// ============================================
// LOG SYSTEM
// ============================================

function addLogEntry(message, type = "info") {
  const logEntries = document.getElementById("logEntries");
  const entry = document.createElement("div");
  entry.className = `log-entry log-${type}`;
  const timestamp = new Date().toLocaleTimeString("nl-NL");
  entry.textContent = `[${timestamp}] ${message}`;
  
  logEntries.insertBefore(entry, logEntries.firstChild);
  
  // Keep only last 20 entries
  while (logEntries.children.length > 20) {
    logEntries.removeChild(logEntries.lastChild);
  }
}

function clearLog() {
  const logEntries = document.getElementById("logEntries");
  logEntries.innerHTML = '<div class="log-entry log-info">Log gewist</div>';
}

// ============================================
// MATH UTILITIES
// ============================================

function toRad(value) {
  return (value * Math.PI) / 180;
}

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const bearing = Math.atan2(y, x);
  return (bearing * 180 / Math.PI + 360) % 360; // Convert to degrees 0-360
}

function movePoint(lat, lng, distanceMeters, bearingDeg) {
  const earthRadius = 6378137;
  const bearing = toRad(bearingDeg);
  const latRad = toRad(lat);
  const lngRad = toRad(lng);
  const angularDistance = distanceMeters / earthRadius;

  const newLat = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing)
  );

  const newLng =
    lngRad +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLat)
    );

  return {
    lat: (newLat * 180) / Math.PI,
    lng: (newLng * 180) / Math.PI,
  };
}

function getSimulatedEmergencyDistance(level) {
  if (level === 3) {
    return 35;
  }
  if (level === 2) {
    return 140;
  }
  return 320;
}

function updateStatCards(level, radius, distanceMeters) {
  document.getElementById("levelValue").textContent = String(level);
  document.getElementById("radiusValue").textContent = `${radius} m`;
  
  const distanceValue = document.getElementById("distanceValue");
  const monitorDistance = document.getElementById("monitorDistance");
  const monitorStatus = document.getElementById("monitorStatus");
  
  if (Number.isFinite(distanceMeters)) {
    const dist = Math.round(distanceMeters);
    distanceValue.textContent = `${dist} m`;
    monitorDistance.textContent = `${dist}m`;
    
    // Update monitor styling
    monitorDistance.classList.remove("warning", "danger");
    
    if (dist <= LEVEL_CONFIG[3].radius) {
      monitorDistance.classList.add("danger");
      monitorStatus.textContent = "GEVAAR";
      monitorStatus.style.color = "var(--red)";
    } else if (dist <= LEVEL_CONFIG[2].radius) {
      monitorDistance.classList.add("warning");
      monitorStatus.textContent = "WAARSCHUWING";
      monitorStatus.style.color = "var(--orange)";
    } else {
      monitorStatus.textContent = "VEILIG";
      monitorStatus.style.color = "var(--green)";
    }
    
    // Check for distance changes and alert
    if (previousDistance !== null) {
      const distChange = previousDistance - dist;
      if (distChange > 50 && dist <= LEVEL_CONFIG[2].radius) {
        addLogEntry(`Hulpdienst nadert snel! Nu ${dist}m`, "warning");
        showNotification("Hulpdienst Nadert!", `Afstand: ${dist}m`, 2);
      }
      if (dist <= LEVEL_CONFIG[3].radius && previousDistance > LEVEL_CONFIG[3].radius) {
        addLogEntry(`KRITIEK: Hulpdienst binnen ${LEVEL_CONFIG[3].radius}m!`, "danger");
        showNotification("GEVAAR!", `Hulpdienst op ${dist}m!`, 3);
        playAlertSound(3);
      }
    }
    previousDistance = dist;
  } else {
    distanceValue.textContent = "-- m";
    monitorDistance.textContent = "--m";
    monitorStatus.textContent = "ONBEKEND";
  }
  
  // Update speed
  document.getElementById("speedValue").textContent = `${Math.round(lastSpeed)} km/h`;
}

function updateAlertStrip(level) {
  const strip = document.getElementById("alertStrip");
  strip.classList.remove("green-strip", "orange-strip", "red-strip");

  if (level === 1) {
    strip.classList.add("green-strip");
  } else if (level === 2) {
    strip.classList.add("orange-strip");
  } else {
    strip.classList.add("red-strip");
  }

  strip.textContent = `Status: ${LEVEL_CONFIG[level].label}`;
}

function updateEmergencyMarker(level) {
  if (!map || !emergencyMarker) {
    return;
  }

  const simulatedDistance = getSimulatedEmergencyDistance(level);
  const emergencyPoint = movePoint(latestUserLocation.lat, latestUserLocation.lng, simulatedDistance, 35);
  emergencyMarker.setLatLng([emergencyPoint.lat, emergencyPoint.lng]);

  const distanceMeters = getDistanceMeters(
    latestUserLocation.lat,
    latestUserLocation.lng,
    emergencyPoint.lat,
    emergencyPoint.lng
  );

  updateStatCards(level, LEVEL_CONFIG[level].radius, distanceMeters);
}

function updatePublicCameraButton() {
  const button = document.getElementById("togglePublicCamsBtn");
  if (!button) {
    return;
  }

  if (loadingPublicCameras) {
    button.textContent = "🗺️ Openbare kaartpunten laden...";
    return;
  }

  if (!publicCamerasLoaded) {
    button.textContent = "🗺️ Laad alle legale kaartpunten";
    return;
  }

  const isVisible = map && publicCameraLayer && map.hasLayer(publicCameraLayer);
  button.textContent = isVisible
    ? `🗺️ Verberg openbare punten (${publicCameraCount})`
    : `🗺️ Toon openbare punten (${publicCameraCount})`;
}

function updatePublicDataSummary() {
  const summaryEl = document.getElementById("publicDataSummary");
  if (!summaryEl) {
    return;
  }

  if (!publicCamerasLoaded || !publicCameraStats) {
    summaryEl.textContent = "Flitsers worden geladen...";
    return;
  }

  const totalCameras = (publicCameraStats.speed_camera || 0) + (publicCameraStats.enforcement || 0);
  
  summaryEl.textContent = totalCameras > 0
    ? (settings.showDebugInfo ? `📷 Actief: ${totalCameras} flitsers geladen (100x100km)` : '')
    : "⚠️ Geen flitsers gevonden in dit gebied";
}

function speakFlitserWarning(distanceMeters) {
  if (!settings.voiceEnabled || !("speechSynthesis" in window)) {
    return;
  }

  const now = Date.now();
  if (now - lastSpeechAt < SPEED_CAMERA_SPEECH_COOLDOWN_MS) {
    return;
  }
  lastSpeechAt = now;

  const roundedDistance = Math.round(distanceMeters / 10) * 10;
  const utterance = new SpeechSynthesisUtterance(`Let op. Flitser voor op ${roundedDistance} meter.`);
  const voices = window.speechSynthesis.getVoices();
  const selectedVoice = settings.selectedVoice;
  const chosenVoice =
    selectedVoice && selectedVoice !== "auto"
      ? voices.find((voice) => voice.name === selectedVoice)
      : voices.find((voice) => voice.lang && voice.lang.toLowerCase().startsWith("nl"));

  utterance.lang = chosenVoice?.lang || "nl-NL";
  if (chosenVoice) {
    utterance.voice = chosenVoice;
  }
  utterance.rate = 1.05;
  utterance.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function pruneOldPublicAlerts() {
  const now = Date.now();
  Object.keys(alertedPublicPoints).forEach((key) => {
    if (now - alertedPublicPoints[key] > SPEED_CAMERA_ALERT_COOLDOWN_MS) {
      delete alertedPublicPoints[key];
    }
  });
}

function checkSpeedCameraProximityAlerts() {
  if (!publicCamerasLoaded || publicPointsIndex.length === 0) {
    return;
  }

  pruneOldPublicAlerts();

  const candidates = publicPointsIndex.filter(
    (point) => point.type === "speed_camera" || point.type === "enforcement"
  );

  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  candidates.forEach((point) => {
    const distance = getDistanceMeters(
      latestUserLocation.lat,
      latestUserLocation.lng,
      point.lat,
      point.lon
    );

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = point;
    }
  });

  const alertRadius = Number(settings.speedCameraAlertRadius) || 450;
  if (!nearest || nearestDistance > alertRadius) {
    return;
  }

  const alertKey = nearest.id;
  const lastAlertTime = alertedPublicPoints[alertKey] || 0;
  const now = Date.now();
  if (now - lastAlertTime < SPEED_CAMERA_ALERT_COOLDOWN_MS) {
    return;
  }

  alertedPublicPoints[alertKey] = now;

  const distanceRounded = Math.round(nearestDistance);
  const message = `Flitser voor op ${distanceRounded} meter`;

  addLogEntry(`📷 ${message}`, "warning");
  playAlertSound(distanceRounded <= 120 ? 3 : 2);
  showNotification("Flitser voorop", message, distanceRounded <= 120 ? 3 : 2);
  speakFlitserWarning(nearestDistance);
}

function getOverpassBBox(radiusKm = FULL_LOAD_RADIUS_KM) {
  if (!map) {
    return null;
  }

  const center = latestUserLocation || map.getCenter();
  
  // Bereken gebied rondom centrum; standaard 50km in elke richting (100x100km totaal)
  // 1 graad latitude ≈ 111km, 1 graad longitude ≈ 111km * cos(lat)
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(center.lat * Math.PI / 180));
  
  return {
    south: center.lat - latDelta,
    west: center.lng - lngDelta,
    north: center.lat + latDelta,
    east: center.lng + lngDelta,
  };
}

function buildOverpassQuery(radiusKm = FULL_LOAD_RADIUS_KM, fastMode = false) {
  const bbox = getOverpassBBox(radiusKm);
  if (!bbox) {
    return null;
  }

  if (fastMode) {
    return `
      [out:json][timeout:15];
      (
        node["highway"="speed_camera"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["enforcement"="maxspeed"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["enforcement"="camera"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["enforcement"~"."](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      );
      out tags;
    `;
  }

  return `
    [out:json][timeout:30];
    (
      node["highway"="speed_camera"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      way["highway"="speed_camera"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      relation["highway"="speed_camera"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      node["enforcement"="maxspeed"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      node["enforcement"="camera"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      node["enforcement"~"."](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      node["man_made"="surveillance"]["surveillance:type"="camera"]["surveillance"="traffic"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      node["man_made"="surveillance"]["surveillance:type"="camera"]["surveillance"="speed"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      node["man_made"="surveillance"]["camera:type"="enforcement"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      node["traffic_sign"="maxspeed"]["camera"="yes"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      way["enforcement"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    );
    out center tags;
  `;
}

function getPublicPointType(tags) {
  if (!tags) {
    return "other";
  }

  // Speed cameras - alle varianten
  if (tags.highway === "speed_camera") {
    return "speed_camera";
  }

  // Enforcement cameras - alle varianten
  if (tags.enforcement === "maxspeed" || 
      tags.enforcement === "camera" || 
      tags.enforcement) {
    return "enforcement";
  }

  // Surveillance cameras met traffic/speed monitoring
  if (tags.man_made === "surveillance" && tags["surveillance:type"] === "camera") {
    if (tags.surveillance === "traffic" || 
        tags.surveillance === "speed" || 
        tags["camera:type"] === "enforcement") {
      return "speed_camera";
    }
  }

  // Traffic signs met camera
  if (tags.traffic_sign === "maxspeed" && tags.camera === "yes") {
    return "speed_camera";
  }

  if (tags.amenity === "police") {
    return "police";
  }

  if (tags.amenity === "hospital") {
    return "hospital";
  }

  if (tags.amenity === "fire_station") {
    return "fire_station";
  }

  if (tags.emergency === "ambulance_station") {
    return "ambulance_station";
  }

  if (tags.highway === "traffic_signals") {
    return "traffic_signal";
  }

  if (tags.traffic_calming || tags.highway === "speed_bump") {
    return "traffic_calming";
  }

  if (tags.amenity === "fuel") {
    return "fuel";
  }

  return "other";
}

function getPublicCameraLabel(tags) {
  const type = getPublicPointType(tags);
  const baseLabel = PUBLIC_POINT_INFO[type]?.label || PUBLIC_POINT_INFO.other.label;

  if (!tags) {
    return baseLabel;
  }

  if ((type === "speed_camera" || type === "enforcement") && tags.maxspeed) {
    return `${baseLabel} ${tags.maxspeed}`;
  }

  if (tags.name) {
    return tags.name;
  }

  if (type === "enforcement" && tags.enforcement) {
    return `Controle (${tags.enforcement})`;
  }

  return baseLabel;
}

async function loadPublicSpeedCameras(forceReload = false) {
  const options = arguments[1] || {};
  const radiusKm = options.radiusKm || FULL_LOAD_RADIUS_KM;
  const fastMode = Boolean(options.fastMode);

  if (!map || loadingPublicCameras) {
    return;
  }

  // Smart caching: alleen herladen als data oud is OF kaart ver verplaatst is
  if (!forceReload && publicCamerasLoaded) {
    const now = Date.now();
    const timeSinceLoad = now - lastDataLoadTime;
    
    if (timeSinceLoad < DATA_CACHE_TIME_MS) {
      const currentCenter = latestUserLocation || map.getCenter();
      if (lastDataLoadCenter) {
        const distanceMoved = haversineDistance(
          lastDataLoadCenter.lat,
          lastDataLoadCenter.lng,
          currentCenter.lat,
          currentCenter.lng
        );
        if (distanceMoved < MIN_RELOAD_DISTANCE_M) {
          return; // Data is vers en kaart is weinig verplaatst
        }
      }
    }
  }

  loadingPublicCameras = true;
  updatePublicCameraButton();

  try {
    const query = buildOverpassQuery(radiusKm, fastMode);
    if (!query) {
      throw new Error("Geen kaartgebied beschikbaar");
    }

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`Serverfout ${response.status}`);
    }

    const data = await response.json();
    publicCameraLayer.clearLayers();
    publicPointsIndex = [];

    const stats = {
      speed_camera: 0,
      police: 0,
      hospital: 0,
      fire_station: 0,
      ambulance_station: 0,
      traffic_signal: 0,
      traffic_calming: 0,
      fuel: 0,
      enforcement: 0,
      other: 0,
    };

    let added = 0;
    (data.elements || []).forEach((element) => {
      const lat = element.lat ?? element.center?.lat;
      const lon = element.lon ?? element.center?.lon;
      if (typeof lat !== "number" || typeof lon !== "number") {
        return;
      }

      const pointType = getPublicPointType(element.tags);
      stats[pointType] += 1;
      const typeInfo = PUBLIC_POINT_INFO[pointType] || PUBLIC_POINT_INFO.other;
      const label = getPublicCameraLabel(element.tags);
      const extraMaxspeed = element.tags?.maxspeed ? `<br>Max: ${element.tags.maxspeed}` : "";
      const extraRef = element.tags?.ref ? `<br>Ref: ${element.tags.ref}` : "";
      const popup = `
        <strong>${typeInfo.icon} ${label}</strong><br>
        Type: openbare kaartdata<br>
        Bron: OpenStreetMap/Overpass
        ${extraMaxspeed}
        ${extraRef}
      `;

      const marker = L.marker([lat, lon], {
        icon: L.divIcon({
          className: "report-marker",
          html: `<div style="font-size: 22px;">${typeInfo.icon}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).bindPopup(popup);

      publicCameraLayer.addLayer(marker);
      publicPointsIndex.push({
        id: `${pointType}:${lat.toFixed(5)}:${lon.toFixed(5)}`,
        type: pointType,
        label,
        lat,
        lon,
      });
      added += 1;
    });

    publicCameraCount = added;
    publicCameraStats = stats;
    publicCamerasLoaded = true;
    publicCameraLayer.addTo(map);
    lastDataLoadTime = Date.now();
    lastDataLoadCenter = latestUserLocation || map.getCenter();
    updatePublicDataSummary();
    
    const totalCameras = stats.speed_camera + stats.enforcement;
    const modeLabel = fastMode ? "snelle start" : "volledige load";
    addLogEntry(`✅ ${totalCameras} flitsers geladen (${modeLabel}, ${radiusKm * 2}x${radiusKm * 2}km)`, "success");
    checkSpeedCameraProximityAlerts();
  } catch (error) {
    addLogEntry(`Openbare data laden mislukt: ${error.message}`, "warning");
  } finally {
    loadingPublicCameras = false;
    updatePublicCameraButton();
  }
}

async function togglePublicSpeedCameras() {
  if (!map) {
    return;
  }

  if (!publicCamerasLoaded) {
    await loadPublicSpeedCameras();
    return;
  }

  if (map.hasLayer(publicCameraLayer)) {
    map.removeLayer(publicCameraLayer);
    addLogEntry("Openbare kaartpunten verborgen", "info");
  } else {
    map.addLayer(publicCameraLayer);
    addLogEntry("Openbare kaartpunten getoond", "info");
    // Gebruik smart caching - alleen herladen als data oud is
    await loadPublicSpeedCameras(false);
  }

  updatePublicCameraButton();
}

function createMap() {
  map = L.map("map").setView([latestUserLocation.lat, latestUserLocation.lng], 15);
  applyMapTheme();
  updateCompassWidget();

  publicCameraLayer = L.layerGroup();

  const carIcon = L.divIcon({
    className: "car-icon-rotatable",
    html: `<div class="car-arrow" style="transform: rotate(${currentHeading}deg)">
             <svg width="26" height="26" viewBox="0 0 26 26">
               <path d="M13 2 L22 22 L13 18 L4 22 Z" fill="#3b82f6" stroke="#fff" stroke-width="2"/>
             </svg>
           </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

  const emergencyIcon = L.divIcon({
    className: "car-icon",
    html: "🚨",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

  userMarker = L.marker([latestUserLocation.lat, latestUserLocation.lng], { 
    icon: carIcon,
    draggable: true  // Make it draggable!
  })
    .addTo(map)
    .bindPopup("🚗 Jouw auto (sleep me!)");

  // Handle dragging
  userMarker.on("dragstart", () => {
    lastManualMapInteractionAt = Date.now();
    if (settings.autoCenter) {
      manualFollowPaused = true;
      updateFollowButtonVisibility();
    }
    addLogEntry("Auto wordt verplaatst...", "info");
  });

  userMarker.on("dragend", (e) => {
    const newPos = e.target.getLatLng();
    latestUserLocation = { lat: newPos.lat, lng: newPos.lng };
    alertCircle.setLatLng([newPos.lat, newPos.lng]);
    // updateEmergencyMarker(currentLevel); // Disabled - focus on speed cameras
    
    const mapInfo = document.getElementById("mapInfo");
    mapInfo.textContent = settings.showDebugInfo ? `Handmatig: ${newPos.lat.toFixed(5)}, ${newPos.lng.toFixed(5)}` : '';
    mapInfo.style.display = settings.showDebugInfo ? 'block' : 'none';
    addLogEntry(`Auto verplaatst naar ${newPos.lat.toFixed(4)}, ${newPos.lng.toFixed(4)}`, "success");
  });

  const initialEmergency = movePoint(latestUserLocation.lat, latestUserLocation.lng, 320, 35);
  // Emergency marker disabled - focus on speed cameras only
  // emergencyMarker = L.marker([initialEmergency.lat, initialEmergency.lng], { icon: emergencyIcon })
  //   .addTo(map)
  //   .bindPopup("🚨 Gesimuleerde hulpdienst");

  alertCircle = L.circle([latestUserLocation.lat, latestUserLocation.lng], {
    radius: 100, // Small circle just for location reference
    color: '#22c55e',
    fillColor: '#22c55e',
    fillOpacity: 0.1,
    weight: 2,
  }).addTo(map);

  map.on("moveend", () => {
    if (!publicCamerasLoaded || !map.hasLayer(publicCameraLayer)) {
      return;
    }

    clearTimeout(publicDataRefreshTimer);
    publicDataRefreshTimer = setTimeout(() => {
      // Smart caching check - alleen herladen als genoeg verplaatst of cache oud
      loadPublicSpeedCameras(false, { radiusKm: FULL_LOAD_RADIUS_KM, fastMode: false });
    }, 5000); // 5 seconden wachten voor groot gebied
  });

  map.on("dragstart zoomstart", () => {
    lastManualMapInteractionAt = Date.now();
    if (settings.autoCenter) {
      manualFollowPaused = true;
      updateFollowButtonVisibility();
    }
  });
  
  addLogEntry("Kaart geladen", "success");
  
  // 2-fase startup: eerst snel dichtbij, daarna volledige dekking op achtergrond
  setTimeout(async () => {
    addLogEntry("⚡ Snelle start: dichtbij flitsers laden...", "info");
    await loadPublicSpeedCameras(true, { radiusKm: FAST_LOAD_RADIUS_KM, fastMode: true });

    setTimeout(() => {
      addLogEntry("🌍 Achtergrond: volledige dekking laden...", "info");
      loadPublicSpeedCameras(true, { radiusKm: FULL_LOAD_RADIUS_KM, fastMode: false });
    }, 300);
  }, 1000);
}

function updateMapLocation(latitude, longitude) {
  if (!map || !userMarker || !alertCircle) {
    return;
  }

  // Calculate speed with smooth decay
  const currentTime = Date.now();
  let calculatedSpeed = lastSpeed;
  
  if (lastPosition && lastPositionTime) {
    const timeDiff = (currentTime - lastPositionTime) / 1000; // seconds
    const distance = getDistanceMeters(lastPosition.lat, lastPosition.lng, latitude, longitude);
    
    if (timeDiff > 0) {
      const rawSpeed = (distance / timeDiff) * 3.6; // Convert m/s to km/h
      
      // Smooth speed updates: 70% new value, 30% old value (low-pass filter)
      calculatedSpeed = lastSpeed * 0.3 + rawSpeed * 0.7;
      
      // When barely moving, apply exponential decay to speed
      if (distance < 2) {
        calculatedSpeed = calculatedSpeed * 0.5; // Heavy damping when stationary
      }
      
      lastSpeed = calculatedSpeed;
      
      // Calculate bearing from movement if GPS heading not available
      if (currentHeading === 0 || currentHeading === null || currentHeading === undefined) {
        currentHeading = calculateBearing(lastPosition.lat, lastPosition.lng, latitude, longitude);
      }
    }
  }
  
  lastPosition = { lat: latitude, lng: longitude };
  lastPositionTime = currentTime;

  const speedKmh = Math.max(0, Math.round(lastSpeed));
  if (speedKmh <= 2) {
    accelStartTime = Date.now();
  } else if (speedKmh >= 100 && accelStartTime) {
    lastZeroToHundredMs = Date.now() - accelStartTime;
    accelStartTime = null;
  }

  latestUserLocation = { lat: latitude, lng: longitude };
  const latLng = [latitude, longitude];
  userMarker.setLatLng(latLng);
  alertCircle.setLatLng(latLng);
  
  // Update car rotation based on heading
  if (currentHeading !== null && currentHeading !== undefined) {
    const carArrow = userMarker.getElement()?.querySelector('.car-arrow');
    if (carArrow) {
      carArrow.style.transform = `rotate(${currentHeading}deg)`;
    }
    updateCompassWidget();
  }
  
  // Throttle map updates to prevent freezing during fast GPS updates
  if (settings.autoCenter && !manualFollowPaused) {
    const now = Date.now();
    if (now - lastMapUpdateTime >= 300) { // Only pan every 300ms
      lastMapUpdateTime = now;
      map.panTo(latLng, { animate: true, duration: 0.35 });
    }
  }

  // Ook tijdens rijden automatisch nieuwe gebieden laden wanneer nodig.
  const now = Date.now();
  if (now - lastCameraCheckTime >= 1500) { // Only check every 1.5 seconds
    lastCameraCheckTime = now;
    loadPublicSpeedCameras(false, { radiusKm: FULL_LOAD_RADIUS_KM, fastMode: false });
    checkSpeedCameraProximityAlerts();
  }

  // Update speed display smoothly
  const speedValue = document.getElementById("speedValue");
  const accelValue = document.getElementById("accelValue");
  const profileAcceleration = document.getElementById("lastZeroToHundred");
  if (speedValue) {
    speedValue.textContent = `${speedKmh} km/h`;
    // Add smooth transition class
    speedValue.style.transition = 'all 0.3s ease-out';
  }
  if (accelValue) {
    accelValue.textContent = `0-100: ${lastZeroToHundredMs ? `${(lastZeroToHundredMs / 1000).toFixed(1)}s` : "--"}`;
  }
  if (profileAcceleration) {
    profileAcceleration.textContent = `Laatste 0-100: ${lastZeroToHundredMs ? `${(lastZeroToHundredMs / 1000).toFixed(1)}s` : "--"}`;
  }

  const mapInfo = document.getElementById("mapInfo");
  mapInfo.textContent = settings.showDebugInfo ? `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : '';
  mapInfo.style.display = settings.showDebugInfo ? 'block' : 'none';
}

function updateCircleByLevel(level) {
  const config = LEVEL_CONFIG[level];
  if (!config || !alertCircle) {
    return;
  }

  alertCircle.setStyle({
    color: config.color,
    fillColor: config.color,
  });
  alertCircle.setRadius(config.radius);
}

function setDemoLocation() {
  updateMapLocation(52.0116, 4.7571);
  const mapInfo = document.getElementById("mapInfo");
  mapInfo.textContent = "Testlocatie actief (GPS fallback): 52.01160, 4.75710";
}

function startGpsTracking() {
  if (!navigator.geolocation) {
    const mapInfo = document.getElementById("mapInfo");
    mapInfo.textContent = "GPS niet ondersteund in deze browser. Gebruik testlocatie.";
    setDemoLocation();
    return;
  }

  if (!window.isSecureContext && window.location.hostname !== "localhost") {
    const mapInfo = document.getElementById("mapInfo");
    mapInfo.textContent = "GPS geblokkeerd: open via HTTPS of gebruik testlocatie.";
    setDemoLocation();
    return;
  }

  navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, heading } = position.coords;
      if (heading !== null && heading !== undefined && !isNaN(heading)) {
        currentHeading = heading;
      }
      updateMapLocation(latitude, longitude);
    },
    (error) => {
      const mapInfo = document.getElementById("mapInfo");
      if (error && error.code === 1) {
        mapInfo.textContent = "Locatie geweigerd. Sta locatie toe of gebruik testlocatie.";
      } else if (error && error.code === 2) {
        mapInfo.textContent = "Locatie niet beschikbaar. Gebruik testlocatie.";
      } else {
        mapInfo.textContent = "GPS timeout/fout. Gebruik testlocatie.";
      }
      setDemoLocation();
    },
    {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 8000,
    }
  );
}

function applyLevel(level) {
  const statusCircle = document.getElementById("statusCircle");
  const statusText = document.getElementById("statusText");
  const oldLevel = currentLevel;

  statusCircle.classList.remove("green", "orange", "red");
  currentLevel = level;
  updateCircleByLevel(level);

  if (level === 1) {
    statusCircle.classList.add("green");
    statusText.textContent = LEVEL_CONFIG[1].text;
  } else if (level === 2) {
    statusCircle.classList.add("orange");
    statusText.textContent = LEVEL_CONFIG[2].text;
  } else {
    statusCircle.classList.add("red");
    statusText.textContent = LEVEL_CONFIG[3].text;
  }

  updateAlertStrip(level);
  updateEmergencyMarker(level);
  
  // Log and notify on level change
  if (oldLevel !== level) {
    const logType = level === 3 ? "danger" : level === 2 ? "warning" : "success";
    addLogEntry(`Level gewijzigd naar ${level} (${LEVEL_CONFIG[level].label})`, logType);
    playAlertSound(level);
    
    if (level === 3) {
      showNotification("KRITIEK NIVEAU!", "Hulpdienst zeer dichtbij!", 3);
    } else if (level === 2) {
      showNotification("Waarschuwing", "Hulpdienst nadert!", 2);
    }
  }
}

function loadLevelFromStatusFile() {
  const level = normalizeLevel(window.PROTO_SIGNAL_LEVEL);
  const manualLevel = document.getElementById("manualLevel");
  manualLevel.value = String(level);
  applyLevel(level);
}

// ============================================
// REPORTS SYSTEM (Flitsmeister-style)
// ============================================

let userReports = [];
let reportMarkers = [];
let reportsSyncTimer = null;
let reportsSyncInFlight = false;
let lastCloudReportsHash = "";
const REPORTS_SYNC_INTERVAL_MS = 500;

function hasCloudReportsConfig() {
  return Boolean(window.APP_CONFIG?.apiBaseUrl);
}

function getCloudAuthHeaders() {
  if (!hasCloudReportsConfig() || !authAccessToken) {
    return null;
  }

  return {
    Authorization: `Bearer ${authAccessToken}`,
  };
}

function getApiBaseUrl() {
  return (window.APP_CONFIG?.apiBaseUrl || "/.netlify/functions").replace(/\/$/, "");
}

function isAuthRequired() {
  return Boolean(window.APP_CONFIG?.requireAuth);
}

function getRequestTimeoutMs() {
  const value = Number(window.APP_CONFIG?.requestTimeoutMs);
  return Number.isFinite(value) && value > 0 ? value : 10000;
}

function buildDemoSession() {
  const configured = window.APP_CONFIG?.demoUser || {};
  return {
    user: {
      id: configured.id || "demo-user",
      name: configured.name || "Demo User",
      email: configured.email || "demo@local",
      birth_date: configured.birth_date || "1990-01-01",
      email_verified: configured.email_verified !== false,
    },
    access_token: null,
    refresh_token: null,
  };
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getRequestTimeoutMs());
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return { response, data };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Verzoek timeout. Controleer verbinding en probeer opnieuw.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCloudReports() {
  const authHeaders = getCloudAuthHeaders();
  if (!authHeaders) {
    return null;
  }

  const url = `${getApiBaseUrl()}/reports-list`;
  const response = await fetch(url, {
    headers: authHeaders,
  });

  if (!response.ok) {
    throw new Error(`Cloud sync fout ${response.status}`);
  }

  return response.json();
}

async function pushReportToCloud(report) {
  const authHeaders = getCloudAuthHeaders();
  if (!authHeaders) {
    return;
  }

  const url = `${getApiBaseUrl()}/reports-create`;
  const payload = {
    ...report,
    owner_email: currentUser?.email || null,
    owner_id: currentUser?.id || null,
  };

  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });
}

async function deleteReportFromCloud(reportId) {
  const authHeaders = getCloudAuthHeaders();
  if (!authHeaders) {
    return;
  }

  const url = `${getApiBaseUrl()}/reports-delete?id=${encodeURIComponent(reportId)}`;
  await fetch(url, {
    method: "DELETE",
    headers: authHeaders,
  });
}

async function updateCloudConfirmation(reportId, confirmed) {
  const authHeaders = getCloudAuthHeaders();
  if (!authHeaders) {
    return;
  }

  const url = `${getApiBaseUrl()}/reports-update?id=${encodeURIComponent(reportId)}`;
  await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ confirmed }),
  });
}

const REPORT_TYPES = {
  "flitser-50": { icon: "📷", label: "Flitser 50 km/u", color: "#ef4444" },
  "flitser-80": { icon: "📷", label: "Flitser 80 km/u", color: "#f59e0b" },
  "controle": { icon: "👮", label: "Politiecontrole", color: "#3b82f6" },
  "hulpdienst": { icon: "🚨", label: "Hulpdienst", color: "#ef4444" },
  "ongeluk": { icon: "💥", label: "Ongeluk", color: "#dc2626" },
  "file": { icon: "🚗", label: "File", color: "#f59e0b" },
  "object": { icon: "⚠️", label: "Object op weg", color: "#f59e0b" },
  "anders": { icon: "❓", label: "Anders", color: "#6b7280" },
};

async function loadReports() {
  const saved = localStorage.getItem("hulpdienstenReports");
  if (saved) {
    userReports = JSON.parse(saved);
    // Remove expired reports (older than 2 hours)
    const now = Date.now();
    userReports = userReports.filter(r => (now - r.timestamp) < 2 * 60 * 60 * 1000);
    saveReports();
    updateReportsDisplay();
    displayReportsOnMap();
  }

  if (hasCloudReportsConfig()) {
    try {
      const cloudReports = await fetchCloudReports();
      if (Array.isArray(cloudReports) && cloudReports.length > 0) {
        userReports = cloudReports;
        lastCloudReportsHash = JSON.stringify(cloudReports);
        saveReports();
        updateReportsDisplay();
        displayReportsOnMap();
        addLogEntry("☁️ Cloud meldingen gesynchroniseerd", "success");
      }
    } catch (error) {
      addLogEntry("Cloud sync niet beschikbaar, lokale opslag actief", "warning");
    }
  }
}

async function syncCloudReportsRealtime() {
  if (reportsSyncInFlight || !hasCloudReportsConfig() || !authAccessToken) {
    return;
  }

  reportsSyncInFlight = true;
  try {
    const cloudReports = await fetchCloudReports();
    if (!Array.isArray(cloudReports)) {
      return;
    }

    const nextHash = JSON.stringify(cloudReports);
    if (nextHash === lastCloudReportsHash) {
      return;
    }

    lastCloudReportsHash = nextHash;
    userReports = cloudReports;
    saveReports();
    updateReportsDisplay();
    displayReportsOnMap();
  } catch {
  } finally {
    reportsSyncInFlight = false;
  }
}

function startRealtimeReportsSync() {
  stopRealtimeReportsSync();
  reportsSyncTimer = setInterval(() => {
    syncCloudReportsRealtime();
  }, REPORTS_SYNC_INTERVAL_MS);
}

function stopRealtimeReportsSync() {
  if (!reportsSyncTimer) {
    return;
  }
  clearInterval(reportsSyncTimer);
  reportsSyncTimer = null;
}

function saveReports() {
  localStorage.setItem("hulpdienstenReports", JSON.stringify(userReports));
}

function isReportOwner(report) {
  if (!report || !currentUser) {
    return false;
  }

  if (report.owner_id && currentUser.id) {
    return report.owner_id === currentUser.id;
  }

  if (report.owner_email && currentUser.email) {
    return report.owner_email === currentUser.email;
  }

  return false;
}

function placeReport(type) {
  const report = {
    id: Date.now().toString(),
    type: type,
    location: { ...latestUserLocation },
    timestamp: Date.now(),
    confirmed: 0,
    owner_id: currentUser?.id || null,
    owner_email: currentUser?.email || null,
  };
  
  userReports.unshift(report);
  saveReports();
  updateReportsDisplay();
  displayReportsOnMap();
  pushReportToCloud(report).catch(() => {});
  
  const typeInfo = REPORT_TYPES[type];
  addLogEntry(`Melding geplaatst: ${typeInfo.label}`, "success");
  playAlertSound(1);
  
  if (settings.notificationsEnabled) {
    showNotification("Melding Geplaatst", `${typeInfo.icon} ${typeInfo.label}`, 1);
  }
  
  closeReportModal();
}

function updateReportsDisplay() {
  const reportsList = document.getElementById("reportsList");
  
  if (userReports.length === 0) {
    reportsList.innerHTML = '<div class="report-item report-empty">Nog geen meldingen</div>';
    return;
  }
  
  reportsList.innerHTML = userReports.map(report => {
    const typeInfo = REPORT_TYPES[report.type];
    const age = Math.floor((Date.now() - report.timestamp) / 60000); // minutes
    const timeText = age < 1 ? "Net nu" : age < 60 ? `${age} min` : `${Math.floor(age/60)}u geleden`;
    const canEdit = isReportOwner(report);
    
    return `
      <div class="report-item" style="border-left-color: ${typeInfo.color}">
        <div class="report-info">
          <div class="report-type">${typeInfo.icon} ${typeInfo.label}</div>
          <div class="report-time">${timeText}</div>
        </div>
        <div class="report-actions">
          ${canEdit
            ? `<button onclick="confirmReport('${report.id}')">👍</button>
               <button onclick="deleteReport('${report.id}')">🗑️</button>`
            : `<span style="font-size:10px;color:#94a3b8;">alleen eigenaar</span>`}
        </div>
      </div>
    `;
  }).join("");
}

function displayReportsOnMap() {
  // Remove old markers
  reportMarkers.forEach(marker => map.removeLayer(marker));
  reportMarkers = [];
  
  // Add new markers
  userReports.forEach(report => {
    const typeInfo = REPORT_TYPES[report.type];
    
    const reportIcon = L.divIcon({
      className: "report-marker",
      html: `<div style="font-size: 24px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${typeInfo.icon}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
    
    const marker = L.marker([report.location.lat, report.location.lng], { icon: reportIcon })
      .addTo(map)
      .bindPopup(`
        <strong>${typeInfo.label}</strong><br>
        ${new Date(report.timestamp).toLocaleTimeString("nl-NL")}<br>
        👍 ${report.confirmed} bevestigingen
      `);
    
    reportMarkers.push(marker);
  });
}

function confirmReport(reportId) {
  const report = userReports.find(r => r.id === reportId);
  if (report) {
    if (!isReportOwner(report)) {
      addLogEntry("Alleen eigenaar kan melding bewerken", "warning");
      return;
    }

    report.confirmed++;
    saveReports();
    updateReportsDisplay();
    displayReportsOnMap();
    updateCloudConfirmation(reportId, report.confirmed).catch(() => {});
    addLogEntry("Melding bevestigd", "success");
  }
}

function deleteReport(reportId) {
  const report = userReports.find(r => r.id === reportId);
  if (report && !isReportOwner(report)) {
    addLogEntry("Alleen eigenaar kan melding verwijderen", "warning");
    return;
  }

  userReports = userReports.filter(r => r.id !== reportId);
  saveReports();
  updateReportsDisplay();
  displayReportsOnMap();
  deleteReportFromCloud(reportId).catch(() => {});
  addLogEntry("Melding verwijderd", "info");
}

function clearAllReports() {
  if (confirm("Alle meldingen wissen?")) {
    const ownReportIds = userReports.filter((report) => isReportOwner(report)).map((report) => report.id);
    userReports = userReports.filter((report) => !isReportOwner(report));

    ownReportIds.forEach((reportId) => {
      deleteReportFromCloud(reportId).catch(() => {});
    });

    saveReports();
    updateReportsDisplay();
    displayReportsOnMap();
    addLogEntry("Eigen meldingen gewist", "info");
  }
}

function openReportModal() {
  document.getElementById("reportModal").classList.add("active");
}

function closeReportModal() {
  document.getElementById("reportModal").classList.remove("active");
}

// Make functions globally accessible for onclick handlers
window.confirmReport = confirmReport;
window.deleteReport = deleteReport;

// ============================================
// EVENT LISTENERS
// ============================================
function on(id, eventName, handler) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener(eventName, handler);
  }
}

function togglePanel(modalId, forceOpen = null) {
  const panel = document.getElementById(modalId);
  if (!panel) {
    return;
  }

  const shouldOpen = forceOpen === null ? !panel.classList.contains("active") : forceOpen;
  panel.classList.toggle("active", shouldOpen);
}

function toggleActionMenu(forceOpen = null) {
  const menu = document.getElementById("actionMenu");
  const fab = document.getElementById("actionFab");
  if (!menu || !fab) {
    return;
  }

  const shouldOpen = forceOpen === null ? menu.classList.contains("hidden") : forceOpen;
  menu.classList.toggle("hidden", !shouldOpen);
  fab.textContent = shouldOpen ? "✕" : "＋";
}

let appStarted = false;

function showApp() {
  document.getElementById("loginScreen")?.classList.add("hidden");
  document.getElementById("appShell")?.classList.remove("hidden");
}

function showLogin() {
  document.getElementById("appShell")?.classList.add("hidden");
  document.getElementById("loginScreen")?.classList.remove("hidden");
}

function setLoginHint(message, type = "info") {
  const loginHint = document.getElementById("loginHint");
  if (!loginHint) {
    return;
  }

  loginHint.textContent = message;
  loginHint.style.color = type === "error" ? "#fca5a5" : type === "success" ? "#86efac" : "#94a3b8";
}

function hasAuthConfig() {
  return Boolean(window.APP_CONFIG?.apiBaseUrl);
}

function getAuthApiHeaders() {
  if (!hasAuthConfig()) {
    return null;
  }

  return {
    "Content-Type": "application/json",
  };
}

function setSession(sessionData, remember) {
  currentUser = sessionData.user || null;
  authAccessToken = sessionData.access_token || null;
  authRefreshToken = sessionData.refresh_token || null;

  if (remember) {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(currentUser));
    localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, authAccessToken || "");
    localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, authRefreshToken || "");
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  } else {
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(currentUser));
    sessionStorage.setItem(AUTH_ACCESS_TOKEN_KEY, authAccessToken || "");
    sessionStorage.setItem(AUTH_REFRESH_TOKEN_KEY, authRefreshToken || "");
    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  }
}

function getSession() {
  const rawUser = localStorage.getItem(AUTH_SESSION_KEY) || sessionStorage.getItem(AUTH_SESSION_KEY);
  const rawAccessToken = localStorage.getItem(AUTH_ACCESS_TOKEN_KEY) || sessionStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
  const rawRefreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY) || sessionStorage.getItem(AUTH_REFRESH_TOKEN_KEY);

  if (!rawUser || !rawAccessToken) {
    return null;
  }

  try {
    return {
      user: JSON.parse(rawUser),
      access_token: rawAccessToken,
      refresh_token: rawRefreshToken || null,
    };
  } catch {
    return null;
  }
}

function clearSession() {
  stopRealtimeReportsSync();
  currentUser = null;
  authAccessToken = null;
  authRefreshToken = null;
  localStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  sessionStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
}

async function supabaseRegister({ name, email, password, birthDate }) {
  if (!hasAuthConfig()) {
    throw new Error("API config ontbreekt in config.js");
  }

  const { response, data } = await fetchJson(`${getApiBaseUrl()}/auth-register`, {
    method: "POST",
    headers: getAuthApiHeaders(),
    body: JSON.stringify({
      email,
      password,
      name,
      birthDate,
    }),
  });

  if (!response.ok) {
    throw new Error(data?.error || `Registratie mislukt (${response.status})`);
  }

  return data;
}

async function supabaseLogin(email, password) {
  if (!hasAuthConfig()) {
    throw new Error("API config ontbreekt in config.js");
  }

  const { response, data } = await fetchJson(`${getApiBaseUrl()}/auth-login`, {
    method: "POST",
    headers: getAuthApiHeaders(),
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(data?.error || `Inloggen mislukt (${response.status})`);
  }

  return data;
}

async function supabaseLogout() {
  if (!hasAuthConfig() || !authAccessToken) {
    return;
  }

  await fetch(`${getApiBaseUrl()}/auth-logout`, {
    method: "POST",
    headers: {
      ...getAuthApiHeaders(),
      Authorization: `Bearer ${authAccessToken}`,
    },
  });
}

async function validateExistingSession(session) {
  if (!session || !session.access_token || !hasAuthConfig()) {
    return null;
  }

  try {
    const { response, data } = await fetchJson(`${getApiBaseUrl()}/auth-me`, {
      headers: {
        ...getAuthApiHeaders(),
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return {
      ...session,
      user: data,
    };
  } catch {
    return null;
  }
}

function startAppIfNeeded() {
  if (appStarted) {
    return;
  }

  loadSettings();
  populateVoiceSelect();

  if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      populateVoiceSelect();
      updateUISettings();
    };
  }

  createMap();
  startGpsTracking();
  loadLevelFromStatusFile();
  loadReports();
  startRealtimeReportsSync();
  setBluetoothUiState(false, "Bluetooth: niet verbonden");
  updateSignalOrbVisual(0, false, "green");
  updatePublicCameraButton();
  startRfSignalDecayLoop();
  addLogEntry("✅ Flitser Alert Pro gestart", "success");
  appStarted = true;
}

function switchAuthTab(tab) {
  const showLogin = tab === "login";
  document.getElementById("loginForm")?.classList.toggle("hidden", !showLogin);
  document.getElementById("registerForm")?.classList.toggle("hidden", showLogin);
  document.getElementById("showLoginTab")?.classList.toggle("active", showLogin);
  document.getElementById("showRegisterTab")?.classList.toggle("active", !showLogin);
}

async function handleLogin(email, password, remember) {
  const sessionData = await supabaseLogin(email, password);
  setSession(sessionData, remember);
  showApp();
  startAppIfNeeded();
  setLoginHint("Ingelogd", "success");
}

on("showLoginTab", "click", () => {
  switchAuthTab("login");
});

on("showRegisterTab", "click", () => {
  switchAuthTab("register");
});

on("loginForm", "submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("loginEmail")?.value?.trim();
  const password = document.getElementById("loginPassword")?.value || "";
  const remember = Boolean(document.getElementById("rememberMe")?.checked);

  if (!email || !password) {
    setLoginHint("Vul e-mail en wachtwoord in.", "error");
    return;
  }

  try {
    await handleLogin(email, password, remember);
  } catch (error) {
    setLoginHint(error.message || "Inloggen mislukt", "error");
  }
});

on("registerForm", "submit", async (event) => {
  event.preventDefault();
  const name = document.getElementById("registerName")?.value?.trim();
  const email = document.getElementById("registerEmail")?.value?.trim();
  const password = document.getElementById("registerPassword")?.value || "";
  const birthDate = document.getElementById("registerBirthDate")?.value;

  if (!name || !email || !password || !birthDate) {
    setLoginHint("Vul alle registratievelden in.", "error");
    return;
  }

  try {
    const registrationResult = await supabaseRegister({ name, email, password, birthDate });
    setLoginHint("Account aangemaakt! Log nu in.", "success");
    switchAuthTab("login");
    const loginEmail = document.getElementById("loginEmail");
    if (loginEmail) {
      loginEmail.value = email;
    }
  } catch (error) {
    setLoginHint(error.message || "Registratie mislukt", "error");
  }
});

on("logoutBtn", "click", async () => {
  await supabaseLogout();
  clearSession();
  toggleActionMenu(false);
  showLogin();
  setLoginHint("Uitgelogd.", "info");
});

on("refreshBtn", "click", () => {
  loadLevelFromStatusFile();
  addLogEntry("Level herladen uit status.js", "info");
});

on("applyBtn", "click", () => {
  const manualLevel = document.getElementById("manualLevel");
  if (manualLevel) {
    applyLevel(normalizeLevel(manualLevel.value));
  }
});

on("demoLocBtn", "click", () => {
  setDemoLocation();
});

on("centerMapBtn", "click", () => {
  if (map && latestUserLocation) {
    lastManualMapInteractionAt = 0;
    manualFollowPaused = false;
    updateFollowButtonVisibility();
    map.panTo([latestUserLocation.lat, latestUserLocation.lng], { animate: true, duration: 0.35 });
    addLogEntry("Kaart gecentreerd", "info");
  }
  toggleActionMenu(false);
});

on("togglePublicCamsBtn", "click", async () => {
  await togglePublicSpeedCameras();
});

on("cameraAlertDistanceSelect", "change", (event) => {
  settings.speedCameraAlertRadius = Number(event.target.value) || 450;
  saveSettings();
  updateUISettings();
  addLogEntry(`Flitser-alert afstand ingesteld op ${settings.speedCameraAlertRadius}m`, "info");
});

on("voiceSelect", "change", (event) => {
  settings.selectedVoice = event.target.value || "auto";
  saveSettings();
  addLogEntry("Stem gewijzigd", "info");
});

on("voiceToggle", "change", (event) => {
  settings.voiceEnabled = Boolean(event.target.checked);
  saveSettings();
  addLogEntry(`Spraak ${settings.voiceEnabled ? "aan" : "uit"}`, "info");
});

on("autoCenterToggle", "change", (event) => {
  settings.autoCenter = Boolean(event.target.checked);
  if (settings.autoCenter) {
    manualFollowPaused = false;
  }
  saveSettings();
  updateFollowButtonVisibility();
  addLogEntry(`Auto center ${settings.autoCenter ? "aan" : "uit"}`, "info");
});

on("mapThemeSelect", "change", (event) => {
  settings.mapTheme = event.target.value || "auto";
  saveSettings();
  applyMapTheme();
  addLogEntry(`Kaartmodus ingesteld op ${settings.mapTheme === "auto" ? "automatisch" : settings.mapTheme}`, "info");
});

on("followMapBtn", "click", () => {
  if (!map || !latestUserLocation) {
    return;
  }

  settings.autoCenter = true;
  manualFollowPaused = false;
  lastManualMapInteractionAt = 0;
  saveSettings();
  updateUISettings();
  map.panTo([latestUserLocation.lat, latestUserLocation.lng], { animate: true, duration: 0.35 });
  addLogEntry("Volg mij weer actief", "success");
});

on("debugInfoToggle", "change", (event) => {
  settings.showDebugInfo = Boolean(event.target.checked);
  saveSettings();
  updateUISettings();
  addLogEntry(`Debug info ${settings.showDebugInfo ? "aan" : "uit"}`, "info");
});

on("saveProfileBtn", "click", () => {
  profile.name = document.getElementById("profileName")?.value?.trim() || "";
  profile.vehicle = document.getElementById("profileVehicle")?.value?.trim() || "";
  saveProfile();
  addLogEntry("Profiel opgeslagen", "success");
  togglePanel("profilePanel", false);
});

on("testCameraAlertBtn", "click", () => {
  const testDistance = Math.max(70, Math.round((settings.speedCameraAlertRadius || 450) * 0.5));
  const message = `Flitser voor op ${testDistance} meter`;
  playAlertSound(testDistance <= 120 ? 3 : 2);
  speakFlitserWarning(testDistance);
  showNotification("Test flitser-alert", message, 2);
  addLogEntry(`🧪 Test: ${message}`, "warning");
});

on("clearLog", "click", () => {
  clearLog();
});

on("notifBtn", "click", async () => {
  if (!settings.notificationsEnabled) {
    await requestNotificationPermission();
  } else {
    settings.notificationsEnabled = false;
    saveSettings();
    updateUISettings();
    addLogEntry("Notificaties uitgeschakeld", "info");
  }
});

on("soundBtn", "click", () => {
  settings.soundEnabled = !settings.soundEnabled;
  saveSettings();
  updateUISettings();
  addLogEntry(`Geluid ${settings.soundEnabled ? "in" : "uit"}geschakeld`, "info");
  if (settings.soundEnabled) {
    playAlertSound(1);
  }
});

on("connectBtBtn", "click", async () => {
  if (btConnected) {
    await disconnectBluetoothSerial(true);
    return;
  }

  await connectBluetoothSerial();
});

window.addEventListener("beforeunload", () => {
  if (btConnected) {
    disconnectBluetoothSerial(false);
  }
});

document.body.addEventListener("click", () => {
  if ("speechSynthesis" in window) {
    const warmup = new SpeechSynthesisUtterance("");
    warmup.volume = 0;
    window.speechSynthesis.speak(warmup);
  }
}, { once: true });

document.querySelectorAll("[data-level]").forEach((button) => {
  button.addEventListener("click", () => {
    const level = normalizeLevel(button.getAttribute("data-level"));
    const manualLevel = document.getElementById("manualLevel");
    if (manualLevel) {
      manualLevel.value = String(level);
    }
    applyLevel(level);
  });
});

on("quickReportBtn", "click", () => {
  toggleActionMenu(false);
  openReportModal();
});

on("reportBtn", "click", () => {
  openReportModal();
});

on("closeModal", "click", () => {
  closeReportModal();
});

on("reportModal", "click", (e) => {
  if (e.target.id === "reportModal") {
    closeReportModal();
  }
});

document.querySelectorAll(".report-option").forEach((button) => {
  button.addEventListener("click", () => {
    const type = button.getAttribute("data-type");
    placeReport(type);
  });
});

on("clearReports", "click", () => {
  clearAllReports();
});

on("actionFab", "click", () => {
  toggleActionMenu();
});

on("openSettingsBtn", "click", () => {
  toggleActionMenu(false);
  togglePanel("settingsPanel", true);
});

on("openProfileBtn", "click", () => {
  toggleActionMenu(false);
  togglePanel("profilePanel", true);
});

on("toggleLogBtn", "click", () => {
  const logPanel = document.getElementById("alertLog");
  if (logPanel) {
    logPanel.classList.toggle("minimized");
  }
  toggleActionMenu(false);
});

on("toggleReportsBtn", "click", () => {
  const reportsPanel = document.getElementById("reportsPanel");
  if (reportsPanel) {
    reportsPanel.classList.toggle("minimized");
  }
  toggleActionMenu(false);
});

document.querySelectorAll("[data-close-panel]").forEach((button) => {
  button.addEventListener("click", () => {
    const panelId = button.getAttribute("data-close-panel");
    togglePanel(panelId, false);
  });
});

document.querySelectorAll("#settingsPanel, #profilePanel").forEach((panel) => {
  panel.addEventListener("click", (event) => {
    if (event.target === panel) {
      panel.classList.remove("active");
    }
  });
});

// ============================================
// INITIALIZATION
// ============================================

switchAuthTab("login");

(async () => {
  if (!isAuthRequired()) {
    setSession(buildDemoSession(), false);
    showApp();
    startAppIfNeeded();
    addLogEntry("Demo mode actief (inloggen uitgeschakeld via config.js)", "info");
    return;
  }

  if (!hasAuthConfig()) {
    showLogin();
    setLoginHint("Vul apiBaseUrl in config.js in (/.netlify/functions).", "error");
    return;
  }

  const existingSession = getSession();
  if (!existingSession) {
    showLogin();
    return;
  }

  const validSession = await validateExistingSession(existingSession);
  if (!validSession) {
    clearSession();
    showLogin();
    setLoginHint("Sessie verlopen. Log opnieuw in.", "error");
    return;
  }

  setSession(validSession, true);
  showApp();
  startAppIfNeeded();
})();
