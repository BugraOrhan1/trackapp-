#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update
sudo apt-get install -y python3 python3-pip git build-essential libusb-1.0-0-dev bluez bluez-tools python3-rpi.gpio

python3 -m pip install --upgrade pip --break-system-packages
python3 -m pip install numpy pydbus pycairo pygobject pyrtlsdr --break-system-packages

if [ -f trackapp-pi.service ]; then
	sudo cp trackapp-pi.service /etc/systemd/system/trackapp-pi.service
	sudo systemctl daemon-reload
	sudo systemctl enable trackapp-pi.service
fi

echo "TrackApp Raspberry Pi dependencies installed."
