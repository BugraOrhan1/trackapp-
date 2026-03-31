// TrackApp Webapp Main JS
// Auteur: BugraOrhan1
// Versie: 1.0

const ble = new BLEManager();

// UI Elements
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const statusEl = document.getElementById('status');
const locationEl = document.getElementById('location');
const trackingBtn = document.getElementById('tracking-btn');
const routeBtn = document.getElementById('route-btn');
const clearRouteBtn = document.getElementById('clear-route-btn');
const routeList = document.getElementById('route-list');

let trackingActive = false;
let routeHistory = [];

function updateStatusUI(status) {
    statusEl.textContent = `Status: ${status.status} | Battery: ${status.battery}% | Uptime: ${status.uptime}s`;
    trackingActive = status.tracking_active;
    trackingBtn.textContent = trackingActive ? 'Stop Tracking' : 'Start Tracking';
}

function updateLocationUI(location) {
    locationEl.textContent = `Lat: ${location.latitude}, Lng: ${location.longitude}, Acc: ${location.accuracy}m, Speed: ${location.speed}m/s`;
}

function updateRouteUI(route) {
    routeList.innerHTML = '';
    route.forEach((point, idx) => {
        const li = document.createElement('li');
        li.textContent = `${idx + 1}: ${point.lat}, ${point.lng} (${point.timestamp})`;
        routeList.appendChild(li);
    });
}

connectBtn.addEventListener('click', async () => {
    connectBtn.disabled = true;
    const ok = await ble.connect();
    if (ok) {
        statusEl.textContent = 'Verbonden!';
        disconnectBtn.disabled = false;
        connectBtn.disabled = true;
        await refreshStatus();
        await refreshLocation();
    } else {
        statusEl.textContent = 'Verbinding mislukt!';
        connectBtn.disabled = false;
    }
});

disconnectBtn.addEventListener('click', async () => {
    await ble.disconnect();
    statusEl.textContent = 'Niet verbonden';
    disconnectBtn.disabled = true;
    connectBtn.disabled = false;
});

ble.onDisconnectCallback = () => {
    statusEl.textContent = 'Verbinding verbroken';
    disconnectBtn.disabled = true;
    connectBtn.disabled = false;
};

async function refreshStatus() {
    if (!ble.isConnected) return;
    const status = await ble.readStatus();
    if (status) updateStatusUI(status);
}

async function refreshLocation() {
    if (!ble.isConnected) return;
    const location = await ble.readLocation();
    if (location) updateLocationUI(location);
}

trackingBtn.addEventListener('click', async () => {
    if (!ble.isConnected) return;
    if (trackingActive) {
        await ble.sendCommand({ action: 'stop_tracking' });
    } else {
        await ble.sendCommand({ action: 'start_tracking' });
    }
    setTimeout(refreshStatus, 500);
});

routeBtn.addEventListener('click', async () => {
    if (!ble.isConnected) return;
    await ble.sendCommand({ action: 'get_route' });
    setTimeout(async () => {
        const location = await ble.readLocation();
        if (location && location.route) {
            routeHistory = location.route;
            updateRouteUI(routeHistory);
        }
    }, 500);
});

clearRouteBtn.addEventListener('click', async () => {
    if (!ble.isConnected) return;
    await ble.sendCommand({ action: 'clear_route' });
    routeHistory = [];
    updateRouteUI(routeHistory);
});

// Auto-refresh status & location every 5s
setInterval(() => {
    if (ble.isConnected) {
        refreshStatus();
        refreshLocation();
    }
}, 5000);
