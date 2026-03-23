#!/bin/bash
# Quick Bluetooth pairing setup for Raspberry Pi RTL-SDR Scanner
# Run this on the Raspberry Pi to set up Bluetooth pairing

set -e

echo "======================================"
echo "RTL-SDR Scanner Bluetooth Setup"
echo "======================================"
echo ""

# Check if running as root for some operations
if [ "$EUID" -ne 0 ]; then 
    echo "Some operations require sudo. You may be prompted for password."
fi

# Install dependencies
echo "[1/4] Installing dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq bluez bluez-tools rfcomm python3-serial > /dev/null 2>&1
echo "✓ Dependencies installed"

# Get device MAC address from user
echo ""
echo "[2/4] Scanning for Bluetooth devices..."
echo "Make sure your receiving device (phone/laptop/computer) is in Pairing mode"
echo "Press ENTER to scan..."
read

sudo hcitool scan

echo ""
read -p "Enter MAC address of receiving device (e.g., 00:1A:2B:3C:4D:5E): " MAC_ADDR

# Validate MAC address format
if ! [[ $MAC_ADDR =~ ^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$ ]]; then
    echo "ERROR: Invalid MAC address format"
    exit 1
fi

# Bind RFCOMM
echo ""
echo "[3/4] Setting up Bluetooth serial port (/dev/rfcomm0)..."
sudo rfcomm bind /dev/rfcomm0 $MAC_ADDR > /dev/null 2>&1
sleep 1

if [ -e /dev/rfcomm0 ]; then
    echo "✓ Bluetooth serial port created: /dev/rfcomm0"
else
    echo "ERROR: Failed to create /dev/rfcomm0"
    echo "Try manual pairing:"
    echo "  sudo rfcomm bind /dev/rfcomm0 $MAC_ADDR"
    exit 1
fi

# Test connectivity
echo ""
echo "[4/4] Testing connection..."
if sudo test -w /dev/rfcomm0; then
    echo "✓ Serial port is writable"
else
    echo "WARNING: Serial port not writable. Run:"
    echo "  sudo chmod 666 /dev/rfcomm0"
fi

# Save MAC for auto bind on reboot via systemd service
echo ""
echo "Saving auto-start Bluetooth target..."
sudo tee /etc/default/rpi_scanner > /dev/null << EOF
BT_TARGET_MAC=$MAC_ADDR
EOF
echo "✓ Saved MAC to /etc/default/rpi_scanner"

# Setup service
echo ""
echo "======================================"
echo "Installation Summary"
echo "======================================"
echo "✓ Bluetooth paired with: $MAC_ADDR"
echo "✓ Serial port: /dev/rfcomm0"
echo ""
echo "Next steps:"
echo "1. Copy rpi_live_scanner.py to /home/pi/"
echo "2. Install scanner as systemd service:"
echo "   sudo cp rpi_scanner.service /etc/systemd/system/"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl enable rpi_scanner.service"
echo "   sudo systemctl start rpi_scanner.service"
echo "   # (Optional after service update)"
echo "   sudo systemctl restart rpi_scanner.service"
echo ""
echo "3. On receiving device, run:"
echo "   python3 rpi_live_scanner.py receiver --port /dev/ttyUSB0 --output-csv scanner_data.csv"
echo ""
