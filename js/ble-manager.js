// TrackApp BLE Manager
// Auteur: BugraOrhan1
// Versie: 1.0

class BLEManager {
    constructor() {
        this.device = null;
        this.server = null;
        this.service = null;
        this.locationChar = null;
        this.commandChar = null;
        this.statusChar = null;
        this.isConnected = false;

        // UUIDs moeten overeenkomen met de server
        this.SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
        this.LOCATION_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
        this.COMMAND_CHAR_UUID = "cba1d466-344c-4be3-ab3f-189f80dd7518";
        this.STATUS_CHAR_UUID = "d4e1e2f3-4a5b-6c7d-8e9f-0a1b2c3d4e5f";
    }

    async connect() {
        try {
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: "TrackApp" }],
                optionalServices: [this.SERVICE_UUID]
            });
            this.device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));
            this.server = await this.device.gatt.connect();
            this.service = await this.server.getPrimaryService(this.SERVICE_UUID);
            this.locationChar = await this.service.getCharacteristic(this.LOCATION_CHAR_UUID);
            this.commandChar = await this.service.getCharacteristic(this.COMMAND_CHAR_UUID);
            this.statusChar = await this.service.getCharacteristic(this.STATUS_CHAR_UUID);
            this.isConnected = true;
            return true;
        } catch (err) {
            console.error("BLE connect error:", err);
            this.isConnected = false;
            return false;
        }
    }

    async disconnect() {
        if (this.device && this.device.gatt.connected) {
            await this.device.gatt.disconnect();
        }
        this.isConnected = false;
    }

    onDisconnected() {
        this.isConnected = false;
        if (typeof this.onDisconnectCallback === 'function') {
            this.onDisconnectCallback();
        }
    }

    async readLocation() {
        if (!this.locationChar) return null;
        const value = await this.locationChar.readValue();
        const decoder = new TextDecoder('utf-8');
        return JSON.parse(decoder.decode(value));
    }

    async readStatus() {
        if (!this.statusChar) return null;
        const value = await this.statusChar.readValue();
        const decoder = new TextDecoder('utf-8');
        return JSON.parse(decoder.decode(value));
    }

    async sendCommand(commandObj) {
        if (!this.commandChar) return false;
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(commandObj));
        await this.commandChar.writeValue(data);
        return true;
    }
}

window.BLEManager = BLEManager;
