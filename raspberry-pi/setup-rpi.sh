#!/bin/bash

# ============================================
# TrackApp - Raspberry Pi Complete Setup
# ============================================
# Run this ONCE to set up everything

set -e  # Exit on any error

echo "╔════════════════════════════════════════════╗"
echo "║  TrackApp - Raspberry Pi Setup             ║"
echo "║  Complete automated installation           ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_ok() {
  echo -e "${GREEN}[OK]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# ============================================
# STEP 1: Check if running on Raspberry Pi
# ============================================
log_info "Checking system..."
if [ ! -f /proc/device-tree/model ]; then
  log_warn "Not running on Raspberry Pi (proceeding anyway)"
else
  DEVICE=$(cat /proc/device-tree/model)
  log_ok "Detected: $DEVICE"
fi

# Check user
CURRENT_USER=$(whoami)
if [ "$CURRENT_USER" == "root" ]; then
  log_error "Do NOT run this as root. Run as regular user (test or pi)"
  exit 1
fi
log_ok "Running as user: $CURRENT_USER"

# ============================================
# STEP 2: Update system and install dependencies
# ============================================
log_info "Updating system packages..."
sudo apt-get update
log_ok "System updated"

log_info "Installing required packages..."
sudo apt-get install -y \
  bluez \
  bluez-tools \
  python3-venv \
  python3-full \
  rtl-sdr \
  librtlsdr-dev \
  git

log_ok "Dependencies installed"

# ============================================
# STEP 3: Clone repository
# ============================================
REPO_DIR="$HOME/trackapp"
if [ -d "$REPO_DIR" ]; then
  log_warn "Directory $REPO_DIR already exists, pulling latest changes..."
  cd "$REPO_DIR"
  git pull origin main
else
  log_info "Cloning repository..."
  git clone https://github.com/BugraOrhan1/trackapp-.git "$REPO_DIR"
  cd "$REPO_DIR"
fi
log_ok "Repository ready at $REPO_DIR"

# ============================================
# STEP 4: Setup Python virtual environment
# ============================================
VENV_DIR="$HOME/.venvs/rfscan"
if [ -d "$VENV_DIR" ]; then
  log_warn "Virtual environment already exists, skipping creation"
else
  log_info "Creating Python virtual environment..."
  python3 -m venv "$VENV_DIR"
  log_ok "Virtual environment created"
fi

# ============================================
# STEP 5: Install Python packages
# ============================================
log_info "Installing Python packages in venv..."
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install "setuptools<82" numpy pyserial "pyrtlsdr==0.2.93"
log_ok "Python packages installed"

# Verify imports
log_info "Verifying Python imports..."
"$VENV_DIR/bin/python" -c "from rtlsdr import RtlSdr; import serial, numpy; print('✓ All imports OK')"
log_ok "Python environment verified"

# ============================================
# STEP 6: Copy scanner script
# ============================================
log_info "Setting up scanner script..."
SCANNER_SCRIPT="$REPO_DIR/raspberry-pi/rpi_live_scanner.py"
if [ ! -f "$SCANNER_SCRIPT" ]; then
  log_error "Scanner script not found at $SCANNER_SCRIPT"
  exit 1
fi
chmod +x "$SCANNER_SCRIPT"
log_ok "Scanner script ready at $SCANNER_SCRIPT"

# ============================================
# STEP 7: Create systemd service
# ============================================
log_info "Creating systemd service..."
SERVICE_FILE="/etc/systemd/system/rpi_scanner.service"
SERVICE_CONTENT="[Unit]
Description=TrackApp Raspberry Pi RTL-SDR Scanner with Bluetooth
After=bluetooth.target network.target

[Service]
Type=simple
User=$CURRENT_USER
SupplementaryGroups=dialout bluetooth
PermissionsStartOnly=true
EnvironmentFile=-/etc/default/rpi_scanner
WorkingDirectory=$REPO_DIR/raspberry-pi
ExecStartPre=/bin/bash -c '/usr/bin/rfcomm release /dev/rfcomm0 2>/dev/null || true'
ExecStartPre=/bin/bash -c 'if [ -n "${BT_TARGET_MAC}" ]; then /usr/bin/rfcomm bind /dev/rfcomm0 "${BT_TARGET_MAC}"; fi'
ExecStart=$VENV_DIR/bin/python $SCANNER_SCRIPT
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
"

