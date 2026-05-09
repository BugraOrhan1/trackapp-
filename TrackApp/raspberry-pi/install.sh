#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv git build-essential libusb-1.0-0-dev bluez bluez-tools python3-rpi.gpio

python3 -m pip install --upgrade pip
python3 -m pip install numpy pydbus pycairo pygobject
python3 -m pip install pyrtlsdr

echo "TrackApp Raspberry Pi dependencies installed."
