#!/usr/bin/env python3
"""LED Controller v4.0 met leer indicator"""
import time
import logging
import threading

try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
except (ImportError, RuntimeError):
    GPIO_AVAILABLE = False

from config import (
    LED_GREEN, LED_YELLOW, LED_ORANGE, LED_RED,
    ALL_LEDS, SIGNAL_HOLD_TIME
)

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
        self.heartbeat_running = False
        self.heartbeat_thread = None
        
        # Status flags
        self.is_learning = True
        self.is_ready = False
        self.burst_pending = False
        self.movement_pending = False
        self.calibration_pending = False
        self.lock = threading.Lock()
        
        self._setup_gpio()

    def _setup_gpio(self):
        if not GPIO_AVAILABLE:
            self.initialized = True
            return
        try:
            GPIO.setmode(GPIO.BCM)
            GPIO.setwarnings(False)
            for pin in ALL_LEDS:
                GPIO.setup(pin, GPIO.OUT)
                GPIO.output(pin, GPIO.LOW)
            self.initialized = True
            logger.info("GPIO: GROEN=%d GEEL=%d ORANJE=%d ROOD=%d",
                        LED_GREEN, LED_YELLOW, LED_ORANGE, LED_RED)
            self._startup_sequence()
            self._start_heartbeat()
        except Exception as e:
            logger.error("GPIO init mislukt: %s", e)

    def _startup_sequence(self):
        """Knight Rider effect"""
        if not GPIO_AVAILABLE:
            return
        leds = [LED_GREEN, LED_YELLOW, LED_ORANGE, LED_RED]
        for pin in leds:
            GPIO.output(pin, GPIO.HIGH)
            time.sleep(0.1)
            GPIO.output(pin, GPIO.LOW)
        for pin in reversed(leds):
            GPIO.output(pin, GPIO.HIGH)
            time.sleep(0.1)
            GPIO.output(pin, GPIO.LOW)

    def set_learning(self, learning):
        """Schakel leermodus aan/uit"""
        if not learning and self.is_learning:
            # Net klaar met leren - viering!
            self.is_learning = False
            self.is_ready = True
            if GPIO_AVAILABLE:
                # Groen 3x snel knipperen = KLAAR
                for _ in range(3):
                    GPIO.output(LED_GREEN, GPIO.HIGH)
                    time.sleep(0.15)
                    GPIO.output(LED_GREEN, GPIO.LOW)
                    time.sleep(0.15)
            logger.info("KLAAR voor gebruik! Scanner is actief.")
        elif learning:
            self.is_learning = True
            self.is_ready = False

    def set_calibrating(self, cal):
        """Visuele indicator voor kalibratie"""
        self.calibration_pending = cal

    def _start_heartbeat(self):
        if not GPIO_AVAILABLE:
            return
        self.heartbeat_running = True
        self.heartbeat_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self.heartbeat_thread.start()

    def _heartbeat_loop(self):
        """Slimme heartbeat met verschillende patterns"""
        last_beat = 0
        while self.heartbeat_running:
            try:
                now = time.time()
                
                # Burst effect (alle leds 1x snel flashen)
                if self.burst_pending:
                    with self.lock:
                        self.burst_pending = False
                    if GPIO_AVAILABLE:
                        for _ in range(2):
                            for pin in ALL_LEDS:
                                GPIO.output(pin, GPIO.HIGH)
                            time.sleep(0.05)
                            for pin in ALL_LEDS:
                                GPIO.output(pin, GPIO.LOW)
                            time.sleep(0.05)
                        self._update_leds()
                
                # Movement pulse
                elif self.movement_pending:
                    with self.lock:
                        self.movement_pending = False
                    if GPIO_AVAILABLE and self.current_level > 0:
                        for _ in range(2):
                            self._set_leds_off()
                            time.sleep(0.1)
                            self._update_leds()
                            time.sleep(0.1)
                
                # Kalibratie indicator - geel knippert
                elif self.calibration_pending:
                    if GPIO_AVAILABLE:
                        GPIO.output(LED_YELLOW, GPIO.HIGH)
                        time.sleep(0.15)
                        GPIO.output(LED_YELLOW, GPIO.LOW)
                        time.sleep(0.15)
                
                # LEREN indicator - rood knippert elke 2 sec
                elif self.is_learning and self.current_level == self.LEVEL_OFF:
                    if (now - last_beat) >= 2.0:
                        if GPIO_AVAILABLE:
                            GPIO.output(LED_RED, GPIO.HIGH)
                            time.sleep(0.15)
                            GPIO.output(LED_RED, GPIO.LOW)
                        last_beat = now
                
                # KLAAR indicator - groen knippert elke 3 sec (heartbeat)
                elif self.current_level == self.LEVEL_OFF and (now - last_beat) >= 3.0:
                    if GPIO_AVAILABLE:
                        GPIO.output(LED_GREEN, GPIO.HIGH)
                        time.sleep(0.08)
                        GPIO.output(LED_GREEN, GPIO.LOW)
                    last_beat = now
                
                time.sleep(0.1)
                
            except Exception as e:
                logger.error("Heartbeat fout: %s", e)
                time.sleep(1.0)

    def trigger_burst(self):
        with self.lock:
            self.burst_pending = True

    def trigger_movement(self):
        with self.lock:
            self.movement_pending = True

    def set_level(self, level):
        now = time.time()
        if level < self.current_level:
            if (now - self.last_change_time) < SIGNAL_HOLD_TIME:
                return
        if level != self.current_level:
            self.current_level = level
            self.last_change_time = now
            self._update_leds()

    def _set_leds_off(self):
        if GPIO_AVAILABLE and self.initialized:
            for pin in ALL_LEDS:
                try:
                    GPIO.output(pin, GPIO.LOW)
                except:
                    pass

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
                logger.error("LED fout: %s", e)

    def all_off(self):
        self.current_level = self.LEVEL_OFF
        self._set_leds_off()

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
        except:
            pass

    def searching_pattern(self):
        if not GPIO_AVAILABLE:
            return
        try:
            GPIO.output(LED_GREEN, GPIO.HIGH)
            time.sleep(0.1)
            GPIO.output(LED_GREEN, GPIO.LOW)
        except:
            pass

    def cleanup(self):
        self.heartbeat_running = False
        self.all_off()
        if GPIO_AVAILABLE:
            try:
                GPIO.cleanup()
            except:
                pass

    def get_status_string(self):
        i = {0: "[ ][ ][ ][ ]", 1: "[G][ ][ ][ ]", 2: "[G][Y][ ][ ]",
             3: "[G][Y][O][ ]", 4: "[G][Y][O][R]"}
        return i.get(self.current_level, "[?]")
