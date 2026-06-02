# 📡 TrackApp - RF Signal Scanner
## Eigen gebouwde Target Blue Eye alternatief
### Versie 2.0 - Juni 2026

---

## WAT IS DIT?

TrackApp is een zelfgebouwde RF (Radio Frequentie) scanner.
Hij scant het frequentiebereik 380-400 MHz.
Dat is de band waar in Nederland C2000 hulpdiensten op werken.

De scanner meet ALLEEN de signaalsterkte.
Hij decodeert NIETS - hij luistert niet mee naar gesprekken.

Op basis van de sterkte gaan LED lampjes branden.
Hoe sterker het signaal, hoe meer LEDs er branden.

Het systeem heeft een Smart Analyzer die leert welke
signalen van vaste masten komen. Die worden genegeerd.
Alleen nieuwe/wisselende signalen activeren de LEDs.

---

## HARDWARE

| Onderdeel | Type |
|-----------|------|
| Computer | Raspberry Pi Zero 2 W |
| Radio | RTL-SDR 2832 USB dongle |
| LEDs | 4x (groen/geel/oranje/rood) |
| Weerstanden | 4x 330 Ohm |
| SD kaart | 32GB Class 10 |

---

## BEDRADING

### GPIO Pin Schema (BCM)
GPIO 17 ──[330Ω]──[🟢 GROEN ]──GND
GPIO 27 ──[330Ω]──[🟡 GEEL ]──GND
GPIO 22 ──[330Ω]──[🟠 ORANJE]──GND
GPIO 23 ──[330Ω]──[🔴 ROOD ]──GND
USB ──── [RTL-SDR Dongle] ──── [Antenne]

text


### Pin Tabel

| LED | Kleur | GPIO | Fysieke Pin |
|-----|-------|------|-------------|
| Groen | 🟢 | 17 | 11 |
| Geel | 🟡 | 27 | 13 |
| Oranje | 🟠 | 22 | 15 |
| Rood | 🔴 | 23 | 16 |

---

## INSTALLATIE

### Stap 1: Raspberry Pi OS

Gebruik Raspberry Pi Imager:
- OS: Raspberry Pi OS Lite (64-bit)
- Hostname: test
- Username: test
- Enable SSH
- WiFi configureren

### Stap 2: SSH naar Pi

