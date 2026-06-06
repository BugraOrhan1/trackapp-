#!/usr/bin/env python3
"""Smart Analyzer v5.2 - Mast STICKY"""
import time
import logging
import numpy as np
from collections import deque

logger = logging.getLogger('tetra-scanner.smart')


class SmartAnalyzer:
    def __init__(self):
        self.freq_profiles = {}
        self.STABLE_STRIKES = 15
        self.HISTORY_LENGTH = 80
        self.STD_STABLE_THRESHOLD = 3.0  # Soepeler
        
        self.total_scans = 0
        self.detections_count = 0
        self.session_start = time.time()
        self.last_result = self._empty_result()

    def _empty_result(self):
        return {
            'has_mobile': False, 'mobile_count': 0, 'mobile_signals': [],
            'mast_count': 0, 'level': 0, 'learning': True, 'total_scans': 0
        }

    def _freq_key(self, freq_mhz):
        return round(freq_mhz, 2)

    def update(self, scan_result):
        self.total_scans += 1
        if not scan_result:
            return self.last_result

        active_freqs = scan_result.get('active_frequencies', [])
        seen = set()

        # Update profielen
        for af in active_freqs:
            fk = self._freq_key(af['freq_mhz'])
            seen.add(fk)
            
            if fk not in self.freq_profiles:
                self.freq_profiles[fk] = {
                    'freq_mhz': af['freq_mhz'],
                    'history': deque(maxlen=self.HISTORY_LENGTH),
                    'strikes': 0,
                    'is_stable': False,
                    'ever_stable': False,  # STICKY!
                    'last_seen': time.time(),
                    'baseline_power': 0,
                    'baseline_set': False,
                    'max_seen': 0
                }
            
            p = self.freq_profiles[fk]
            p['history'].append(af['above_noise_db'])
            p['last_seen'] = time.time()
            p['max_seen'] = max(p['max_seen'], af['above_noise_db'])

            # Stabiliteits check
            if len(p['history']) >= 10:
                recent = list(p['history'])[-10:]
                std = np.std(recent)
                
                if std < self.STD_STABLE_THRESHOLD:
                    p['strikes'] = min(p['strikes'] + 1, 30)
                else:
                    p['strikes'] = max(p['strikes'] - 1, 0)  # Trager dalen

                # STICKY: Eenmaal stable = altijd stable
                if p['strikes'] >= self.STABLE_STRIKES:
                    p['is_stable'] = True
                    p['ever_stable'] = True
                    # Baseline = gemiddelde van AL het stabiel signaal
                    # Update altijd zodat het juist is
                    non_zero = [x for x in list(p['history']) if x > 5]
                    if len(non_zero) >= 10:
                        # Gebruik 75e percentiel als baseline (typische sterkte)
                        p['baseline_power'] = float(np.percentile(non_zero, 75))
                        p['baseline_set'] = True

            # STICKY: Als ooit stable geweest, blijft het mast
            if p['ever_stable']:
                p['is_stable'] = True

        # Cleanup - alleen heel oude weghalen
        to_del = []
        for fk, p in self.freq_profiles.items():
            if fk not in seen:
                if not p['ever_stable'] and time.time() - p['last_seen'] > 60:
                    to_del.append(fk)
                elif p['ever_stable'] and time.time() - p['last_seen'] > 3600:
                    to_del.append(fk)
        for fk in to_del:
            del self.freq_profiles[fk]

        # ===========================================
        # LEVEL BEPALING
        # ===========================================
        all_signals = []
        mast_count = sum(1 for p in self.freq_profiles.values() if p['is_stable'])
        
        max_alarm_db = 0
        
        for af in active_freqs:
            fk = self._freq_key(af['freq_mhz'])
            p = self.freq_profiles.get(fk, {})
            current = af['above_noise_db']
            
            if p.get('is_stable') or p.get('ever_stable'):
                # MAST - check voor boost
                baseline = p.get('baseline_power', current)
                boost = current - baseline if baseline > 0 else 0
                
                all_signals.append({
                    'freq_mhz': af['freq_mhz'],
                    'power_db': current,
                    'baseline_db': baseline,
                    'boost_db': boost,
                    'type': 'MAST'
                })
                
                # ALARM alleen bij grote boost (10+ dB hoger dan normaal)
                if boost >= 12 and current >= 50:
                    max_alarm_db = max(max_alarm_db, current)
            else:
                # MOBIEL (echt nieuw signaal)
                if current >= 25:
                    all_signals.append({
                        'freq_mhz': af['freq_mhz'],
                        'power_db': current,
                        'type': 'MOBIEL'
                    })
                    max_alarm_db = max(max_alarm_db, current)

        all_signals.sort(key=lambda x: x['power_db'], reverse=True)

        # Level bepalen
        level = 0
        if max_alarm_db >= 55:
            level = 4  # ROOD
        elif max_alarm_db >= 45:
            level = 3  # ORANJE
        elif max_alarm_db >= 35:
            level = 2  # GEEL
        elif max_alarm_db >= 25:
            level = 1  # GROEN
        
        # Als er masten aanwezig zijn zonder echt alarm = max GROEN
        if level == 0 and mast_count > 0:
            strongest_mast = max((s['power_db'] for s in all_signals if s.get('type') == 'MAST'), default=0)
            if strongest_mast >= 40:
                level = 1  # GROEN

        if max_alarm_db > 0:
            self.detections_count += 1

        learning = self.total_scans < 30

        # Log elke 20 scans
        if self.total_scans % 20 == 0:
            top_info = []
            for s in all_signals[:4]:
                tag = s['type']
                if tag == 'MAST' and s.get('boost_db', 0) >= 10:
                    tag = 'MAST↑↑'
                elif tag == 'MAST' and s.get('boost_db', 0) >= 5:
                    tag = 'MAST↑'
                top_info.append(f"{s['freq_mhz']:.3f}={s['power_db']:.0f}[{tag}]")
            logger.info(f"Scan #{self.total_scans} | Masten:{mast_count} | Level:{level} | Alarm:{max_alarm_db:.0f}dB | {' '.join(top_info)}")

        self.last_result = {
            'has_mobile': max_alarm_db > 0,
            'mobile_count': len([s for s in all_signals if s.get('type') == 'MOBIEL']),
            'mobile_signals': all_signals,
            'mast_count': mast_count,
            'level': level,
            'learning': learning,
            'total_scans': self.total_scans,
            'strongest_db': max_alarm_db
        }
        return self.last_result

    def get_status_lines(self):
        r = self.last_result
        lines = []
        if r['learning']:
            lines.append(f"LEREN... ({r['total_scans']}/30)")
        else:
            lines.append("ACTIEF")
        lines.append(f"Masten: {r['mast_count']}")
        if r['mobile_signals']:
            for s in r['mobile_signals'][:3]:
                lines.append(f"  [{s['type']}] {s['freq_mhz']:.3f} {s['power_db']:.1f}dB")
        return lines
