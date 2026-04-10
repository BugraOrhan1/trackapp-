#!/usr/bin/env python3
"""Target Blue Eye frequency scanner for TrackApp.

Scans 380-400 MHz with an RTL-SDR dongle, extracts strong peaks, and writes
simple detection records to detections.json so the BLE server can expose them.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable

import numpy as np

try:
    from rtlsdr import RtlSdr
except ImportError:  # pragma: no cover - hardware dependency
    RtlSdr = None


BASE_DIR = Path(__file__).resolve().parent
DETECTIONS_FILE = BASE_DIR / "detections.json"
DEFAULT_START_MHZ = 380.0
DEFAULT_STOP_MHZ = 400.0
DEFAULT_STEP_MHZ = 0.2


@dataclass
class Detection:
    frequency_mhz: float
    power_db: float
    timestamp: float
    label: str


LABELS = {
    0: "unknown",
    1: "police",
    2: "ambulance",
    3: "fire",
    4: "defense",
}


def generate_frequencies(start_mhz: float, stop_mhz: float, step_mhz: float) -> Iterable[float]:
    current = start_mhz
    while current <= stop_mhz + 1e-9:
        yield round(current, 6)
        current += step_mhz


def classify_peak(power_db: float) -> str:
    if power_db > 28:
        return "police"
    if power_db > 24:
        return "ambulance"
    if power_db > 20:
        return "fire"
    if power_db > 16:
        return "defense"
    return "unknown"


def scan_frequency(sdr: Any, frequency_hz: float) -> float:
    sdr.center_freq = frequency_hz
    samples = sdr.read_samples(256_000)
    spectrum = np.fft.fftshift(np.fft.fft(samples))
    power = np.abs(spectrum) ** 2
    power_db = 10 * np.log10(np.max(power) + 1e-9)
    return float(power_db)


def scan_once(start_mhz: float, stop_mhz: float, step_mhz: float) -> list[Detection]:
    if RtlSdr is None:
        raise RuntimeError("rtlsdr package is not installed")

    sdr = RtlSdr()
    sdr.sample_rate = 2.4e6
    sdr.gain = "auto"
    detections: list[Detection] = []

    try:
        for frequency_mhz in generate_frequencies(start_mhz, stop_mhz, step_mhz):
            power_db = scan_frequency(sdr, frequency_mhz * 1e6)
            if power_db < 14:
                continue
            detections.append(
                Detection(
                    frequency_mhz=frequency_mhz,
                    power_db=round(power_db, 2),
                    timestamp=time.time(),
                    label=classify_peak(power_db),
                )
            )
    finally:
        sdr.close()

    return detections


def write_detections(detections: list[Detection]) -> None:
    payload = {
        "updated_at": time.time(),
        "detections": [asdict(item) for item in detections],
    }
    DETECTIONS_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="TrackApp Target Blue Eye scanner")
    parser.add_argument("--start", type=float, default=DEFAULT_START_MHZ)
    parser.add_argument("--stop", type=float, default=DEFAULT_STOP_MHZ)
    parser.add_argument("--step", type=float, default=DEFAULT_STEP_MHZ)
    parser.add_argument("--interval", type=int, default=8, help="Seconds between scans")
    args = parser.parse_args()

    if RtlSdr is None:
        print("rtlsdr is not installed. Install dependencies first.")
        return 1

    print(f"Scanning {args.start:.1f}-{args.stop:.1f} MHz every {args.interval}s...")
    while True:
        try:
            detections = scan_once(args.start, args.stop, args.step)
            write_detections(detections)
            print(f"Saved {len(detections)} detections to {DETECTIONS_FILE}")
        except Exception as exc:  # pragma: no cover - hardware/runtime issues
            print(f"Scan error: {exc}")
        time.sleep(args.interval)


if __name__ == "__main__":
    raise SystemExit(main())
