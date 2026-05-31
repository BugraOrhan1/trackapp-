# TETRA Signal Scanner

## Signaalsterkte scanner voor 380-400 MHz met LED indicatie

### Hardware
- Raspberry Pi Zero 2 W
- RTL-SDR 2832 USB dongle
- 4x LED + weerstanden (330Ω)

### LED Aansluiting (BCM nummering)
GPIO 22 ──[330Ω]──[GROENE LED]──GND (ver weg)
GPIO 17 ──[330Ω]──[GELE LED]───GND (middelmatig)
GPIO 27 ──[330Ω]──[ORANJE LED]─GND (dichterbij)
GPIO 23 ──[330Ω]──[RODE LED]───GND (heel dichtbij)

### Installatie

1. Sluit de Pi aan op internet (WiFi)
2. Kopieer alle bestanden naar de Pi
3. Voer uit:

```bash
chmod +x install.sh
sudo ./install.sh
sudo reboot
```

Na herstart start de scanner automatisch. Geen internet meer nodig.

### Kalibratie

```bash
cd /opt/tetra-scanner
sudo venv/bin/python3 calibrate.py
```

### Commando's

```bash
sudo systemctl start tetra-scanner
sudo systemctl stop tetra-scanner
sudo systemctl restart tetra-scanner
sudo systemctl status tetra-scanner
sudo journalctl -u tetra-scanner -f
```

### Drempelwaarden aanpassen

Bewerk `/opt/tetra-scanner/config.py` en herstart de service.

### Hoe het werkt

- De RTL-SDR scant continu het 380-400 MHz bereik
- Per frequentie wordt het vermogen gemeten
- Een adaptieve ruisvloer filtert constante signalen (masten)
- Alleen signalen boven het normale niveau activeren LEDs
- Het systeem past zich automatisch aan de omgeving aan

### Bestanden

- scanner.py - Hoofdprogramma
- config.py - Alle instellingen
- led_controller.py - LED aansturing
- signal_analyzer.py - Signaal analyse
- calibrate.py - Kalibratie tool
- install.sh - Installatie script

---

## Schema voor LED bedrading

```text
Raspberry Pi Zero 2 W
┌─────────┐
│         │
│ GPIO22 ├───[330Ω]───[GROEN]───┐
│ GPIO17 ├───[330Ω]───[GEEL ]───┤
│ GPIO27 ├───[330Ω]───[ORANJE]──┤
│ GPIO23 ├───[330Ω]───[ROOD ]──┤
│ GND    ├────────────────────────┘
│ USB    ├───[RTL-SDR 2832 Dongle]
└─────────┘
```

### Installatieproces

```bash
# 1. Download/kopieer alle bestanden naar Pi
# (via SCP, USB stick, of git)

# 2. Op de Pi (via SSH of terminal):
cd /pad/naar/tetra-scanner/
chmod +x install.sh
sudo ./install.sh

# 3. Herstart
sudo reboot

# 4. Na herstart - scanner draait automatisch!
# Check status:
sudo systemctl status tetra-scanner

# 5. Optioneel: kalibreer voor jouw locatie
cd /opt/tetra-scanner
sudo venv/bin/python3 calibrate.py
```

### Het systeem

- Start automatisch bij elke boot
- Werkt offline - geen internet nodig na installatie
- Past zich aan aan nabije masten via adaptieve ruisvloer
- Groen = signaal gedetecteerd maar ver weg
- Geel = middelmatige signaalsterkte
- Oranje = behoorlijk sterk signaal
- Rood = zeer sterk signaal (bron dichtbij)
- Alle LEDs uit = geen opmerkelijk signaal boven achtergrondniveau
