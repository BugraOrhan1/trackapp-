import { BleManager, Device, Subscription } from 'react-native-ble-plx';
import { Platform } from 'react-native';
import { BLE_CONFIG } from '../config/ble';
import type { Detection } from '../types';

export interface BLEConnectionState {
  connected: boolean;
  deviceName?: string;
  error?: string;
}

export class TrackAppBleService {
  private manager: BleManager;
  private device: Device | null = null;
  private notificationSubscription: Subscription | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 3;

  constructor() {
    this.manager = new BleManager();
  }

  async scanForDevices(): Promise<Device[]> {
    const devices = await this.manager.devices([]);
    return devices.filter((device: Device) => device.name?.startsWith(BLE_CONFIG.DEVICE_NAME_PREFIX) ?? false);
  }

  async connect(deviceId?: string): Promise<BLEConnectionState> {
    try {
      if (Platform.OS === 'web') {
        return { connected: false, error: 'BLE is not available on web in this project.' };
      }

      const device = deviceId ? await this.manager.connectToDevice(deviceId) : await this.autoConnect();
      await device.discoverAllServicesAndCharacteristics();
      this.device = device;
      this.reconnectAttempts = 0;
      await this.subscribeToDetections();
      return { connected: true, deviceName: device.name ?? device.localName ?? 'TrackApp-RPI' };
    } catch (error) {
      return { connected: false, error: error instanceof Error ? error.message : 'BLE connect failed' };
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.notificationSubscription?.remove();
      this.notificationSubscription = null;
      if (this.device) {
        await this.device.cancelConnection();
      }
    } finally {
      this.device = null;
    }
  }

  async readDetections(): Promise<Detection[] | null> {
    if (!this.device) return null;
    const characteristic = await this.device.readCharacteristicForService(BLE_CONFIG.SERVICE_UUID, BLE_CONFIG.DETECTIONS_UUID);
    return this.parseDetections(characteristic.value);
  }

  async readStatus(): Promise<Record<string, unknown> | null> {
    if (!this.device) return null;
    const characteristic = await this.device.readCharacteristicForService(BLE_CONFIG.SERVICE_UUID, BLE_CONFIG.STATUS_UUID);
    return this.parseJson(characteristic.value);
  }

  async sendCommand(action: 'start_scan' | 'stop_scan'): Promise<boolean> {
    if (!this.device) return false;
    const payload = toBase64(JSON.stringify({ action }));
    await this.device.writeCharacteristicWithResponseForService(BLE_CONFIG.SERVICE_UUID, BLE_CONFIG.COMMAND_UUID, payload);
    return true;
  }

  async startScanner(): Promise<boolean> {
    return this.sendCommand('start_scan');
  }

  async stopScanner(): Promise<boolean> {
    return this.sendCommand('stop_scan');
  }

  async autoReconnect(): Promise<BLEConnectionState> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return { connected: false, error: 'Max reconnect attempts reached' };
    }
    this.reconnectAttempts += 1;
    if (this.device?.id) {
      return this.connect(this.device.id);
    }
    return this.connect();
  }

  isConnected(): boolean {
    return Boolean(this.device);
  }

  private async autoConnect(): Promise<Device> {
    const devices = await this.manager.devices([]);
    const target = devices.find((device: Device) => device.name?.startsWith(BLE_CONFIG.DEVICE_NAME_PREFIX));
    if (!target) {
      throw new Error('No TrackApp-RPI device found');
    }
    return this.manager.connectToDevice(target.id);
  }

  private async subscribeToDetections(): Promise<void> {
    if (!this.device) return;
    this.notificationSubscription?.remove();
    this.notificationSubscription = this.device.monitorCharacteristicForService(
      BLE_CONFIG.SERVICE_UUID,
      BLE_CONFIG.DETECTIONS_UUID,
      (_error: Error | null, characteristic: { value?: string | null } | null) => {
        if (characteristic?.value) {
          this.parseDetections(characteristic.value);
        }
      },
    );
  }

  private parseDetections(encoded?: string | null): Detection[] | null {
    const payload = this.parseJson(encoded);
    if (!payload || !Array.isArray((payload as { detections?: unknown[] }).detections)) {
      return null;
    }
    return (payload as { detections: Detection[] }).detections;
  }

  private parseJson(encoded?: string | null): Record<string, unknown> | null {
    if (!encoded) return null;
    try {
      return JSON.parse(fromBase64(encoded));
    } catch {
      return null;
    }
  }
}

function toBase64(value: string): string {
  return globalThis.btoa(unescape(encodeURIComponent(value)));
}

function fromBase64(value: string): string {
  return decodeURIComponent(escape(globalThis.atob(value)));
}

export const bleService = new TrackAppBleService();
