#!/usr/bin/env python3
"""
Target Blue Eye Scanner - RTL-SDR 2832U
Scant 380-400 MHz voor hulpdiensten detectie
"""

import time
import threading
import json
import numpy as np
from datetime import datetime
from collections import defaultdict
import logging
import random

try:
    from rtlsdr import RtlSdr
    RTL_AVAILABLE = True
except ImportError:
    RTL_AVAILABLE = False

class TargetBlueEyeScanner:
    SERVICE_BANDS = {
        'police': (380e6, 385e6),
        'ambulance': (385e6, 390e6),
        'fire': (390e6, 395e6),
        'defense': (395e6, 400e6)
    }
    SERVICE_EMOJI = {
        'police': '🚓',
        'ambulance': '🚑',
        'fire': '🚒',
        'defense': '🎖️'
    }
    DEFAULT_THRESHOLD_DB = 12
    DEFAULT_SAMPLE_RATE = 2.048e6
    DEFAULT_FFT_SIZE = 1024
    DEFAULT_GAIN = 40
    DEFAULT_SCAN_STEP = 200e3
    DEFAULT_SCAN_INTERVAL = 2.0
    BASELINE_DURATION = 60

    def __init__(self, callback=None, simulate=False, logger=None):
        self.simulate = simulate or not RTL_AVAILABLE
        self.callback = callback
        self.logger = logger or self._setup_logger()
        self.sdr = None
        self.baseline = defaultdict(lambda: -100)
        self.monitoring = False
        self.monitor_thread = None
        self.status = 'initialized'
        self.detections = []
        self.lock = threading.Lock()
        self._stop_event = threading.Event()
        self.logger.info(f"TargetBlueEyeScanner initialized. Simulate mode: {self.simulate}")

    def _setup_logger(self):
        logger = logging.getLogger('TargetBlueEyeScanner')
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('[%(asctime)s] %(levelname)s: %(message)s')
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        return logger

    def perform_baseline_scan(self, duration=None):
        duration = duration or self.BASELINE_DURATION
        self.logger.info(f"Starting baseline scan for {duration} seconds...")
        baseline = defaultdict(list)
        start = time.time()
        while time.time() - start < duration:
            for freq in self._scan_frequencies():
                spectrum = self.get_power_spectrum(freq)
                if spectrum is not None:
                    baseline[freq].append(np.mean(spectrum))
            time.sleep(0.2)
        for freq in baseline:
            self.baseline[freq] = np.median(baseline[freq])
        self.logger.info(f"Baseline scan complete. Baseline: {dict(self.baseline)}")
        self.status = 'baseline_complete'

    def _scan_frequencies(self):
        freqs = []
        for band in self.SERVICE_BANDS.values():
            f = band[0]
            while f < band[1]:
                freqs.append(f)
                f += self.DEFAULT_SCAN_STEP
        return freqs

    def get_power_spectrum(self, center_freq):
        if self.simulate:
            # Simulate a spectrum with random noise and occasional peaks
            spectrum = np.random.normal(-90, 2, self.DEFAULT_FFT_SIZE)
            if np.random.rand() < 0.05:
                peak_bin = np.random.randint(0, self.DEFAULT_FFT_SIZE)
                spectrum[peak_bin] += np.random.uniform(15, 30)
            return spectrum
        try:
            if self.sdr is None:
                self.sdr = RtlSdr()
                self.sdr.sample_rate = self.DEFAULT_SAMPLE_RATE
                self.sdr.gain = self.DEFAULT_GAIN
            self.sdr.center_freq = center_freq
            samples = self.sdr.read_samples(self.DEFAULT_FFT_SIZE*2)
            spectrum = 20 * np.log10(np.abs(np.fft.fftshift(np.fft.fft(samples, self.DEFAULT_FFT_SIZE))))
            return spectrum
        except Exception as e:
            self.logger.error(f"Error getting power spectrum: {e}")
            return None

    def detect_peaks(self, freq, spectrum, threshold_db=None):
        threshold_db = threshold_db or self.DEFAULT_THRESHOLD_DB
        baseline = self.baseline.get(freq, -100)
        peaks = []
        for i, power in enumerate(spectrum):
            if power > baseline + threshold_db:
                peak_freq = freq + (i - self.DEFAULT_FFT_SIZE//2) * (self.DEFAULT_SAMPLE_RATE/self.DEFAULT_FFT_SIZE)
                peaks.append((peak_freq, power))
        return peaks

    def identify_service(self, freq):
        for service, (fmin, fmax) in self.SERVICE_BANDS.items():
            if fmin <= freq < fmax:
                return service
        return 'unknown'

    def estimate_distance(self, rssi, freq):
        # Free space path loss (FSPL) formula
        tx_power = 30  # dBm, assumed
        fspl = tx_power - rssi
        wavelength = 3e8 / freq
        distance = 10 ** ((fspl - 32.44 - 20 * np.log10(freq/1e6)) / 20)
        return max(0.01, round(distance, 2))

    def start_continuous_monitoring(self, interval=None):
        if self.monitoring:
            self.logger.warning("Monitoring already running.")
            return
        self.monitoring = True
        self._stop_event.clear()
        self.monitor_thread = threading.Thread(target=self._monitor_loop, args=(interval,), daemon=True)
        self.monitor_thread.start()
        self.logger.info("Continuous monitoring started.")
        self.status = 'monitoring'

    def stop_continuous_monitoring(self):
        if not self.monitoring:
            self.logger.warning("Monitoring not running.")
            return
        self._stop_event.set()
        self.monitor_thread.join()
        self.monitoring = False
        self.status = 'stopped'
        self.logger.info("Continuous monitoring stopped.")

    def _monitor_loop(self, interval):
        interval = interval or self.DEFAULT_SCAN_INTERVAL
        while not self._stop_event.is_set():
            detections = []
            for freq in self._scan_frequencies():
                spectrum = self.get_power_spectrum(freq)
                if spectrum is None:
                    continue
                peaks = self.detect_peaks(freq, spectrum)
                for peak_freq, rssi in peaks:
                    service = self.identify_service(peak_freq)
                    distance = self.estimate_distance(rssi, peak_freq)
                    # Single dongle cannot estimate true bearing; keep pseudo-bearing for UI direction hints.
                    bearing_deg = random.randint(0, 359)
                    detection = {
                        'timestamp': datetime.utcnow().isoformat() + 'Z',
                        'frequency': round(peak_freq, 2),
                        'frequency_mhz': round(peak_freq / 1e6, 4),
                        'rssi': round(rssi, 2),
                        'service': service,
                        'distance_km': distance,
                        'bearing_deg': bearing_deg,
                        'emoji': self.SERVICE_EMOJI.get(service, '?')
                    }
                    detections.append(detection)
            if detections:
                with self.lock:
                    self.detections = detections
                self.logger.info(f"Detections: {json.dumps(detections, indent=2)}")
                if self.callback:
                    try:
                        self.callback(detections)
                    except Exception as cb_e:
                        self.logger.error(f"Callback error: {cb_e}")
            time.sleep(interval)

    def get_latest_detections(self):
        with self.lock:
            return list(self.detections)

    def get_status(self):
        return {
            'status': self.status,
            'simulate': self.simulate,
            'baseline': dict(self.baseline),
            'monitoring': self.monitoring
        }

    def shutdown(self):
        self.stop_continuous_monitoring()
        if self.sdr:
            try:
                self.sdr.close()
            except Exception:
                pass
        self.logger.info("Scanner shutdown complete.")

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Target Blue Eye RTL-SDR Scanner')
    parser.add_argument('--simulate', action='store_true', help='Run in simulate mode (no RTL-SDR required)')
    parser.add_argument('--baseline', action='store_true', help='Perform baseline scan only')
    parser.add_argument('--monitor', action='store_true', help='Start continuous monitoring')
    args = parser.parse_args()

    scanner = TargetBlueEyeScanner(simulate=args.simulate)
    try:
        scanner.perform_baseline_scan()
        if args.baseline:
            print(json.dumps(scanner.get_status(), indent=2))
        if args.monitor:
            scanner.start_continuous_monitoring()
            while True:
                time.sleep(5)
                print(json.dumps(scanner.get_latest_detections(), indent=2))
    except KeyboardInterrupt:
        print("\nInterrupted by user.")
    finally:
        scanner.shutdown()
