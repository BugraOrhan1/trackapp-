import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { encode as btoa, decode as atob } from 'base-64';
import { BLE_CONFIG } from '../config/constants';
import type { Detection, EmergencyServiceType } from '../types';

class BLEService {
  private manager: BleManager;
  private device: Device | null = null;
  private detectionsCharacteristic: Characteristic | null = null;
  private commandCharacteristic: Characteristic | null = null;
  private statusCharacteristic: Characteristic | null = null;

  constructor() {
    this.manager = new BleManager();
  }

  /**
   * Scan voor Raspberry Pi devices
   */
  async scanForDevices(
    onDeviceFound: (device: Device) => void,
    timeoutMs: number = 10000
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.manager.stopDeviceScan();
        reject(new Error('Scan timeout'));
      }, timeoutMs);

      this.manager.startDeviceScan(
        [BLE_CONFIG.SERVICE_UUID],
        null,
        (error: Error | null, device: Device | null) => {
          if (error) {
            clearTimeout(timeout);
            this.manager.stopDeviceScan();
            reject(error);
            return;
          }

          if (device?.name === BLE_CONFIG.DEVICE_NAME) {
            onDeviceFound(device);
          }
        }
      );
    });
  }

  /**
   * Verbind met device
   */
  async connect(deviceId: string): Promise<void> {
    try {
      this.manager.stopDeviceScan();

      // Connect
      this.device = await this.manager.connectToDevice(deviceId);

      // Discover services en characteristics
      await this.device.discoverAllServicesAndCharacteristics();

      // Haal characteristics op
      const characteristics = await this.device.characteristicsForService(
        BLE_CONFIG.SERVICE_UUID
      );

      this.detectionsCharacteristic = characteristics.find(
        (c: Characteristic) => c.uuid.toLowerCase() === BLE_CONFIG.DETECTIONS_CHAR_UUID.toLowerCase()
      ) || null;

      this.commandCharacteristic = characteristics.find(
        (c: Characteristic) => c.uuid.toLowerCase() === BLE_CONFIG.COMMAND_CHAR_UUID.toLowerCase()
      ) || null;

      this.statusCharacteristic = characteristics.find(
        (c: Characteristic) => c.uuid.toLowerCase() === BLE_CONFIG.STATUS_CHAR_UUID.toLowerCase()
      ) || null;

      console.log('✅ BLE verbonden');
    } catch (error) {
      console.error('❌ BLE connect fout:', error);
      throw error;
    }
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    if (this.device) {
      await this.manager.cancelDeviceConnection(this.device.id);
      this.device = null;
      this.detectionsCharacteristic = null;
      this.commandCharacteristic = null;
      this.statusCharacteristic = null;
    }
  }

  /**
   * Check of verbonden
   */
  isConnected(): boolean {
    return this.device !== null;
  }

  /**
   * Lees detecties
   */
  async readDetections(): Promise<Detection[]> {
    if (!this.detectionsCharacteristic) {
      throw new Error('Niet verbonden');
    }

    const characteristic = await this.detectionsCharacteristic.read();
    if (!characteristic.value) return [];

    const jsonStr = atob(characteristic.value);
    const detections = JSON.parse(jsonStr);

    return Array.isArray(detections) ? detections : [];
  }

  /**
   * Start notifications voor real-time detecties
   */
  async startNotifications(callback: (detections: Detection[]) => void): Promise<void> {
    if (!this.detectionsCharacteristic) {
      throw new Error('Niet verbonden');
    }

    this.detectionsCharacteristic.monitor((error: Error | null, characteristic: Characteristic | null) => {
      if (error) {
        console.error('Notification error:', error);
        return;
      }

      if (characteristic?.value) {
        try {
          const jsonStr = atob(characteristic.value);
          const detections = JSON.parse(jsonStr);
          callback(Array.isArray(detections) ? detections : []);
        } catch (err) {
          console.error('Parse error:', err);
        }
      }
    });
  }

  /**
   * Stuur commando naar Raspberry Pi
   */
  async sendCommand(action: string): Promise<void> {
    if (!this.commandCharacteristic) {
      throw new Error('Niet verbonden');
    }

    const command = JSON.stringify({ action });
    const base64 = btoa(command);

    await this.commandCharacteristic.writeWithResponse(base64);
  }

  /**
   * Start scanner
   */
  async startScanner(): Promise<void> {
    await this.sendCommand('start_scan');
  }

  /**
   * Stop scanner
   */
  async stopScanner(): Promise<void> {
    await this.sendCommand('stop_scan');
  }

  /**
   * Lees status
   */
  async readStatus(): Promise<any> {
    if (!this.statusCharacteristic) {
      throw new Error('Niet verbonden');
    }

    const characteristic = await this.statusCharacteristic.read();
    if (!characteristic.value) return null;

    const jsonStr = atob(characteristic.value);
    return JSON.parse(jsonStr);
  }
}

export const bleService = new BLEService();
