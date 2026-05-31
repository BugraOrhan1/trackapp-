#!/usr/bin/env bash
set -euo pipefail

echo "TrackApp Raspberry Pi dependencies installed."
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REAL_USER="${SUDO_USER:-$(id -un)}"

echo "Installing TrackApp for user=${REAL_USER} at ${ROOT_DIR}"

sudo apt-get update
sudo apt-get install -y python3 python3-pip git build-essential libusb-1.0-0-dev bluez bluez-tools python3-rpi.gpio

# Use system python's pip and tolerate pip upgrade failure on some images
sudo python3 -m pip install --upgrade pip setuptools || true

sudo python3 -m pip install numpy pydbus pycairo pygobject pyrtlsdr --break-system-packages

# Ensure the repo files are accessible by the real user and start script is executable
sudo chown -R "${REAL_USER}:${REAL_USER}" "${ROOT_DIR}"
sudo chmod -R u+rw "${ROOT_DIR}"
sudo chmod +x "${ROOT_DIR}/start.sh" || true

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
Environment=PYTHONUNBUFFERED=1
ExecStart=/bin/bash ${ROOT_DIR}/start.sh
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now trackapp-pi.service

echo "TrackApp Raspberry Pi installed and trackapp-pi.service enabled and started."
