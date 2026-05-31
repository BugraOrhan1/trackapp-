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
from collections import deque

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

# Unified, distance-based LED mapping (not per-service). Keys are colour labels
# used by `get_active_labels()` to decide which LEDs to turn on.
LED_PINS = {
    "red": 23,      # dichtbij
    "orange": 27,   # middel
    "yellow": 17,   # middel
    "green": 22,    # heel ver of geen
}


class LedController:
    def __init__(self, label_to_pin: dict[str, int], enabled: bool = True):
        self.label_to_pin = label_to_pin
        self.enabled = False
        self.gpio = None

        if not enabled:
            return

        try:
            import RPi.GPIO as gpio  # type: ignore[import-not-found]
        except ImportError:
            print("RPi.GPIO is not installed; LED output disabled.")
            return

        self.gpio = gpio
        self.gpio.setwarnings(False)
        self.gpio.setmode(self.gpio.BCM)

        for pin in self.label_to_pin.values():
            self.gpio.setup(pin, self.gpio.OUT, initial=self.gpio.LOW)

        self.enabled = True

    def set_active_labels(self, labels: Iterable[str]) -> None:
        if not self.enabled or self.gpio is None:
            return

        active = {label for label in labels if label in self.label_to_pin}
        for label, pin in self.label_to_pin.items():
            self.gpio.output(pin, self.gpio.HIGH if label in active else self.gpio.LOW)

    def all_off(self) -> None:
        self.set_active_labels([])

    def close(self) -> None:
        if not self.enabled or self.gpio is None:
            return

        self.all_off()
        self.gpio.cleanup(list(self.label_to_pin.values()))


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


def get_active_labels(detections: list[Detection]) -> list[str]:
    # Backwards-compat function kept for callers that expect it.
    if not detections:
        return []
    max_power = max(d.power_db for d in detections)
    if max_power >= 28:
        return ["red"]
    if max_power >= 20:
        return ["yellow", "orange"]
    if max_power >= 16:
        return ["green"]
    return []


class LedStateManager:
    """Stateful manager for LED activation with persistence and hysteresis.

    - Keeps a short history of recent max power readings.
    - Requires `required_hits` of readings above a threshold within the history
      to trigger an LED state.
    - After a state is active, it is held for `hold_scans` additional cycles
      to avoid flicker when a signal briefly disappears.
    """

    def __init__(
        self,
        red_thresh: float = 28.0,
        medium_thresh: float = 20.0,
        far_thresh: float = 16.0,
        history_size: int = 3,
        required_hits: int = 2,
        hold_scans: int = 2,
    ) -> None:
        self.red_thresh = red_thresh
        self.medium_thresh = medium_thresh
        self.far_thresh = far_thresh
        self.history: deque[float] = deque(maxlen=history_size)
        self.required_hits = required_hits
        self.hold_scans = hold_scans
        self.hold_counter = 0
        self.current_labels: list[str] = []

    def update(self, max_power: float) -> list[str]:
        # record
        self.history.append(max_power)

        red_hits = sum(1 for v in self.history if v >= self.red_thresh)
        medium_hits = sum(1 for v in self.history if v >= self.medium_thresh)
        far_hits = sum(1 for v in self.history if v >= self.far_thresh)

        # Decide new labels based on counts in history
        if red_hits >= self.required_hits:
            labels = ["red"]
        elif medium_hits >= self.required_hits:
            labels = ["yellow", "orange"]
        elif far_hits >= self.required_hits:
            labels = ["green"]
        else:
            labels = []

        if labels:
            # Activate new state and reset hold counter
            self.current_labels = labels
            self.hold_counter = self.hold_scans
            return labels

        # No new detection: hold previous state for a few scans to avoid flicker
        if self.hold_counter > 0:
            self.hold_counter -= 1
            return self.current_labels

        # Clear state
        self.current_labels = []
        return []


def main() -> int:
    parser = argparse.ArgumentParser(description="TrackApp Target Blue Eye scanner")
    parser.add_argument("--start", type=float, default=DEFAULT_START_MHZ)
    parser.add_argument("--stop", type=float, default=DEFAULT_STOP_MHZ)
    parser.add_argument("--step", type=float, default=DEFAULT_STEP_MHZ)
    parser.add_argument("--interval", type=int, default=8, help="Seconds between scans")
    led_group = parser.add_mutually_exclusive_group()
    led_group.add_argument("--leds", dest="leds", action="store_true", help="Enable GPIO LEDs")
    led_group.add_argument("--no-leds", dest="leds", action="store_false", help="Disable GPIO LEDs")
    parser.set_defaults(leds=True)
    args = parser.parse_args()

    led_controller = LedController(LED_PINS, enabled=args.leds)
    led_state = LedStateManager()

    # If the rtlsdr Python module is unavailable, run a safe demo loop so the
    # service stays up and you can verify LED wiring without hardware.
    if RtlSdr is None:
        print("rtlsdr is not installed. Entering demo LED mode (no hardware).")
        try:
            demo_sequence = [0.0, 17.0, 21.0, 29.0, 0.0]
            idx = 0
            while True:
                max_power = demo_sequence[idx % len(demo_sequence)]
                active_labels = led_state.update(max_power)
                led_controller.set_active_labels(active_labels)
                payload = {"updated_at": time.time(), "detections": [{"frequency_mhz": 0.0, "power_db": max_power, "timestamp": time.time(), "label": "simulated"}]}
                DETECTIONS_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
                if active_labels:
                    print(f"Demo max_power={max_power:.1f} dB | LEDs: {', '.join(active_labels)}")
                else:
                    print(f"Demo max_power={max_power:.1f} dB | LEDs: off")
                idx += 1
                time.sleep(args.interval)
        finally:
            led_controller.close()

    print(f"Scanning {args.start:.1f}-{args.stop:.1f} MHz every {args.interval}s...")
    try:
        while True:
            try:
                detections = scan_once(args.start, args.stop, args.step)
                write_detections(detections)

                # Determine smoothed/persistent LED labels using recent max power
                max_power = max((d.power_db for d in detections), default=0.0)
                active_labels = led_state.update(max_power)
                led_controller.set_active_labels(active_labels)

                if active_labels:
                    print(
                        f"Saved {len(detections)} detections to {DETECTIONS_FILE} | max_power={max_power:.1f} dB | LEDs: {', '.join(active_labels)}"
                    )
                else:
                    print(f"Saved {len(detections)} detections to {DETECTIONS_FILE} | max_power={max_power:.1f} dB | LEDs: off")
            except Exception as exc:  # pragma: no cover - hardware/runtime issues
                led_controller.all_off()
                print(f"Scan error: {exc}")
            time.sleep(args.interval)
    finally:
        led_controller.close()


if __name__ == "__main__":
    raise SystemExit(main())
