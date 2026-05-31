#!/bin/bash
# ============================================
# TETRA Scanner Installer
# Voor Raspberry Pi Zero 2 W met RTL-SDR 2832
# ============================================

set -e

echo "=========================================="
echo "  TETRA SCANNER INSTALLER"
echo "  Raspberry Pi Zero 2 W + RTL-SDR"
echo "=========================================="
echo ""

if [ "$EUID" -ne 0 ]; then
	echo "FOUT: Voer dit script uit als root (sudo ./install.sh)"
	exit 1
fi

echo "[1/8] Controleren internetverbinding..."
if ! ping -c 1 google.com &> /dev/null; then
	echo "FOUT: Geen internetverbinding! Internet is nodig voor installatie."
	exit 1
fi
echo "  ✓ Internet beschikbaar"

echo "[2/8] Systeem updaten..."
apt-get update -y
apt-get upgrade -y
echo "  ✓ Systeem geüpdatet"

echo "[3/8] Benodigde pakketten installeren..."
apt-get install -y \
	python3 \
	python3-pip \
	python3-venv \
	python3-dev \
	rtl-sdr \
	librtlsdr-dev \
	libusb-1.0-0-dev \
	cmake \
	build-essential \
	git \
	pkg-config
echo "  ✓ Systeempakketten geïnstalleerd"

echo "[4/8] RTL-SDR drivers configureren..."
cat > /etc/modprobe.d/blacklist-rtlsdr.conf << 'EOF'
blacklist dvb_usb_rtl28xxu
blacklist rtl2832
blacklist rtl2830
blacklist dvb_usb_rtl2832u
blacklist dvb_usb_v2
blacklist dvb_core
EOF
echo "  ✓ DVB-T drivers geblacklist"

cat > /etc/udev/rules.d/20-rtlsdr.rules << 'EOF'
SUBSYSTEM=="usb", ATTRS{idVendor}=="0bda", ATTRS{idProduct}=="2832", GROUP="plugdev", MODE="0666"
SUBSYSTEM=="usb", ATTRS{idVendor}=="0bda", ATTRS{idProduct}=="2838", GROUP="plugdev", MODE="0666"
EOF
udevadm control --reload-rules
udevadm trigger
echo "  ✓ Udev rules aangemaakt"

echo "[5/8] Project directory configureren..."
PROJECT_DIR="/opt/tetra-scanner"
mkdir -p "$PROJECT_DIR"
mkdir -p "$PROJECT_DIR/logs"
mkdir -p "$PROJECT_DIR/data"

cp -f scanner.py "$PROJECT_DIR/"
cp -f config.py "$PROJECT_DIR/"
cp -f led_controller.py "$PROJECT_DIR/"
cp -f signal_analyzer.py "$PROJECT_DIR/"
cp -f calibrate.py "$PROJECT_DIR/"
cp -f requirements.txt "$PROJECT_DIR/"
echo "  ✓ Project bestanden gekopieerd"

echo "[6/8] Python dependencies installeren..."
cd "$PROJECT_DIR"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
echo "  ✓ Python dependencies geïnstalleerd"

echo "[7/8] Offline cache aanmaken..."
mkdir -p "$PROJECT_DIR/pip-cache"
source venv/bin/activate
pip download -r requirements.txt -d "$PROJECT_DIR/pip-cache" 2>/dev/null || true
deactivate
echo "  ✓ Offline cache aangemaakt"

echo "[8/8] Systemd service configureren..."
cp -f tetra-scanner.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable tetra-scanner.service
echo "  ✓ Service geïnstalleerd en ingeschakeld"

usermod -a -G gpio,plugdev pi 2>/dev/null || true

echo ""
echo "=========================================="
echo "  INSTALLATIE VOLTOOID!"
echo "=========================================="
echo ""
echo "  De scanner start automatisch bij boot."
echo "  Internet is NIET meer nodig."
echo ""
echo "  Commando's:"
echo "    Start:   sudo systemctl start tetra-scanner"
echo "    Stop:    sudo systemctl stop tetra-scanner"
echo "    Status:  sudo systemctl status tetra-scanner"
echo "    Logs:    sudo journalctl -u tetra-scanner -f"
echo ""
echo "  Kalibratie (optioneel):"
echo "    cd /opt/tetra-scanner"
echo "    sudo venv/bin/python3 calibrate.py"
echo ""
echo "  LED Pinnen:"
echo "    GPIO 22 = GROEN  (ver weg)"
echo "    GPIO 17 = GEEL   (middelmatig)"
echo "    GPIO 27 = ORANJE (middelmatig-dichtbij)"
echo "    GPIO 23 = ROOD   (heel dichtbij)"
echo ""
echo "  HERSTART nu de Pi:"
echo "    sudo reboot"
echo ""
