#!/usr/bin/env python3
"""
RTL-SDR 2832U Scanner voor TrackApp
Scant 380-400 MHz voor proximity detection
"""

import time
import threading

try:
    import numpy as np
    from rtlsdr import RtlSdr
    RTL_SDR_AVAILABLE = True
except ImportError:
    RTL_SDR_AVAILABLE = False
    print("⚠️  pyrtlsdr niet geïnstalleerd - gebruik simulate mode")

class RTLScanner:
    def __init__(self, callback=None):
        self.sdr = None
        self.is_scanning = False
        self.callback = callback
        self.simulate_mode = not RTL_SDR_AVAILABLE
        self.freq_start = 380e6
        self.freq_end = 400e6
        self.freq_step = 100e3
        self.threshold_close = -40
        self.threshold_near = -60
        self.threshold_far = -80
        self.current_proximity = "unknown"
        self.current_signal_strength = -100
        self.peak_frequency = 0
        if self.simulate_mode:
            print("🔧 RTL Scanner in SIMULATE mode")
        else:
            print("🔧 RTL Scanner geïnitialiseerd")

    def initialize_sdr(self):
        if self.simulate_mode:
            print("✅ RTL-SDR (simulated)")
            return True
        try:
            self.sdr = RtlSdr()
            self.sdr.sample_rate = 2.048e6
            self.sdr.gain = 'auto'
            print(f"✅ RTL-SDR OK ({self.sdr.sample_rate/1e6} MHz)")
            return True
        except Exception as e:
            print(f"❌ RTL-SDR init fout: {e}")
            self.simulate_mode = True
            return False

    def scan_frequency_range(self):
        if self.simulate_mode:
            return self._simulate_scan()
        if not self.sdr:
            return None, None
        max_power = -1000
        peak_freq = 0
        current_freq = self.freq_start
        while current_freq <= self.freq_end:
            try:
                self.sdr.center_freq = current_freq
                samples = self.sdr.read_samples(256 * 1024)
                power = self._calculate_power(samples)
                if power > max_power:
                    max_power = power
                    peak_freq = current_freq
                current_freq += self.freq_step
            except:
                current_freq += self.freq_step
                continue
        return max_power, peak_freq

    def _simulate_scan(self):
        import random
        signal_strength = random.uniform(-85, -35)
        peak_freq = random.uniform(self.freq_start, self.freq_end)
        time.sleep(0.5)
        return signal_strength, peak_freq

    def _calculate_power(self, samples):
        if not RTL_SDR_AVAILABLE:
            return -100
        fft = np.fft.fft(samples)
        power_spectrum = np.abs(fft) ** 2
        avg_power = np.mean(power_spectrum)
        if avg_power > 0:
            return 10 * np.log10(avg_power)
        return -100

    def determine_proximity(self, signal_strength):
        if signal_strength >= self.threshold_close:
            return "close", "red"
        elif signal_strength >= self.threshold_near:
            return "near", "yellow"
        elif signal_strength >= self.threshold_far:
            return "far", "green"
        else:
            return "unknown", "gray"

    def calculate_circle_radius(self, proximity):
        radius_map = {
            "close": 10,
            "near": 50,
            "far": 200,
            "unknown": 500
        }
        return radius_map.get(proximity, 500)

    def start_scanning(self):
        if self.is_scanning:
            return False
        if not self.initialize_sdr():
            return False
        self.is_scanning = True
        thread = threading.Thread(target=self._scan_loop, daemon=True)
        thread.start()
        mode = "SIMULATE" if self.simulate_mode else "REAL"
        print(f"🔄 Scanner gestart ({mode} mode)")
        return True

    def _scan_loop(self):
        print("📡 Scan loop actief...")
        while self.is_scanning:
            try:
                signal_strength, peak_freq = self.scan_frequency_range()
                if signal_strength is not None:
                    self.current_signal_strength = signal_strength
                    self.peak_frequency = peak_freq
                    proximity, color = self.determine_proximity(signal_strength)
                    if proximity != self.current_proximity:
                        self.current_proximity = proximity
                        radius = self.calculate_circle_radius(proximity)
                        print(f"\n🎯 PROXIMITY UPDATE:")
                        print(f"   ├─ {proximity.upper()} ({color})")
                        print(f"   ├─ {signal_strength:.1f} dBm")
                        print(f"   ├─ {peak_freq/1e6:.2f} MHz")
                        print(f"   └─ {radius}m radius")
                        if self.callback:
                            self.callback({
                                "proximity": proximity,
                                "color": color,
                                "signal_strength": signal_strength,
                                "frequency": peak_freq,
                                "radius": radius
                            })
                time.sleep(2)
            except Exception as e:
                print(f"❌ Scan loop fout: {e}")
                time.sleep(5)

    def stop_scanning(self):
        self.is_scanning = False
        if self.sdr:
            self.sdr.close()
            self.sdr = None
        print("⏹️  Scanner gestopt")

    def get_status(self):
        return {
            "is_scanning": self.is_scanning,
            "proximity": self.current_proximity,
            "signal_strength": self.current_signal_strength,
            "frequency": self.peak_frequency,
            "radius": self.calculate_circle_radius(self.current_proximity),
            "simulate_mode": self.simulate_mode
        }

if __name__ == "__main__":
    def test_cb(data):
        print(f"📢 Callback: {data}")
    scanner = RTLScanner(callback=test_cb)
    scanner.start_scanning()
    try:
        print("\n💡 Test mode... CTRL+C = stop\n")
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n")
        scanner.stop_scanning()
        print("👋 Test gestopt")
