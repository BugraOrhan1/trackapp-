import { useState, useCallback } from 'react';
import { bleService } from '../services/ble';
import type { Detection } from '../types';
import { Device } from 'react-native-ble-plx';

export function useBLE() {
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundDevices, setFoundDevices] = useState<Device[]>([]);

  const scanForDevices = useCallback(async () => {
    try {
      setIsScanning(true);
      setError(null);
      setFoundDevices([]);

      await bleService.scanForDevices(
        (device: Device) => {
          setFoundDevices((prev: Device[]) => {
            const exists = prev.find((d: Device) => d.id === device.id);
            if (exists) return prev;
            return [...prev, device];
          });
        },
        10000
      );
    } catch (err: any) {
      setError(err.message || 'Scan fout');
    } finally {
      setIsScanning(false);
    }
  }, []);

  const connect = useCallback(async (deviceId?: string) => {
    try {
      setLoading(true);
      setError(null);

      let targetDeviceId = deviceId;

      if (!targetDeviceId) {
        const discoveredDevices: Device[] = [];
        setIsScanning(true);
        await bleService.scanForDevices(
          (device: Device) => {
            discoveredDevices.push(device);
            setFoundDevices((prev: Device[]) => {
              const exists = prev.find((d: Device) => d.id === device.id);
              if (exists) return prev;
              return [...prev, device];
            });
          },
          10000,
        );
        setIsScanning(false);
        targetDeviceId = discoveredDevices[0]?.id ?? foundDevices[0]?.id;
      }

      if (!targetDeviceId) {
        throw new Error('Geen device gevonden');
      }

      await bleService.connect(targetDeviceId);
      setIsConnected(true);

      await bleService.startNotifications((newDetections: Detection[]) => {
        setDetections(newDetections);
      });
    } catch (err: any) {
      setError(err.message || 'Verbinding mislukt');
      setIsConnected(false);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [foundDevices, scanForDevices]);

  const disconnect = useCallback(async () => {
    try {
      setLoading(true);
      await bleService.disconnect();
      setIsConnected(false);
      setDetections([]);
    } catch (err: any) {
      setError(err.message || 'Disconnect fout');
    } finally {
      setLoading(false);
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!isConnected) {
      throw new Error('Niet verbonden met device');
    }

    try {
      await bleService.startScanner();
    } catch (err: any) {
      setError(err.message || 'Start scanner fout');
      throw err;
    }
  }, [isConnected]);

  const stopScanner = useCallback(async () => {
    if (!isConnected) return;

    try {
      await bleService.stopScanner();
      setDetections([]);
    } catch (err: any) {
      setError(err.message || 'Stop scanner fout');
      throw err;
    }
  }, [isConnected]);

  const readDetections = useCallback(async () => {
    if (!isConnected) {
      throw new Error('Niet verbonden');
    }

    try {
      const data = await bleService.readDetections();
      setDetections(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Read fout');
      throw err;
    }
  }, [isConnected]);

  return {
    isConnected,
    isScanning,
    detections,
    loading,
    error,
    foundDevices,
    connected: isConnected,
    connecting: loading,
    deviceName: foundDevices[0]?.name ?? null,
    scanForDevices,
    connect,
    disconnect,
    startScanner,
    stopScanner,
    readDetections,
    isPremiumRequired: true,
  };
}