echo "$SERVICE_CONTENT" | sudo tee "$SERVICE_FILE" > /dev/null
sudo chmod 644 "$SERVICE_FILE"
log_ok "Systemd service created at $SERVICE_FILE"

# Create /etc/default/rpi_scanner when a paired/connected device is found.
PAIR_OUT=$(bluetoothctl devices Paired 2>/dev/null || true)
if [ -z "$PAIR_OUT" ]; then
  PAIR_OUT=$(bluetoothctl devices Connected 2>/dev/null || true)
fi

BT_TARGET_MAC=$(echo "$PAIR_OUT" | awk '/^Device /{print $2; exit}')
if [ -n "$BT_TARGET_MAC" ]; then
  echo "BT_TARGET_MAC=$BT_TARGET_MAC" | sudo tee /etc/default/rpi_scanner > /dev/null
  log_ok "Saved BT_TARGET_MAC to /etc/default/rpi_scanner: $BT_TARGET_MAC"
else
  log_warn "No paired/connected Bluetooth device found. Set BT_TARGET_MAC in /etc/default/rpi_scanner manually."
fi

# ============================================
# STEP 8: Enable service
# ============================================
log_info "Enabling service auto-start..."
sudo systemctl daemon-reload
sudo systemctl enable rpi_scanner.service
log_ok "Service enabled for auto-start"

# ============================================
# STEP 9: Add user to dialout group
# ============================================
log_info "Configuring permissions..."
if groups "$CURRENT_USER" | grep -q dialout; then
  log_ok "User already in dialout group"
else
  log_info "Adding user to dialout group (requires logout to take effect)..."
  sudo usermod -aG dialout "$CURRENT_USER"
  log_warn "You must log out and back in for group changes to take effect"
fi

# ============================================
# STEP 10: Start service
# ============================================
log_info "Starting scanner service..."
sudo systemctl restart rpi_scanner.service
sleep 2

if sudo systemctl is-active --quiet rpi_scanner.service; then
  log_ok "Service started successfully"
else
  log_error "Service failed to start. Check logs with: journalctl -u rpi_scanner.service -n 50"
  sudo systemctl status rpi_scanner.service
  exit 1
fi

# ============================================
# STEP 11: Display status and next steps
# ============================================
echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  ✅ Setup Complete!                       ║"
echo "╚════════════════════════════════════════════╝"
echo ""

echo "📊 Service Status:"
sudo systemctl status rpi_scanner.service --no-pager

echo ""
echo "📋 Recent Logs:"
journalctl -u rpi_scanner.service -n 10 --no-pager

echo ""
echo "🔗 Next Steps:"
echo "  1. Pair your phone with Bluetooth:"
echo "     bluetoothctl"
echo "     scan on"
echo "     pair XX:XX:XX:XX:XX:XX"
echo "     trust XX:XX:XX:XX:XX:XX"
echo "     exit"
echo ""
echo "  2. Bind Bluetooth device:"
echo "     MAC=\$(bluetoothctl devices Paired | head -n1 | awk '{print \$2}')"
echo "     sudo rfcomm bind /dev/rfcomm0 \"\$MAC\""
echo ""
echo "  3. Check data flow:"
echo "     cat /dev/rfcomm0"
echo ""
echo "  4. View live logs:"
echo "     journalctl -u rpi_scanner.service -f"
echo ""
echo "  5. Open web app on your phone"
echo ""

echo "📝 Useful Commands:"
echo "  • Start service:   sudo systemctl start rpi_scanner.service"
echo "  • Stop service:    sudo systemctl stop rpi_scanner.service"
echo "  • Restart service: sudo systemctl restart rpi_scanner.service"
echo "  • View logs:       journalctl -u rpi_scanner.service -f"
echo "  • Check status:    sudo systemctl status rpi_scanner.service"
echo ""

if groups "$CURRENT_USER" | grep -q dialout; then
  log_ok "All permissions correct - you're ready to go! 🚀"
else
  log_warn "⚠️  Please log out and back in for dialout group permissions to take effect"
  echo "  After logging back in, run: sudo systemctl restart rpi_scanner.service"
fi
