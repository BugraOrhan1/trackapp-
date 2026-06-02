#!/usr/bin/env python3
"""Smart Analyzer v4.0 - Burst priority for hulpdiensten"""
import time
import logging
import numpy as np
from collections import deque
import json
import os

logger = logging.getLogger('tetra-scanner.smart')


class SmartAnalyzer:
    def __init__(self):
        self.freq_profiles = {}
        # Strenger voor masten - 10 strikes nodig
        self.STABLE_STRIKES = 10
        self.MAX_STRIKES = 30
        self.HISTORY_LENGTH = 80
        # Strenger voor stabiliteit
        self.STD_STABLE_THRESHOLD = 2.0
        self.MOVEMENT_THRESHOLD = 5.0
        # Burst sensitivity - lager = gevoeliger
        self.BURST_MIN_POWER = 20.0
        self.BURST_MAX_AGE = 5
        
        self.total_scans = 0
        self.location_signature = None
        self.location_changed_count = 0
        self.LOCATION_CHANGE_THRESHOLD = 8
        
        self.detections_count = 0
        self.last_detection_time = 0
        self.session_start = time.time()
        
        # False positive filter
        self.recent_false_positives = deque(maxlen=20)
        
        self.last_result = self._empty_result()
        self._load_known_masts()

    def _empty_result(self):
        return {
            'has_mobile': False, 'mobile_count': 0, 'mobile_signals': [],
            'mast_count': 0, 'level': 0, 'learning': True,
            'movement_detected': False, 'burst_detected': False,
            'total_scans': 0, 'session_detections': 0
        }

    def _freq_key(self, freq_mhz):
        return round(freq_mhz, 2)

    def _load_known_masts(self):
        try:
            path = "/opt/tetra-scanner/data/known_masts.json"
            if os.path.exists(path):
                with open(path) as f:
                    data = json.load(f)
                    for fk_str, info in data.get('masts', {}).items():
                        fk = float(fk_str)
                        avg = info.get('avg_power', 50)
                        self.freq_profiles[fk] = {
                            'freq_mhz': info['freq_mhz'],
                            'history': deque([avg] * 8, maxlen=self.HISTORY_LENGTH),
                            'strikes': self.STABLE_STRIKES,
                            'is_stable': True,
                            'last_seen': time.time(),
                            'first_seen': time.time(),
                            'pre_learned': True,
                            'avg_power': avg
                        }
                logger.info(f"Geladen: {len(self.freq_profiles)} bekende masten")
        except Exception as e:
            logger.warning(f"Kon masten niet laden: {e}")

    def _save_known_masts(self):
        try:
            path = "/opt/tetra-scanner/data/known_masts.json"
            data = {'masts': {}, 'saved_at': time.time()}
            for fk, p in self.freq_profiles.items():
                if p['is_stable']:
                    non_zero = [x for x in p['history'] if x > 0]
                    if non_zero:
                        data['masts'][str(fk)] = {
                            'freq_mhz': p['freq_mhz'],
                            'avg_power': float(np.mean(non_zero)),
                            'std': float(np.std(non_zero))
                        }
            with open(path, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.warning(f"Kon masten niet opslaan: {e}")

    def _detect_location_change(self, seen_freqs):
        if self.location_signature is None:
            self.location_signature = seen_freqs.copy()
            return False
        if len(self.location_signature) > 0:
            overlap = len(seen_freqs & self.location_signature)
            ratio = overlap / max(len(self.location_signature), 1)
            if ratio < 0.25:
                self.location_changed_count += 1
                if self.location_changed_count >= self.LOCATION_CHANGE_THRESHOLD:
                    logger.info("Locatie verandering")
                    self.location_signature = seen_freqs.copy()
                    self.location_changed_count = 0
                    return True
            else:
                self.location_changed_count = 0
        self.location_signature = (self.location_signature | seen_freqs)
        return False

    def _is_likely_false_positive(self, freq_mhz, power_db):
        """Check of dit een vals positief is gebaseerd op historie"""
        # Als zelfde freq al X keer als 'mobiel' gemarkeerd maar nooit echt boven 50dB
        for fp in self.recent_false_positives:
            if abs(fp['freq'] - freq_mhz) < 0.05 and abs(fp['power'] - power_db) < 5:
                return True
        return False

    def update(self, scan_result):
        self.total_scans += 1
        if not scan_result:
            return self.last_result

        active_freqs = scan_result.get('active_frequencies', [])
        seen = set()
        current_powers = {}

        for af in active_freqs:
            fk = self._freq_key(af['freq_mhz'])
            seen.add(fk)
            current_powers[fk] = af['above_noise_db']
            
            if fk not in self.freq_profiles:
                self.freq_profiles[fk] = {
                    'freq_mhz': af['freq_mhz'],
                    'history': deque(maxlen=self.HISTORY_LENGTH),
                    'strikes': 0, 'is_stable': False,
                    'last_seen': time.time(), 'first_seen': time.time(),
                    'pre_learned': False, 'burst_count': 0
                }
            
            p = self.freq_profiles[fk]
            p['history'].append(af['above_noise_db'])
            p['last_seen'] = time.time()

            if len(p['history']) >= 8:
                recent = list(p['history'])[-8:]
                std = np.std(recent)
                
                if std < self.STD_STABLE_THRESHOLD:
                    p['strikes'] = min(p['strikes'] + 1, self.MAX_STRIKES)
                else:
                    p['strikes'] = max(p['strikes'] - 2, 0)

                if p['strikes'] >= self.STABLE_STRIKES:
                    p['is_stable'] = True
                elif p['strikes'] <= 2:
                    p['is_stable'] = False

        location_changed = self._detect_location_change(seen)
        if location_changed:
            for fk in list(self.freq_profiles.keys()):
                if not self.freq_profiles[fk]['is_stable']:
                    del self.freq_profiles[fk]

        to_del = []
        for fk, p in self.freq_profiles.items():
            if fk not in seen:
                p['strikes'] = max(p['strikes'] - 1, 0)
                p['history'].append(0)
                if not p['is_stable'] and time.time() - p['last_seen'] > 120:
                    to_del.append(fk)
                elif p['is_stable'] and time.time() - p['last_seen'] > 900:
                    to_del.append(fk)
        for fk in to_del:
            del self.freq_profiles[fk]

        mobile_signals = []
        mast_count = 0
        movement_detected = False
        burst_detected = False
        
        for fk, p in self.freq_profiles.items():
            if p['is_stable']:
                mast_count += 1
                
                # MAST kan WEL burst doorlaten als signaal plotseling veel sterker is
                if fk in current_powers and len(p['history']) >= 10:
                    recent_avg = np.mean([x for x in list(p['history'])[-3:] if x > 0] or [0])
                    historic_avg = np.mean([x for x in list(p['history'])[-15:-3] if x > 0] or [0])
                    
                    # Beweging detectie - mast wordt sterker
                    if recent_avg > historic_avg + self.MOVEMENT_THRESHOLD:
                        movement_detected = True
                        mobile_signals.append({
                            'freq_mhz': p['freq_mhz'],
                            'power_db': current_powers[fk],
                            'type': 'BEWEGING',
                            'change': recent_avg - historic_avg
                        })
                    
                    # Burst op mast (zoals bij portofoon transmissie via mast)
                    if current_powers[fk] > historic_avg + 8:
                        burst_detected = True
                        mobile_signals.append({
                            'freq_mhz': p['freq_mhz'],
                            'power_db': current_powers[fk],
                            'type': 'BURST-MAST'
                        })
                        
            elif fk in seen:
                history = list(p['history'])
                non_zero = [x for x in history if x > 0]
                
                if non_zero:
                    current = non_zero[-1]
                    
                    # False positive filter
                    if self._is_likely_false_positive(p['freq_mhz'], current):
                        continue
                    
                    # Burst detectie - nieuw signaal
                    if len(non_zero) <= self.BURST_MAX_AGE and current > self.BURST_MIN_POWER:
                        burst_detected = True
                        mobile_signals.append({
                            'freq_mhz': p['freq_mhz'],
                            'power_db': current,
                            'type': 'BURST',
                            'strikes': p['strikes']
                        })
                    # Wisselend mobiel signaal
                    elif p['strikes'] < self.STABLE_STRIKES and current > 20:
                        mobile_signals.append({
                            'freq_mhz': p['freq_mhz'],
                            'power_db': current,
                            'type': 'MOBIEL',
                            'strikes': p['strikes']
                        })

        if mobile_signals:
            strongest = max(s['power_db'] for s in mobile_signals)
            self.last_detection_time = time.time()
            self.detections_count += 1
        else:
            strongest = 0

        # LED levels - lager en gevoeliger
        level = 0
        if strongest >= 50:
            level = 4
        elif strongest >= 40:
            level = 3
        elif strongest >= 30:
            level = 2
        elif strongest >= 22:
            level = 1
        
        # Boosts voor speciale events
        if burst_detected:
            level = max(level, 2)
        if movement_detected:
            level = max(level, 2)
        
        # Als zowel burst als movement = waarschijnlijk hulpdienst
        if burst_detected and movement_detected:
            level = max(level, 3)

        learning = self.total_scans < 25
        mobile_signals.sort(key=lambda x: x['power_db'], reverse=True)

        if self.total_scans % 50 == 0:
            self._save_known_masts()

        self.last_result = {
            'has_mobile': len(mobile_signals) > 0,
            'mobile_count': len(mobile_signals),
            'mobile_signals': mobile_signals[:5],
            'mast_count': mast_count,
            'level': level,
            'learning': learning,
            'movement_detected': movement_detected,
            'burst_detected': burst_detected,
            'total_scans': self.total_scans,
            'session_detections': self.detections_count,
            'strongest_mobile_db': strongest,
            'session_minutes': int((time.time() - self.session_start) / 60)
        }
        return self.last_result

    def get_status_lines(self):
        r = self.last_result
        lines = []
        if r['learning']:
            lines.append(f"LEREN... ({r['total_scans']}/25)")
        else:
            lines.append("MODUS: ACTIEF")
        lines.append(f"Masten: {r['mast_count']} | Detecties: {r['session_detections']}")
        if r['burst_detected']:
            lines.append("*** BURST ***")
        if r['movement_detected']:
            lines.append("*** BEWEGING ***")
        if r['has_mobile']:
            lines.append(f"MOBIEL: {r['mobile_count']}")
            for s in r['mobile_signals'][:3]:
                tag = s.get('type', '?')
                lines.append(f"  [{tag}] {s['freq_mhz']:.3f} {s['power_db']:.1f}dB")
        return lines
