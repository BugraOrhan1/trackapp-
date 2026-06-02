#!/usr/bin/env python3
"""Signal Analyzer Module"""

import numpy as np
import time
import logging
from collections import deque

from config import (
    FREQ_START_MHZ, FREQ_END_MHZ, FREQ_STEP_MHZ,
    SAMPLE_RATE, NUM_SAMPLES, GAIN, PPM_CORRECTION,
    THRESHOLD_GREEN, THRESHOLD_YELLOW, THRESHOLD_ORANGE, THRESHOLD_RED,
    NOISE_FLOOR_UPDATE_INTERVAL, NOISE_FLOOR_SAMPLES, NOISE_FLOOR_ALPHA,
    AVERAGING_COUNT, PRIORITY_FREQUENCIES_MHZ
)

logger = logging.getLogger('tetra-scanner.analyzer')


class SignalAnalyzer:
    def __init__(self):
        self.sdr = None
        self.noise_floor_db = -50.0
        self.noise_floor_history = deque(maxlen=NOISE_FLOOR_SAMPLES)
        self.last_noise_update = 0
        self.signal_history = deque(maxlen=AVERAGING_COUNT)
        self.peak_frequency = 0
        self.peak_power_db = -100
        self.is_initialized = False
        self.scan_count = 0
        self.frequencies_hz = self._build_frequency_list()
        logger.info("Frequentielijst: %d frequenties van %.3f tot %.3f MHz",
                    len(self.frequencies_hz), FREQ_START_MHZ, FREQ_END_MHZ)

    def _build_frequency_list(self):
        freqs = []
        freq = FREQ_START_MHZ
        while freq <= FREQ_END_MHZ:
            freqs.append(int(freq * 1e6))
            freq += FREQ_STEP_MHZ
            freq = round(freq, 6)

        for pf in PRIORITY_FREQUENCIES_MHZ:
            pf_hz = int(pf * 1e6)
            if pf_hz not in freqs:
                freqs.append(pf_hz)

        freqs.sort()
        return freqs

    def initialize(self):
        try:
            from rtlsdr import RtlSdr

            self.sdr = RtlSdr()
            self.sdr.sample_rate = SAMPLE_RATE
            if PPM_CORRECTION != 0:
                if PPM_CORRECTION != 0:
                    self.sdr.freq_correction = PPM_CORRECTION
            self.sdr.gain = 'auto' if GAIN == 'auto' else float(GAIN)
            self.sdr.center_freq = self.frequencies_hz[0]
            self.is_initialized = True
            logger.info("RTL-SDR geïnitialiseerd:")
            logger.info("  Sample rate: %d Hz", SAMPLE_RATE)
            logger.info("  Gain: %s", GAIN)
            logger.info("  PPM correctie: %d", PPM_CORRECTION)
            self._calibrate_noise_floor()
            return True
        except ImportError:
            logger.error("pyrtlsdr module niet gevonden!")
            return False
        except Exception as e:
            logger.error("RTL-SDR initialisatie mislukt: %s", e)
            return False

    def _calibrate_noise_floor(self):
        logger.info("Ruisvloer kalibreren...")
        measurements = []
        sample_freqs = self.frequencies_hz[::10]
        if len(sample_freqs) < 10:
            sample_freqs = self.frequencies_hz

        for freq_hz in sample_freqs[:30]:
            try:
                self.sdr.center_freq = freq_hz
                time.sleep(0.01)
                samples = self.sdr.read_samples(NUM_SAMPLES)
                power = self._calculate_power_db(samples)
                measurements.append(power)
            except Exception as e:
                logger.debug("Kalibratie meting mislukt op %d Hz: %s", freq_hz, e)
                continue

        if measurements:
            self.noise_floor_db = float(np.median(measurements))
            for m in measurements:
                self.noise_floor_history.append(m)
            logger.info("Ruisvloer gekalibreerd: %.1f dB", self.noise_floor_db)
            logger.info("  Min: %.1f dB, Max: %.1f dB", min(measurements), max(measurements))
        else:
            logger.warning("Kon ruisvloer niet kalibreren, gebruik standaard: %.1f dB", self.noise_floor_db)

        self.last_noise_update = time.time()

    def _calculate_power_db(self, samples):
        if len(samples) == 0:
            return -100.0

        power = np.mean(np.abs(samples) ** 2)
        if power > 0:
            power_db = 10 * np.log10(power)
        else:
            power_db = -100.0
        return float(power_db)

    def _calculate_peak_power_db(self, samples):
        if len(samples) == 0:
            return -100.0

        try:
            fft_data = np.fft.fft(samples)
            fft_magnitude = np.abs(fft_data) ** 2
            fft_magnitude[0] = 0
            n = len(fft_magnitude)
            center = n // 2
            fft_magnitude[center-2:center+3] = 0
            peak_power = np.max(fft_magnitude)
            if peak_power > 0:
                return float(10 * np.log10(peak_power / n))
            else:
                return -100.0
        except Exception:
            return self._calculate_power_db(samples)

    def perform_scan(self):
        if not self.is_initialized or self.sdr is None:
            logger.error("SDR niet geïnitialiseerd!")
            return None

        try:
            all_powers = []
            active_freqs = []
            max_power = -100.0
            max_freq = 0

            bandwidth_mhz = SAMPLE_RATE / 1e6
            center_freqs = []
            freq_mhz = FREQ_START_MHZ + (bandwidth_mhz / 2)
            while freq_mhz < FREQ_END_MHZ:
                center_freqs.append(int(freq_mhz * 1e6))
                freq_mhz += bandwidth_mhz * 0.75
                freq_mhz = round(freq_mhz, 6)

            for center_freq_hz in center_freqs:
                try:
                    self.sdr.center_freq = center_freq_hz
                    time.sleep(0.005)
                    samples = self.sdr.read_samples(NUM_SAMPLES)
                    avg_power = self._calculate_power_db(samples)
                    all_powers.append(avg_power)
                    peak_power = self._calculate_peak_power_db(samples)
                    if peak_power > max_power:
                        max_power = peak_power
                        max_freq = center_freq_hz

                    above_noise = peak_power - self.noise_floor_db
                    if above_noise > THRESHOLD_GREEN:
                        active_freqs.append({
                            'freq_mhz': center_freq_hz / 1e6,
                            'power_db': peak_power,
                            'above_noise_db': above_noise
                        })
                except Exception as e:
                    logger.debug("Scan fout op %.3f MHz: %s", center_freq_hz / 1e6, e)
                    continue

            self._update_noise_floor(all_powers)
            above_noise = max_power - self.noise_floor_db
            level = self._power_to_level(above_noise)
            self.signal_history.append(above_noise)
            avg_above_noise = np.mean(list(self.signal_history))
            smooth_level = self._power_to_level(avg_above_noise)

            self.peak_frequency = max_freq
            self.peak_power_db = max_power
            self.scan_count += 1

            return {
                'peak_freq_mhz': max_freq / 1e6,
                'peak_power_db': max_power,
                'above_noise_db': above_noise,
                'avg_above_noise_db': avg_above_noise,
                'noise_floor_db': self.noise_floor_db,
                'level': smooth_level,
                'instant_level': level,
                'active_frequencies': sorted(active_freqs, key=lambda x: x['power_db'], reverse=True)[:10],
                'scan_count': self.scan_count,
                'num_center_freqs': len(center_freqs)
            }
        except Exception as e:
            logger.error("Scan mislukt: %s", e)
            return None

    def _power_to_level(self, above_noise_db):
        if above_noise_db >= THRESHOLD_RED:
            return 4
        elif above_noise_db >= THRESHOLD_ORANGE:
            return 3
        elif above_noise_db >= THRESHOLD_YELLOW:
            return 2
        elif above_noise_db >= THRESHOLD_GREEN:
            return 1
        else:
            return 0

    def _update_noise_floor(self, powers):
        now = time.time()
        if not powers:
            return

        noise_estimate = float(np.percentile(powers, 25))
        self.noise_floor_history.append(noise_estimate)

        if (now - self.last_noise_update) >= NOISE_FLOOR_UPDATE_INTERVAL:
            if len(self.noise_floor_history) >= 10:
                new_noise_floor = float(np.median(list(self.noise_floor_history)))
                self.noise_floor_db = (
                    NOISE_FLOOR_ALPHA * new_noise_floor +
                    (1 - NOISE_FLOOR_ALPHA) * self.noise_floor_db
                )
                logger.info("Ruisvloer bijgewerkt: %.1f dB", self.noise_floor_db)

            self.last_noise_update = now

    def quick_scan_frequency(self, freq_hz):
        if not self.is_initialized or self.sdr is None:
            return None

        try:
            self.sdr.center_freq = freq_hz
            time.sleep(0.005)
            samples = self.sdr.read_samples(NUM_SAMPLES // 4)
            power = self._calculate_power_db(samples)
            above_noise = power - self.noise_floor_db
            return {
                'freq_mhz': freq_hz / 1e6,
                'power_db': power,
                'above_noise_db': above_noise,
                'level': self._power_to_level(above_noise)
            }
        except Exception as e:
            logger.debug("Quick scan mislukt op %.3f MHz: %s", freq_hz / 1e6, e)
            return None

    def close(self):
        if self.sdr is not None:
            try:
                self.sdr.close()
                logger.info("RTL-SDR gesloten")
            except Exception as e:
                logger.error("RTL-SDR sluiten mislukt: %s", e)
            finally:
                self.sdr = None
                self.is_initialized = False