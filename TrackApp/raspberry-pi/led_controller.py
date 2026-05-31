#!/usr/bin/env python3
"""LED Controller Module"""

import time
import logging

try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
except (ImportError, RuntimeError):
    GPIO_AVAILABLE = False
    print("WAARSCHUWING: RPi.GPIO niet beschikbaar - simulatie modus")

from config import LED_GREEN, LED_YELLOW, LED_ORANGE, LED_RED, ALL_LEDS, SIGNAL_HOLD_TIME

logger = logging.getLogger('tetra-scanner.led')


class LEDController:
    LEVEL_OFF = 0
    LEVEL_GREEN = 1
    LEVEL_YELLOW = 2
    LEVEL_ORANGE = 3
    LEVEL_RED = 4

    def __init__(self):
        self.current_level = self.LEVEL_OFF
        self.last_change_time = 0
        self.initialized = False
        self._setup_gpio()

    def _setup_gpio(self):
        if not GPIO_AVAILABLE:
            logger.warning("GPIO niet beschikbaar - simulatie modus")
            self.initialized = True
            return

        try:
            GPIO.setmode(GPIO.BCM)
            GPIO.setwarnings(False)
            for pin in ALL_LEDS:
                GPIO.setup(pin, GPIO.OUT)
                GPIO.output(pin, GPIO.LOW)
            self.initialized = True
            logger.info("GPIO geïnitialiseerd - Pinnen: GROEN=%d, GEEL=%d, ORANJE=%d, ROOD=%d",
                        LED_GREEN, LED_YELLOW, LED_ORANGE, LED_RED)
            self._startup_sequence()
        except Exception as e:
            logger.error("GPIO initialisatie mislukt: %s", e)
            self.initialized = False

    def _startup_sequence(self):
        if not GPIO_AVAILABLE:
            return

        logger.info("LED test sequence...")
        leds_in_order = [LED_GREEN, LED_YELLOW, LED_ORANGE, LED_RED]
        names = ["GROEN", "GEEL", "ORANJE", "ROOD"]
        for pin, name in zip(leds_in_order, names):
            GPIO.output(pin, GPIO.HIGH)
            logger.debug("  %s AAN", name)
            time.sleep(0.3)
        time.sleep(0.5)
        for pin in leds_in_order:
            GPIO.output(pin, GPIO.LOW)
            time.sleep(0.1)
        for _ in range(2):
            for pin in leds_in_order:
                GPIO.output(pin, GPIO.HIGH)
            time.sleep(0.15)
            for pin in leds_in_order:
                GPIO.output(pin, GPIO.LOW)
            time.sleep(0.15)
        logger.info("LED test sequence voltooid")

    def set_level(self, level):
        now = time.time()
        if level < self.current_level and (now - self.last_change_time) < SIGNAL_HOLD_TIME:
            return
        if level != self.current_level:
            self.current_level = level
            self.last_change_time = now
            self._update_leds()

    def _update_leds(self):
        level = self.current_level
        if GPIO_AVAILABLE and self.initialized:
            try:
                for pin in ALL_LEDS:
                    GPIO.output(pin, GPIO.LOW)
                if level >= self.LEVEL_GREEN:
                    GPIO.output(LED_GREEN, GPIO.HIGH)
                if level >= self.LEVEL_YELLOW:
                    GPIO.output(LED_YELLOW, GPIO.HIGH)
                if level >= self.LEVEL_ORANGE:
                    GPIO.output(LED_ORANGE, GPIO.HIGH)
                if level >= self.LEVEL_RED:
                    GPIO.output(LED_RED, GPIO.HIGH)
            except Exception as e:
                logger.error("LED update fout: %s", e)

        level_names = {
            0: "UIT",
            1: "GROEN (ver)",
            2: "GEEL (middel)",
            3: "ORANJE (dichtbij)",
            4: "ROOD (zeer dichtbij)"
        }
        logger.debug("LED niveau: %s", level_names.get(level, "ONBEKEND"))

    def all_off(self):
        self.current_level = self.LEVEL_OFF
        if GPIO_AVAILABLE and self.initialized:
            try:
                for pin in ALL_LEDS:
                    GPIO.output(pin, GPIO.LOW)
            except Exception as e:
                logger.error("LEDs uitzetten mislukt: %s", e)

    def error_blink(self, count=5):
        if not GPIO_AVAILABLE:
            return
        try:
            self.all_off()
            for _ in range(count):
                GPIO.output(LED_RED, GPIO.HIGH)
                time.sleep(0.2)
                GPIO.output(LED_RED, GPIO.LOW)
                time.sleep(0.2)
        except Exception as e:
            logger.error("Error blink mislukt: %s", e)

    def searching_pattern(self):
        if not GPIO_AVAILABLE:
            return
        try:
            GPIO.output(LED_GREEN, GPIO.HIGH)
            time.sleep(0.1)
            GPIO.output(LED_GREEN, GPIO.LOW)
        except Exception as e:
            logger.error("Searching pattern mislukt: %s", e)

    def cleanup(self):
        self.all_off()
        if GPIO_AVAILABLE:
            try:
                GPIO.cleanup()
                logger.info("GPIO opgeruimd")
            except Exception as e:
                logger.error("GPIO cleanup mislukt: %s", e)

    def get_status_string(self):
        indicators = {
            0: "[ ] [ ] [ ] [ ]",
            1: "[G] [ ] [ ] [ ]",
            2: "[G] [Y] [ ] [ ]",
            3: "[G] [Y] [O] [ ]",
            4: "[G] [Y] [O] [R]"
        }
        return indicators.get(self.current_level, "[ ] [ ] [ ] [ ]")