# 🔧 TrackApp Raspberry Pi Server

## 🚀 Quick Start

```bash
# 1. Installeer dependencies
sudo ./install.sh

# 2. Start BLE server
sudo ./start_ble.sh
```

## 📡 RTL-SDR (Optioneel)
- Hardware: RTL2832U USB Dongle
- Frequentie: 380-400 MHz

### Setup
- Sluit RTL-SDR aan op Raspberry Pi
- Run: `sudo ./install.sh` (kies 'y' voor RTL support)
- Reboot: `sudo reboot`
- Test: `rtl_test`

### Troubleshooting
- RTL-SDR niet gevonden:
  ```bash
  lsusb | grep RTL
  # Moet een Realtek device tonen
  ```
- Permission denied:
  ```bash
  sudo usermod -a -G plugdev $USER
  # Logout en login
  ```

## 🔧 Files
- ble_tracker_server_dbus.py - Main BLE server
- rtl_scanner.py - RTL-SDR scanner
- install.sh - Dependency installer
- start_ble.sh - Server starter

## 📊 Features
- ✅ BLE GATT Server
- ✅ Location tracking
- ✅ RTL-SDR proximity detection
- ✅ Route history
- ✅ Web Bluetooth compatible

## 🆘 Help
- Server start niet:
  ```bash
  sudo systemctl status bluetooth
  sudo hciconfig hci0 up
  ```
- Python errors:
  ```bash
  python3 -c "import dbus; import gi; print('OK')"
  ```
