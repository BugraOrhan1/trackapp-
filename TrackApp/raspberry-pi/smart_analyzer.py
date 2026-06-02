#!/usr/bin/env python3
"""
Ultra Smart Analyzer v3.0
- Mast vs mobiel detectie
- Adaptief leren per locatie
- Burst detectie (korte transmissies)
- Movement detection (signaal komt dichterbij)
- False positive filter
- Auto reset bij omgevingsverandering
"""
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
        self.STABLE_STRIKES = 7
        self.MAX_STRIKES = 25
        self.HISTORY_LENGTH = 60
        self.BURST_HISTORY = 10
        self.STD_STABLE_THRESHOLD = 2.5
        self.MOVEMENT_THRESHOLD = 4.0
        
        self.total_scans = 0
        self.scans_per_freq = {}
        
        # Locatie tracking
        self.location_signature = None
        self.location_changed_count = 0
        self.LOCATION_CHANGE_THRESHOLD = 5
        
        # Statistieken
        self.detections_count = 0
        self.last_detection_time = 0
        self.session_start = time.time()
        
        # State
        self.last_result = self._empty_result()
        
        # Persistente data laden
        self._load_known_masts()

    def _empty_result(self):
        return {
            'has_mobile': False,
            'mobile_count': 0,
            'mobile_signals': [],
            'mast_count': 0,
            'level': 0,
            'learning': True,
            'movement_detected': False,
            'burst_detected': False,
            'total_scans': 0,
            'session_detections': 0
        }

    def _freq_key(self, freq_mhz):
        return round(freq_mhz, 2)

    def _load_known_masts(self):
        """Laad eerder herkende masten van vorige sessies"""
        try:
            path = "/opt/tetra-scanner/data/known_masts.json"
            if os.path.exists(path):
                with open(path) as f:
                    data = json.load(f)
                    # Alleen masten van zelfde locatie laden
                    for fk_str, info in data.get('masts', {}).items():
                        fk = float(fk_str)
                        self.freq_profiles[fk] = {
                            'freq_mhz': info['freq_mhz'],
                            'history': deque([info.get('avg_power', 50)] * 5, maxlen=self.HISTORY_LENGTH),
                            'strikes': self.STABLE_STRIKES,
                            'is_stable': True,
                            'last_seen': time.time(),
                            'first_seen': time.time(),
                            'pre_learned': True,
                            'avg_power': info.get('avg_power', 50)
                        }
                logger.info(f"Geladen: {len(self.freq_profiles)} bekende masten")
        except Exception as e:
            logger.warning(f"Kon masten niet laden: {e}")

    def _save_known_masts(self):
        """Sla herkende masten op voor volgende sessie"""
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
        """Detecteer of locatie significant veranderd is"""
        if self.location_signature is None:
            self.location_signature = seen_freqs.copy()
            return False
        
        # Vergelijk met huidige signature
        if len(self.location_signature) > 0:
            overlap = len(seen_freqs & self.location_signature)
            ratio = overlap / max(len(self.location_signature), 1)
            
            if ratio < 0.3:  # Minder dan 30% overlap = nieuwe locatie
                self.location_changed_count += 1
                if self.location_changed_count >= self.LOCATION_CHANGE_THRESHOLD:
                    logger.info("Locatie verandering gedetecteerd - reset masten")
                    self.location_signature = seen_freqs.copy()
                    self.location_changed_count = 0
                    return True
            else:
                self.location_changed_count = 0
        
        # Update signature langzaam
        self.location_signature = (self.location_signature | seen_freqs)
        return False

    def update(self, scan_result):
        self.total_scans += 1
        if not scan_result:
            return self.last_result

        active_freqs = scan_result.get('active_frequencies', [])
        seen = set()
        current_powers = {}

        # Update profielen
        for af in active_freqs:
            fk = self._freq_key(af['freq_mhz'])
            seen.add(fk)
            current_powers[fk] = af['above_noise_db']
            
            if fk not in self.freq_profiles:
                self.freq_profiles[fk] = {
                    'freq_mhz': af['freq_mhz'],
                    'history': deque(maxlen=self.HISTORY_LENGTH),
                    'strikes': 0,
                    'is_stable': False,
                    'last_seen': time.time(),
                    'first_seen': time.time(),
                    'pre_learned': False,
                    'burst_count': 0
                }
            
            p = self.freq_profiles[fk]
            p['history'].append(af['above_noise_db'])
            p['last_seen'] = time.time()

            # Stabiliteits check
            if len(p['history']) >= 5:
                recent = list(p['history'])[-5:]
                std = np.std(recent)
                
                if std < self.STD_STABLE_THRESHOLD:
                    p['strikes'] = min(p['strikes'] + 1, self.MAX_STRIKES)
                else:
                    p['strikes'] = max(p['strikes'] - 1, 0)

                if p['strikes'] >= self.STABLE_STRIKES:
                    p['is_stable'] = True
                elif p['strikes'] == 0:
                    p['is_stable'] = False

        # Locatie check
        location_changed = self._detect_location_change(seen)
        if location_changed:
            # Reset alle niet-stabiele profielen
            for fk in list(self.freq_profiles.keys()):
                if not self.freq_profiles[fk]['is_stable']:
                    del self.freq_profiles[fk]

        # Verlaag strikes voor niet-zichtbare freqs
        to_del = []
        for fk, p in self.freq_profiles.items():
            if fk not in seen:
                p['strikes'] = max(p['strikes'] - 1, 0)
                p['history'].append(0)
                
                # Verwijder oude profielen
                if not p['is_stable'] and time.time() - p['last_seen'] > 180:
                    to_del.append(fk)
                elif p['is_stable'] and time.time() - p['last_seen'] > 600:
                    # Stabiele masten ook verwijderen na 10 min weg
                    to_del.append(fk)
                    
        for fk in to_del:
            del self.freq_profiles[fk]

        # Classificeer signalen
        mobile_signals = []
        mast_count = 0
        movement_detected = False
        burst_detected = False
        
        for fk, p in self.freq_profiles.items():
            if p['is_stable']:
                mast_count += 1
                
                # Movement check: vergelijk recent vs historisch
                if fk in current_powers and len(p['history']) >= 20:
                    recent_avg = np.mean([x for x in list(p['history'])[-5:] if x > 0] or [0])
                    historic_avg = np.mean([x for x in list(p['history'])[-20:-5] if x > 0] or [0])
                    
                    if recent_avg > historic_avg + self.MOVEMENT_THRESHOLD:
                        movement_detected = True
                        # Mast wordt sterker = beweging
                        mobile_signals.append({
                            'freq_mhz': p['freq_mhz'],
                            'power_db': current_powers[fk],
                            'type': 'BEWEGING',
                            'change': recent_avg - historic_avg
                        })
                        
            elif fk in seen:
                history = list(p['history'])
                non_zero = [x for x in history if x > 0]
                
                if non_zero:
                    current = non_zero[-1]
                    
                    # Burst detectie: plotseling signaal
                    if len(non_zero) <= 3 and current > 30:
                        burst_detected = True
                        mobile_signals.append({
                            'freq_mhz': p['freq_mhz'],
                            'power_db': current,
                            'type': 'BURST',
                            'strikes': p['strikes']
                        })
                    elif p['strikes'] < self.STABLE_STRIKES and current > 25:
                        mobile_signals.append({
                            'freq_mhz': p['freq_mhz'],
                            'power_db': current,
                            'type': 'MOBIEL',
                            'strikes': p['strikes']
                        })

        # Bereken LED level
        if mobile_signals:
            strongest = max(s['power_db'] for s in mobile_signals)
            self.last_detection_time = time.time()
            self.detections_count += 1
        else:
            strongest = 0

        # Smart level berekening
        level = 0
        if strongest >= 60:
            level = 4
        elif strongest >= 48:
            level = 3
        elif strongest >= 38:
            level = 2
        elif strongest >= 28:
            level = 1
        
        # Boost level bij bijzondere events
        if burst_detected and level < 2:
            level = 2
        if movement_detected and level < 3:
            level = max(level, 2)

        learning = self.total_scans < 20
        mobile_signals.sort(key=lambda x: x['power_db'], reverse=True)

        # Periodiek opslaan (elke 100 scans)
        if self.total_scans % 100 == 0:
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
            lines.append(f"LEREN... ({r['total_scans']}/20)")
        else:
            lines.append("MODUS: ACTIEF")
        lines.append(f"Vaste masten: {r['mast_count']}")
        lines.append(f"Sessie: {r['session_minutes']}m | Detecties: {r['session_detections']}")
        
        if r['burst_detected']:
            lines.append("*** BURST GEDETECTEERD ***")
        if r['movement_detected']:
            lines.append("*** BEWEGING GEDETECTEERD ***")
        
        if r['has_mobile']:
            lines.append(f"*** MOBIEL: {r['mobile_count']} ***")
            for s in r['mobile_signals'][:3]:
                tag = s.get('type', '?')
                lines.append(f"  [{tag}] {s['freq_mhz']:.3f}MHz {s['power_db']:.1f}dB")
        else:
            lines.append("Geen mobiele signalen")
        return lines
