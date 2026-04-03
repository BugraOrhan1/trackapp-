let bleManager;
let emergencyDisplay;
let userWatchId = null;

function updateConnectionUI(connected) {
    const badge = document.getElementById("connectionBadge");
    const connectBtn = document.getElementById("btnConnect");
    const disconnectBtn = document.getElementById("btnDisconnect");
    const startBtn = document.getElementById("btnStartScanner");
    const stopBtn = document.getElementById("btnStopScanner");

    if (badge) {
        badge.textContent = connected ? "Verbonden" : "Niet verbonden";
        badge.classList.toggle("ok", connected);
        badge.classList.toggle("bad", !connected);
    }

    if (connectBtn) connectBtn.disabled = connected;
    if (disconnectBtn) disconnectBtn.disabled = !connected;
    if (startBtn) startBtn.disabled = !connected;
    if (stopBtn) stopBtn.disabled = !connected;
}

function setStatusText(text) {
    const status = document.getElementById("statusText");
    if (status) status.textContent = text;
}

function startUserLocation() {
    if (!navigator.geolocation || userWatchId !== null) return;

    userWatchId = navigator.geolocation.watchPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            emergencyDisplay.updateUserPosition(lat, lng);
        },
        (err) => {
            console.warn("Geolocation error", err);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
}

document.addEventListener("DOMContentLoaded", () => {
    bleManager = new BLEManager();
    emergencyDisplay = new EmergencyServiceDisplay({
        mapId: "map",
        alertId: "alertBanner",
        listId: "detectionsList",
    });

    updateConnectionUI(false);
    startUserLocation();

    if (bleManager.mockMode) {
        setStatusText("Mock mode actief: open met ?mock=1 voor UI test zonder Pi.");
    }

    bleManager.onConnectionChange = (connected) => {
        updateConnectionUI(connected);
        setStatusText(connected ? "BLE verbonden met Raspberry Pi" : "BLE niet verbonden");
    };

    bleManager.onDetectionsUpdate = (payload) => {
        emergencyDisplay.updateDetections(payload);
        const count = payload && payload.detections ? payload.detections.length : 0;
        setStatusText(`Live update: ${count} detectie(s)`);
    };

    bleManager.onError = (error) => {
        console.error("BLE error", error);
        setStatusText(`Fout: ${error.message || error}`);
    };

    const btnConnect = document.getElementById("btnConnect");
    const btnDisconnect = document.getElementById("btnDisconnect");
    const btnStart = document.getElementById("btnStartScanner");
    const btnStop = document.getElementById("btnStopScanner");
    const btnBaseline = document.getElementById("btnBaseline");

    if (btnConnect) btnConnect.addEventListener("click", async () => {
        setStatusText("Bezig met verbinden...");
        const ok = await bleManager.connect();
        if (ok) {
            const payload = await bleManager.readDetections();
            if (payload) emergencyDisplay.updateDetections(payload);
            const status = await bleManager.readStatus();
            if (status) setStatusText(`Scanner status: ${status.status}`);
        } else {
            setStatusText("Verbinding mislukt");
        }
    });

    if (btnDisconnect) btnDisconnect.addEventListener("click", () => {
        bleManager.disconnect();
        setStatusText("Verbinding verbroken");
    });

    if (btnStart) btnStart.addEventListener("click", async () => {
        const ok = await bleManager.startScanner();
        setStatusText(ok ? "Scanner gestart" : "Scanner kon niet starten");
    });

    if (btnStop) btnStop.addEventListener("click", async () => {
        const ok = await bleManager.stopScanner();
        setStatusText(ok ? "Scanner gestopt" : "Scanner kon niet stoppen");
    });

    if (btnBaseline) btnBaseline.addEventListener("click", async () => {
        const ok = await bleManager.baselineScan();
        setStatusText(ok ? "Baseline scan gestart" : "Baseline scan kon niet starten");
    });

    setInterval(async () => {
        if (!bleManager.isConnected()) return;
        const payload = await bleManager.readDetections();
        if (payload) emergencyDisplay.updateDetections(payload);
    }, 5000);
});
