#!/bin/bash
# TrackApp BLE Server Starter Script

echo "=================================="
echo "🚀 Starting TrackApp BLE Server"
echo "=================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Dit script moet als root draaien"
    echo "   Gebruik: sudo ./start_ble.sh"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"


# Check if Python script exists
if [ ! -f "ble_server.py" ]; then
    echo "❌ ble_server.py niet gevonden!"
    exit 1
fi

# Check Bluetooth status
echo "🔍 Checking Bluetooth status..."
systemctl status bluetooth | grep -q "active (running)"
if [ $? -ne 0 ]; then
    echo "⚠️  Bluetooth service is niet actief, starten..."
    systemctl start bluetooth
    sleep 2
fi

# Enable Bluetooth adapter
echo "📡 Enabling Bluetooth adapter..."
hciconfig hci0 up

# Make device discoverable
echo "🔓 Making device discoverable..."
bluetoothctl <<EOF
power on
discoverable on
EOF

echo ""
echo "✅ Bluetooth gereed"
echo ""


# Start Python server
echo "🐍 BLE Server starten..."
echo ""
if [ -f ".venv/bin/python" ]; then
    .venv/bin/python ble_server.py
else
    python3 ble_server.py
fi

echo ""
echo "👋 Server gestopt"
