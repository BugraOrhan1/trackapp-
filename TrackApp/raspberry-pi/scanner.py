#!/usr/bin/env python3
"""TETRA Scanner - Hoofdprogramma"""

import sys
import os
import time
import signal
import logging
import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import (
    LOG_FILE, LOG_LEVEL, DATA_FILE,
    SCAN_INTERVAL, SHOW_TERMINAL_OUTPUT, TERMINAL_UPDATE_INTERVAL,
    FREQ_START_MHZ, FREQ_END_MHZ,
    THRESHOLD_GREEN, THRESHOLD_YELLOW, THRESHOLD_ORANGE, THRESHOLD_RED
)
from led_controller import LEDController
from signal_analyzer import SignalAnalyzer
from smart_analyzer import SmartAnalyzer


def setup_logging():
    log_dir = os.path.dirname(LOG_FILE)
    os.makedirs(log_dir, exist_ok=True)

    log_level = getattr(logging, LOG_LEVEL.upper(), logging.INFO)
    logger = logging.getLogger('tetra-scanner')
    logger.setLevel(log_level)

    file_handler = logging.FileHandler(LOG_FILE)
    file_handler.setLevel(log_level)
    file_format = logging.Formatter('%(asctime)s [%(name)s] %(levelname)s: %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
    file_handler.setFormatter(file_format)
    logger.addHandler(file_handler)

    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_format = logging.Formatter('%(levelname)s: %(message)s')
    console_handler.setFormatter(console_format)
    logger.addHandler(console_handler)

    return logger


class TetraScanner:
    def __init__(self):
        self.logger = setup_logging()
        self.led = LEDController()
        self.analyzer = SignalAnalyzer()
        self.smart = SmartAnalyzer()
        self.running = False
        self.start_time = None
        self.data_file = None
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame):
        self.logger.info("Afsluit signaal ontvangen (%d)", signum)
        self.running = False

    def _init_data_file(self):
        try:
            data_dir = os.path.dirname(DATA_FILE)
            os.makedirs(data_dir, exist_ok=True)
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            data_path = DATA_FILE.replace('.csv', f'_{timestamp}.csv')
            self.data_file = open(data_path, 'w')
            self.data_file.write("timestamp,scan_num,peak_freq_mhz,peak_power_db,above_noise_db,noise_floor_db,level,active_count\n")
            self.data_file.flush()
            self.logger.info("Data bestand: %s", data_path)
        except Exception as e:
            self.logger.warning("Kon data bestand niet aanmaken: %s", e)
            self.data_file = None

    def _log_scan_data(self, result):
        if self.data_file is None:
            return

        try:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
            line = (
                f"{timestamp},"
                f"{result['scan_count']},"
                f"{result['peak_freq_mhz']:.6f},"
                f"{result['peak_power_db']:.1f},"
                f"{result['above_noise_db']:.1f},"
                f"{result['noise_floor_db']:.1f},"
                f"{result['level']},"
                f"{len(result['active_frequencies'])}\n"
            )
            self.data_file.write(line)
            if result['scan_count'] % 10 == 0:
                self.data_file.flush()
        except Exception as e:
            self.logger.debug("Data logging fout: %s", e)

    def _print_status(self, result):
        if not SHOW_TERMINAL_OUTPUT:
            return
        if result['scan_count'] % TERMINAL_UPDATE_INTERVAL != 0:
            return

        os.system('clear' if os.name != 'nt' else 'cls')
        level_names = {
            0: "GEEN SIGNAAL",
            1: "▓░░░ GROEN  (ver weg)",
            2: "▓▓░░ GEEL   (middelmatig)",
            3: "▓▓▓░ ORANJE (dichterbij)",
            4: "▓▓▓▓ ROOD   (heel dichtbij)"
        }

        uptime = time.time() - self.start_time
        hours = int(uptime // 3600)
        minutes = int((uptime % 3600) // 60)
        seconds = int(uptime % 60)

        print("╔══════════════════════════════════════════════╗")
        print("║          TETRA SIGNAL SCANNER                ║")
        print("║          380 - 400 MHz                       ║")
        print("╠══════════════════════════════════════════════╣")
        print(f"║  Status: ACTIEF  |  Uptime: {hours:02d}:{minutes:02d}:{seconds:02d}          ║")
        print(f"║  Scan #{result['scan_count']:>6d}                              ║")
        print("╠══════════════════════════════════════════════╣")
        print(f"║  Ruisvloer:    {result['noise_floor_db']:>7.1f} dB                  ║")
        print(f"║  Piek signaal: {result['peak_power_db']:>7.1f} dB                  ║")
        print(f"║  Boven ruis:   {result['above_noise_db']:>7.1f} dB (gem: {result['avg_above_noise_db']:.1f})     ║")
        print(f"║  Piek freq:    {result['peak_freq_mhz']:>10.6f} MHz              ║")
        print("╠══════════════════════════════════════════════╣")
        leds = self.led.get_status_string()
        level_text = level_names.get(result['level'], "ONBEKEND")
        print(f"║  LEDs: {leds}                      ║")
        print(f"║  Niveau: {level_text:<35s}║")
        print("╠══════════════════════════════════════════════╣")
        print("║  Drempels (dB boven ruisvloer):              ║")
        print(f"║    Groen:  > {THRESHOLD_GREEN:>5.1f} dB                        ║")
        print(f"║    Geel:   > {THRESHOLD_YELLOW:>5.1f} dB                        ║")
        print(f"║    Oranje: > {THRESHOLD_ORANGE:>5.1f} dB                        ║")
        print(f"║    Rood:   > {THRESHOLD_RED:>5.1f} dB                        ║")

        active = result.get('active_frequencies', [])
        if active:
            print("╠══════════════════════════════════════════════╣")
            print("║  Actieve frequenties:                        ║")
            for af in active[:5]:
                bar_len = min(int(af['above_noise_db'] / 2), 20)
                bar = '█' * bar_len
                print(f"║  {af['freq_mhz']:>10.3f} MHz  {af['above_noise_db']:>5.1f}dB {bar:<20s}║")

        print("╚══════════════════════════════════════════════╝")

    def start(self):
        self.logger.info("=" * 50)
        self.logger.info("TETRA Scanner wordt gestart...")
        self.logger.info("Frequentiebereik: %.1f - %.1f MHz", FREQ_START_MHZ, FREQ_END_MHZ)
        self.logger.info("=" * 50)

        self.logger.info("RTL-SDR initialiseren...")
        retry_count = 0
        max_retries = 10

        while retry_count < max_retries:
            if self.analyzer.initialize():
                break
            retry_count += 1
            self.logger.warning("RTL-SDR init poging %d/%d mislukt, wacht 5 seconden...", retry_count, max_retries)
            self.led.error_blink(3)
            time.sleep(5)

        if not self.analyzer.is_initialized:
            self.logger.error("RTL-SDR kon niet geïnitialiseerd worden na %d pogingen!", max_retries)
            self.led.error_blink(10)
            self.cleanup()
            return False

        self.logger.info("RTL-SDR succesvol geïnitialiseerd!")
        self._init_data_file()
        self.running = True
        self.start_time = time.time()
        self.logger.info("Scanner actief - begin met scannen...")

        try:
            self._scan_loop()
        except Exception as e:
            self.logger.error("Onverwachte fout in scan loop: %s", e, exc_info=True)
            self.led.error_blink(5)
        finally:
            self.cleanup()

        return True

    def _scan_loop(self):
        consecutive_errors = 0
        max_consecutive_errors = 10

        while self.running:
            try:
                result = self.analyzer.perform_scan()

                if result is None:
                    consecutive_errors += 1
                    self.logger.warning("Scan mislukt (%d/%d)", consecutive_errors, max_consecutive_errors)

                    if consecutive_errors >= max_consecutive_errors:
                        self.logger.error("Te veel opeenvolgende fouten, herstart SDR...")
                        self.led.error_blink(5)
                        self.analyzer.close()
                        time.sleep(2)
                        if self.analyzer.initialize():
                            consecutive_errors = 0
                            self.logger.info("SDR herstart succesvol")
                        else:
                            self.logger.error("SDR herstart mislukt!")
                            time.sleep(10)

                    self.led.searching_pattern()
                    time.sleep(1)
                    continue

                consecutive_errors = 0
                smart_result = self.smart.update(result)
                # Update learning indicator
                self.led.set_learning(smart_result.get('learning', False))
                
                if smart_result['learning']:
                    # Tijdens leren: GEEN LEDs voor signaal (alleen rood knipper)
                    self.led.set_level(0)
                else:
                    self.led.set_level(smart_result['level'])
                    # Trigger special effects
                    if smart_result.get('burst_detected'):
                        # self.led.trigger_burst()
                    if smart_result.get('movement_detected'):
                        # self.led.trigger_movement()
                self._log_scan_data(result)
                self._print_status(result)
                time.sleep(SCAN_INTERVAL)

            except KeyboardInterrupt:
                self.logger.info("Keyboard interrupt ontvangen")
                self.running = False
            except Exception as e:
                self.logger.error("Fout in scan loop: %s", e, exc_info=True)
                consecutive_errors += 1
                time.sleep(1)

    def cleanup(self):
        self.logger.info("Scanner wordt afgesloten...")
        self.running = False
        if self.data_file is not None:
            try:
                self.data_file.flush()
                self.data_file.close()
            except Exception:
                pass
        self.analyzer.close()
        self.led.cleanup()
        self.logger.info("Scanner afgesloten")


def main():
    print("=" * 50)
    print("  TETRA SIGNAL SCANNER")
    print("  380 - 400 MHz")
    print("  Raspberry Pi Zero 2 W + RTL-SDR 2832")
    print("=" * 50)
    print()

    scanner = TetraScanner()
    scanner.start()


if __name__ == '__main__':
    main()