#!/bin/bash
# TrackApp Dependencies Installer

set -e

if [ "$EUID" -ne 0 ]; then
    echo "⚠️  Dit script moet als root draaien"
    echo "   Gebruik: sudo ./install.sh"
    exit 1
fi

echo "🔄 Package lijst updaten..."
apt update

echo "📦 System packages installeren..."
apt install -y python3-dbus python3-gi python3-gi-cairo gir1.2-gtk-3.0 bluetooth bluez

echo "📡 RTL-SDR packages (optioneel)..."
read -p "RTL-SDR support installeren? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    apt install -y rtl-sdr librtlsdr-dev python3-pip
    if [ ! -f /etc/modprobe.d/blacklist-rtl-sdr.conf ]; then
        echo 'blacklist dvb_usb_rtl28xxu' > /etc/modprobe.d/blacklist-rtl-sdr.conf
        echo "✅ RTL-SDR kernel driver blacklisted"
    fi
    echo "🐍 Python RTL-SDR library..."
    pip3 install pyrtlsdr numpy --break-system-packages
    echo "⚠️  REBOOT vereist voor RTL-SDR!"
    echo "   Na reboot: sudo ./start_ble.sh"
else
    echo "⏭️  RTL-SDR overgeslagen (server werkt zonder)"
fi

echo "🔧 Bluetooth service configureren..."
systemctl enable bluetooth
systemctl start bluetooth

echo "✅ Installatie compleet!"
echo ""
echo "Volgende stap:"
echo "  sudo ./start_ble.sh"
echo ""