```bash
ssh test@test.local
Stap 3: Code downloaden
Bash

cd ~
sudo apt update
sudo apt install -y git
git clone https://github.com/BugraOrhan1/trackapp-.git
cd trackapp-/TrackApp/raspberry-pi
chmod +x install.sh
sudo ./install.sh
Stap 4: Fixes
Bash

# pyrtlsdr downgrade
sudo /opt/tetra-scanner/venv/bin/pip uninstall pyrtlsdr -y
sudo /opt/tetra-scanner/venv/bin/pip install pyrtlsdr==0.3.0

# pkg_resources patch
RTLSDR_INIT=$(find /opt/tetra-scanner/venv -name "__init__.py" -path "*/rtlsdr/*" | head -1)
sudo sed -i 's|^import pkg_resources|try:\n    import pkg_resources\nexcept ImportError:\n    import importlib.metadata as pkg_resources|' "$RTLSDR_INIT"
Stap 5: Kalibreren
Bash

sudo systemctl stop tetra-scanner
cd /opt/tetra-scanner
sudo venv/bin/python3 calibrate.py
# Pas drempels aan in config.py met de aanbevolen waarden
sudo systemctl start tetra-scanner
Stap 6: Reboot
Bash

sudo reboot
LED GEDRAG
Normaal
LED Status	Betekenis
Groen knippert kort (elke 3 sec)	Systeem leeft, geen signaal
Alles uit	Scanner gestopt of crashed
Groen vast aan	Zwak mobiel signaal
Groen + Geel	Middelmatig signaal
Groen + Geel + Oranje	Sterk signaal
Groen + Geel + Oranje + Rood	Zeer sterk signaal
Alle 4 flashen	BURST detectie
Pulserend	BEWEGING detectie
Opstart
Wat je ziet	Betekenis
Knight Rider effect	Scanner start op
2x groen knippert	Opstart compleet
Rood knippert 5x	Init fout
Rood knippert 10x	RTL-SDR niet gevonden
Foutdiagnose
Symptoom	Probleem	Oplossing
Geen heartbeat	Scanner crashed	Reboot
Rood blijft knipperen	RTL-SDR fout	Check USB
Alle LEDs altijd aan	Drempels te laag	Kalibreer
Geen LEDs ooit aan	Drempels te hoog	Kalibreer
LEDs flikkeren snel	Gain probleem	Check config
SMART ANALYZER
Hoe werkt het
Eerste 20 scans = leerperiode.
Daarna: slim filteren actief.

Detectie Types
Type	Wat
MAST	Vast basisstation (genegeerd)
MOBIEL	Wisselend signaal
BURST	Plotseling signaal
BEWEGING	Naderend signaal
Strike Systeem
7 stabiele metingen → MAST
Wisselende metingen → strikes omlaag
0 strikes → weer MOBIEL
LED Drempels (Smart mode)
dB	LED
28+	🟢 Groen
38+	🟡 + Geel
48+	🟠 + Oranje
60+	🔴 + Rood
BESTANDEN
text

/opt/tetra-scanner/
├── scanner.py          ← Hoofdprogramma
├── config.py           ← Instellingen
├── signal_analyzer.py  ← RTL-SDR + FFT
├── smart_analyzer.py   ← Slim brein
├── led_controller.py   ← LED + heartbeat
├── web.py              ← Webpagina
├── calibrate.py        ← Kalibratie tool
├── data/               ← CSV + masten
├── logs/               ← Log bestanden
└── venv/               ← Python env
SERVICES
Service	Functie
tetra-scanner	De scanner
trackapp-web	Webpagina
wifi-dual	Hotspot + WiFi
tetra-health.timer	Health check (60s)
watchdog	Hardware watchdog
tailscaled	Tailscale VPN
Commando's
Bash

# Status
sudo systemctl status tetra-scanner

# Logs
sudo journalctl -u tetra-scanner -f

# Restart
sudo systemctl restart tetra-scanner

# Stop
sudo systemctl stop tetra-scanner
WIFI EN HOTSPOT
Dual Mode
Pi maakt twee interfaces:

wlan0 = thuis WiFi (internet)
uap0 = TrackApp hotspot
Beide werken tegelijk.

TrackApp Hotspot
Setting	Value
SSID	TrackApp
Password	TrackApp2026
IP	192.168.50.1
Channel	6
Webpagina
Thuis: http://test.local:8080
Hotspot: http://192.168.50.1:8080
Tailscale: http://100.107.246.20:8080
TAILSCALE
Bash

# Setup eenmalig
sudo tailscale up --ssh

# IP opvragen
tailscale ip -4

# Status
tailscale status
Werkt alleen met internet.

HANDIGE COMMANDO'S
Logs bekijken
Bash

sudo journalctl -u tetra-scanner -f
sudo journalctl -u tetra-scanner -n 50
sudo journalctl -u tetra-scanner --since '30 min ago'
Drempels aanpassen
Bash

sudo sed -i 's/^THRESHOLD_GREEN.*=.*/THRESHOLD_GREEN = 47.2/' /opt/tetra-scanner/config.py
sudo systemctl restart tetra-scanner
Handmatig testen
Bash

sudo systemctl stop tetra-scanner
cd /opt/tetra-scanner
sudo env TERM=xterm ./venv/bin/python3 scanner.py
# Ctrl+C om te stoppen
sudo systemctl start tetra-scanner
CSV data bekijken
Bash

ls -t /opt/tetra-scanner/data/signal_data_*.csv | head -5
tail -20 $(ls -t /opt/tetra-scanner/data/signal_data_*.csv | head -1)
Bekende masten
Bash

cat /opt/tetra-scanner/data/known_masts.json
WiFi checks
Bash

iwgetid -r
ip -4 addr show
sudo iw dev uap0 station dump
Updates naar GitHub
Bash

cd ~/trackapp-/TrackApp/raspberry-pi
sudo cp /opt/tetra-scanner/*.py .
sudo chown -R test:test .
cd ~/trackapp-
git add .
git commit -m "Update: beschrijving"
git push
PROBLEMEN OPLOSSEN
Scanner start niet
Bash

sudo systemctl status tetra-scanner
sudo journalctl -u tetra-scanner -n 50
sudo systemctl restart tetra-scanner
RTL-SDR niet gevonden
Bash

lsusb | grep -i rtl
sudo reboot
pyrtlsdr error
Bash

/opt/tetra-scanner/venv/bin/python3 -c "import rtlsdr; print('OK')"
sudo /opt/tetra-scanner/venv/bin/pip install pyrtlsdr==0.3.0
Alle LEDs branden
Oorzaak: drempels te laag. Kalibreer opnieuw.

Geen LEDs ooit aan
Oorzaak: drempels te hoog OF geen signaal. Test met:

Bash

sudo systemctl stop tetra-scanner
python3 << 'TESTEOF'
import RPi.GPIO as GPIO
import time
GPIO.setmode(GPIO.BCM)
for pin in [17, 27, 22, 23]:
    GPIO.setup(pin, GPIO.OUT)
    GPIO.output(pin, GPIO.HIGH)
    time.sleep(1)
    GPIO.output(pin, GPIO.LOW)
GPIO.cleanup()
TESTEOF
sudo systemctl start tetra-scanner
Pi reageert niet
Wacht 2 minuten (watchdog herstart)
Stroom eraf, 10 sec wachten, weer erop
Als niets: SD kaart check
SD vol
Bash

df -h
sudo rm /opt/tetra-scanner/data/signal_data_2026050*.csv
sudo journalctl --vacuum-time=3d
TECHNISCHE DETAILS
Scan instellingen
Bereik: 380-400 MHz
Stap: 25 kHz
Frequenties: 801
Sample rate: 1.024 MHz
Samples: 65536
Smart Analyzer
Parameter	Waarde
Stable strikes nodig	7
Max strikes	25
History length	60
Std stable threshold	2.5 dB
Movement threshold	4.0 dB
Location overlap	30%
Learning scans	20
LED Drempels Smart Mode
text

28+ dB → Groen
38+ dB → Geel
48+ dB → Oranje
60+ dB → Rood
CONFIG.PY INSTELLINGEN
Python

FREQ_START_MHZ = 380.0
FREQ_END_MHZ = 400.0
FREQ_STEP_MHZ = 0.025
SAMPLE_RATE = 1024000
GAIN = 35.0
PPM_CORRECTION = 0

LED_GREEN = 17
LED_YELLOW = 27
LED_ORANGE = 22
LED_RED = 23

THRESHOLD_GREEN = 47.2
THRESHOLD_YELLOW = 53.2
THRESHOLD_ORANGE = 61.2
THRESHOLD_RED = 71.2

SCAN_INTERVAL = 0.5
SHOW_TERMINAL_OUTPUT = False
LOG_LEVEL = "INFO"
GEBRUIK IN DE AUTO
Setup
Pi op 5V USB lader
RTL-SDR in USB DATA poort
Antenne opzetten
2-3 minuten wachten
Wat je ziet
Knight Rider = opstarten
2x groen flash = klaar
Groen knippert = alles werkt
LEDs branden = actief signaal
Tips
Antenne: externe magneetvoet op dak = 10x beter
Positie: niet achter metaal
Kalibreer op locatie waar je het meest bent
Gain 35 dB is meestal goed
Stroom: goede 5V voeding
LOKALE WIJZIGINGEN LOG
#	Wijziging	Bestand
1	Vaste Gain (35.0)	config.py
2	PPM correctie fix	signal_analyzer.py
3	pyrtlsdr 0.3.0	venv
4	pkg_resources patch	rtlsdr/init.py
5	Smart Analyzer v3.0	smart_analyzer.py
6	Ultra LED Controller	led_controller.py
7	Dual Mode WiFi	wifi-dual.sh
8	Web Interface	web.py
9	Health Check	tetra-health
10	Hardware Watchdog	/etc/watchdog.conf
11	Tailscale	systeem
12	Drempels gekalibreerd	config.py
13	DVB-T blacklist	modprobe.d
14	GPIO pinnen	config.py
VERSIE INFO
Versie: 2.0
Datum: Juni 2026
Maker: BugraOrhan1
Hardware: Raspberry Pi Zero 2 W + RTL-SDR 2832
OS: Raspberry Pi OS Debian Trixie 64-bit
Python: 3.13
JURIDISCHE WAARSCHUWING
Het afluisteren van hulpdiensten (C2000/TETRA) is in
Nederland illegaal volgens de Telecommunicatiewet
(Art. 139c Wetboek van Strafrecht).

Dit project is ALLEEN voor educatieve doeleinden.
Het meet ALLEEN signaalsterkte.
Het decodeert GEEN communicatie.
Het luistert NIET mee met gesprekken.

Gebruik conform lokale wetgeving.
De maker is niet verantwoordelijk voor misbruik.

LINKS
Repository: https://github.com/BugraOrhan1/trackapp-
Raspberry Pi Imager: https://www.raspberrypi.com/software/
Win32 Disk Imager: https://sourceforge.net/projects/win32diskimager/
Tailscale: https://tailscale.com
RTL-SDR: https://www.rtl-sdr.com
EINDE README
