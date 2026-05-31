#!/usr/bin/env python3
"""Kalibratie Tool voor TETRA Scanner"""

import sys
import os
import time
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import *


def main():
    print("=" * 55)
    print("  TETRA SCANNER KALIBRATIE TOOL")
    print("  Dit helpt de drempelwaarden instellen")
    print("=" * 55)
    print()

    try:
        from rtlsdr import RtlSdr
    except ImportError:
        print("FOUT: pyrtlsdr niet gevonden!")
        print("Activeer eerst de virtual environment:")
        print("  source /opt/tetra-scanner/venv/bin/activate")
        sys.exit(1)

    try:
        sdr = RtlSdr()
    except Exception as e:
        print(f"FOUT: Kan RTL-SDR niet openen: {e}")
        print("Controleer of de dongle is aangesloten.")
        sys.exit(1)

    sdr.sample_rate = SAMPLE_RATE
    sdr.freq_correction = PPM_CORRECTION
    sdr.gain = 'auto' if GAIN == 'auto' else float(GAIN)

    print("RTL-SDR gevonden en geconfigureerd")
    print(f"  Gain: {sdr.gain}")
    print(f"  Sample rate: {sdr.sample_rate}")
    print()

    print("STAP 1: Ruisvloer meten")
    print("-" * 40)
    print("Zorg dat er GEEN hulpdiensten vlakbij zijn.")
    input("Druk ENTER om te beginnen...")
    print()

    measurements = []
    bandwidth_mhz = SAMPLE_RATE / 1e6
    freq_mhz = FREQ_START_MHZ + (bandwidth_mhz / 2)
    center_freqs = []
    while freq_mhz < FREQ_END_MHZ:
        center_freqs.append(freq_mhz)
        freq_mhz += bandwidth_mhz * 0.75

    print(f"Scan {len(center_freqs)} frequenties...")
    for i, cf in enumerate(center_freqs):
        sdr.center_freq = int(cf * 1e6)
        time.sleep(0.01)
        samples = sdr.read_samples(NUM_SAMPLES)
        power = np.mean(np.abs(samples) ** 2)
        if power > 0:
            power_db = 10 * np.log10(power)
        else:
            power_db = -100
        measurements.append(power_db)

        pct = (i + 1) / len(center_freqs) * 100
        bar = '█' * int(pct / 5) + '░' * (20 - int(pct / 5))
        print(f"\r  [{bar}] {pct:.0f}% - {cf:.3f} MHz: {power_db:.1f} dB", end='')

    print()
    print()

    noise_floor = np.median(measurements)
    noise_std = np.std(measurements)
    noise_min = np.min(measurements)
    noise_max = np.max(measurements)

    print(f"  Ruisvloer (mediaan): {noise_floor:.1f} dB")
    print(f"  Standaarddeviatie:   {noise_std:.1f} dB")
    print(f"  Minimum:             {noise_min:.1f} dB")
    print(f"  Maximum:             {noise_max:.1f} dB")
    print()

    print("STAP 2: Achtergrond masten detecteren")
    print("-" * 40)
    print("Nu gaan we 30 seconden lang continu meten")
    print("om te zien welke signalen er normaal zijn.")
    input("Druk ENTER om te beginnen...")
    print()

    all_peaks = []
    scan_duration = 30
    start_time = time.time()

    while (time.time() - start_time) < scan_duration:
        for cf in center_freqs:
            sdr.center_freq = int(cf * 1e6)
            time.sleep(0.005)
            samples = sdr.read_samples(NUM_SAMPLES)

            fft_data = np.fft.fft(samples)
            fft_mag = np.abs(fft_data) ** 2
            fft_mag[0] = 0
            n = len(fft_mag)
            fft_mag[n//2-2:n//2+3] = 0
            peak = np.max(fft_mag)

            if peak > 0:
                peak_db = 10 * np.log10(peak / n)
                above_noise = peak_db - noise_floor
                all_peaks.append(above_noise)

        elapsed = time.time() - start_time
        print(f"\r  Meten... {elapsed:.0f}/{scan_duration}s", end='')

    print()
    print()

    if all_peaks:
        p50 = np.percentile(all_peaks, 50)
        p75 = np.percentile(all_peaks, 75)
        p90 = np.percentile(all_peaks, 90)
        p95 = np.percentile(all_peaks, 95)
        p99 = np.percentile(all_peaks, 99)
        peak_max = np.max(all_peaks)

        print("  Resultaten (dB boven ruisvloer):")
        print(f"    50e percentiel: {p50:.1f} dB")
        print(f"    75e percentiel: {p75:.1f} dB")
        print(f"    90e percentiel: {p90:.1f} dB")
        print(f"    95e percentiel: {p95:.1f} dB")
        print(f"    99e percentiel: {p99:.1f} dB")
        print(f"    Maximum:        {peak_max:.1f} dB")
        print()

        rec_green = max(p90 + 2, 6.0)
        rec_yellow = max(p95 + 3, rec_green + 6)
        rec_orange = max(p99 + 3, rec_yellow + 8)
        rec_red = max(rec_orange + 10, 30.0)

        print("  AANBEVOLEN DREMPELWAARDEN:")
        print(f"    THRESHOLD_GREEN  = {rec_green:.1f}   (huidige: {THRESHOLD_GREEN})")
        print(f"    THRESHOLD_YELLOW = {rec_yellow:.1f}  (huidige: {THRESHOLD_YELLOW})")
        print(f"    THRESHOLD_ORANGE = {rec_orange:.1f}  (huidige: {THRESHOLD_ORANGE})")
        print(f"    THRESHOLD_RED    = {rec_red:.1f}  (huidige: {THRESHOLD_RED})")
        print()
        print("  Pas deze waarden aan in config.py:")
        print("    nano /opt/tetra-scanner/config.py")
        print()
        print("  Herstart daarna de service:")
        print("    sudo systemctl restart tetra-scanner")

    sdr.close()
    print()
    print("Kalibratie voltooid!")


if __name__ == '__main__':
    main()