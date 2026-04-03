class BLEManager {
    constructor() {
        this.device = null;
        this.server = null;
        this.service = null;
        this.detectionsChar = null;
        this.commandChar = null;
        this.statusChar = null;

        this.SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
        this.DETECTIONS_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
        this.COMMAND_UUID = "cba1d466-344c-4be3-ab3f-189f80dd7518";
        this.STATUS_UUID = "d4e1e2f3-4a5b-6c7d-8e9f-0a1b2c3d4e5f";

        this.onDetectionsUpdate = null;
        this.onConnectionChange = null;
        this.onError = null;

        this.mockMode = new URLSearchParams(window.location.search).get("mock") === "1";
        this._mockConnected = false;
        this._mockTimer = null;
    }

    async connect() {
        if (this.mockMode) {
            this._mockConnected = true;
            if (this.onConnectionChange) this.onConnectionChange(true);
            this._startMockStream();
            return true;
        }

        try {
            if (!navigator.bluetooth) {
                throw new Error("Web Bluetooth wordt niet ondersteund in deze browser.");
            }

            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: "TrackApp" }],
                optionalServices: [this.SERVICE_UUID],
            });

            this.device.addEventListener("gattserverdisconnected", () => {
                if (this.onConnectionChange) this.onConnectionChange(false);
            });

            this.server = await this.device.gatt.connect();
            this.service = await this.server.getPrimaryService(this.SERVICE_UUID);

            this.detectionsChar = await this.service.getCharacteristic(this.DETECTIONS_UUID);
            this.commandChar = await this.service.getCharacteristic(this.COMMAND_UUID);
            this.statusChar = await this.service.getCharacteristic(this.STATUS_UUID);

            this.detectionsChar.addEventListener("characteristicvaluechanged", (event) => {
                try {
                    const payload = this._decode(event.target.value);
                    if (this.onDetectionsUpdate) this.onDetectionsUpdate(payload);
                } catch (err) {
                    console.error("[BLE] Notify parse error", err);
                }
            });
            await this.detectionsChar.startNotifications();

            if (this.onConnectionChange) this.onConnectionChange(true);
            return true;
        } catch (error) {
            console.error("[BLE] connect error", error);
            if (this.onError) this.onError(error);
            return false;
        }
    }

    async readDetections() {
        if (this.mockMode) {
            return this._mockPayload();
        }
        if (!this.detectionsChar) return null;
        try {
            const value = await this.detectionsChar.readValue();
            return this._decode(value);
        } catch (error) {
            console.error("[BLE] readDetections error", error);
            if (this.onError) this.onError(error);
            return null;
        }
    }

    async readStatus() {
        if (this.mockMode) {
            return {
                device: "TrackApp-RPI-MOCK",
                status: "monitoring",
                simulate: true,
                monitoring: this._mockConnected,
            };
        }
        if (!this.statusChar) return null;
        try {
            const value = await this.statusChar.readValue();
            return this._decode(value);
        } catch (error) {
            console.error("[BLE] readStatus error", error);
            if (this.onError) this.onError(error);
            return null;
        }
    }

    async sendCommand(cmdObj) {
        if (this.mockMode) {
            if (cmdObj && cmdObj.action === "stop_scan") {
                this._stopMockStream();
            }
            if (cmdObj && (cmdObj.action === "start_scan" || cmdObj.action === "baseline")) {
                this._startMockStream();
            }
            return true;
        }
        if (!this.commandChar) return false;
        try {
            const bytes = new TextEncoder().encode(JSON.stringify(cmdObj));
            await this.commandChar.writeValue(bytes);
            return true;
        } catch (error) {
            console.error("[BLE] sendCommand error", error);
            if (this.onError) this.onError(error);
            return false;
        }
    }

    async startScanner() {
        return this.sendCommand({ action: "start_scan" });
    }

    async stopScanner() {
        return this.sendCommand({ action: "stop_scan" });
    }

    async baselineScan() {
        return this.sendCommand({ action: "baseline" });
    }

    disconnect() {
        if (this.mockMode) {
            this._mockConnected = false;
            this._stopMockStream();
            if (this.onConnectionChange) this.onConnectionChange(false);
            return;
        }
        if (this.device && this.device.gatt && this.device.gatt.connected) {
            this.device.gatt.disconnect();
        }
    }

    isConnected() {
        if (this.mockMode) {
            return this._mockConnected;
        }
        return !!(this.device && this.device.gatt && this.device.gatt.connected);
    }

    _decode(dataView) {
        const text = new TextDecoder("utf-8").decode(dataView);
        return JSON.parse(text || "{}");
    }

    _startMockStream() {
        this._stopMockStream();
        this._mockTimer = setInterval(() => {
            const payload = this._mockPayload();
            if (this.onDetectionsUpdate) this.onDetectionsUpdate(payload);
        }, 2500);
    }

    _stopMockStream() {
        if (this._mockTimer) {
            clearInterval(this._mockTimer);
            this._mockTimer = null;
        }
    }

    _mockPayload() {
        const services = [
            { service: "police", emoji: "🚓", baseFreq: 382.4 },
            { service: "ambulance", emoji: "🚑", baseFreq: 387.2 },
            { service: "fire", emoji: "🚒", baseFreq: 392.8 },
            { service: "defense", emoji: "🎖️", baseFreq: 397.1 },
        ];
        const pick = services[Math.floor(Math.random() * services.length)];
        const distance = Math.max(0.2, (Math.random() * 18));
        const rssi = -35 - Math.random() * 50;
        return {
            device: "TrackApp-RPI-MOCK",
            scan_active: true,
            baseline_complete: true,
            detections: [
                {
                    timestamp: new Date().toISOString(),
                    frequency: (pick.baseFreq * 1e6),
                    frequency_mhz: pick.baseFreq + (Math.random() - 0.5) * 0.2,
                    rssi,
                    service: pick.service,
                    distance_km: Number(distance.toFixed(2)),
                    bearing_deg: Math.floor(Math.random() * 360),
                    emoji: pick.emoji,
                },
            ],
        };
    }
}

window.BLEManager = BLEManager;
