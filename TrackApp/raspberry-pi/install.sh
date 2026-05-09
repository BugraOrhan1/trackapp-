#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REAL_USER="${SUDO_USER:-$(id -un)}"

sudo apt-get update
sudo apt-get install -y python3 python3-pip git build-essential libusb-1.0-0-dev bluez bluez-tools python3-rpi.gpio

python3 -m pip install numpy pydbus pycairo pygobject pyrtlsdr --break-system-packages

sudo tee /etc/systemd/system/trackapp-pi.service > /dev/null <<EOF
[Unit]
Description=TrackApp Raspberry Pi scanner and BLE service
After=network-online.target bluetooth.service
Wants=network-online.target bluetooth.service

[Service]
Type=simple
User=${REAL_USER}
Group=${REAL_USER}
WorkingDirectory=${ROOT_DIR}
ExecStart=/bin/bash ${ROOT_DIR}/start.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now trackapp-pi.service

echo "TrackApp Raspberry Pi dependencies installed."
