#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update
sudo apt-get install -y python3-full python3-venv git build-essential libusb-1.0-0-dev bluez bluez-tools python3-rpi.gpio

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$ROOT_DIR/.venv"

python3 -m venv --system-site-packages "$VENV_DIR"
"$VENV_DIR/bin/python" -m pip install --upgrade pip
"$VENV_DIR/bin/pip" install numpy pydbus pycairo pygobject pyrtlsdr

if [ -f trackapp-pi.service ]; then
	sudo cp trackapp-pi.service /etc/systemd/system/trackapp-pi.service
	sudo systemctl daemon-reload
	sudo systemctl enable trackapp-pi.service
fi

echo "TrackApp Raspberry Pi dependencies installed."
