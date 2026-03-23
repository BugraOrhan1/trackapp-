# Raspberry Pi - Bluetooth Communication Setup Guide

## Overview
This guide explains how to establish Bluetooth communication between your Raspberry Pi RTL-SDR scanner and the web app on your phone.

---

## Step 1: Verify Bluetooth Pairing

Check if your phone is already paired with the Pi:

```bash
bluetoothctl paired-devices
```

**Expected output:**
```
Device XX:XX:XX:XX:XX:XX Phone-Name
```

### If your phone is NOT paired:

```bash
bluetoothctl
scan on
# Wait for your phone to appear in the list
# Example: Device XX:XX:XX:XX:XX:XX Phone-Name

pair XX:XX:XX:XX:XX:XX
# Confirm pairing on your phone

trust XX:XX:XX:XX:XX:XX  # Optional: auto-connect in future
exit
```

---

## Step 2: Bind rfcomm Device

The scanner uses `/dev/rfcomm0` to send data over Bluetooth.

### Automatic binding (recommended):

```bash
# Get the MAC address of your paired phone
MAC=$(bluetoothctl paired-devices | head -n1 | awk '{print $2}')
echo "Using MAC: $MAC"

# Bind rfcomm port
sudo rfcomm bind /dev/rfcomm0 "$MAC"

# Verify it worked
ls -la /dev/rfcomm0
# Should show: crw-rw---- 1 root dialout ... /dev/rfcomm0
```

### If binding fails with "Device or resource busy":

```bash
# Release existing binding first
sudo rfcomm release /dev/rfcomm0

# Then bind again
sudo rfcomm bind /dev/rfcomm0 "$MAC"
```

---

## Step 3: Check Scanner Service Status

The `rpi_scanner.service` should be running to send data over Bluetooth:

```bash
# Check status
sudo systemctl status rpi_scanner.service

# Should show: Active: active (running)
```

### If NOT running:

```bash
# Start it
sudo systemctl start rpi_scanner.service

# Check status
sudo systemctl status rpi_scanner.service

# View recent logs
journalctl -u rpi_scanner.service -n 30 --no-pager

# Look for:
# "Starting baseline RF scan"
# "Entering live monitor mode"
# "Sending Bluetooth data"
```

### Common Issues:

**"No module named rtlsdr"**
- Your venv is not set up. Follow `SETUP_GUIDE.md` to create the Python virtual environment.

**"Permission denied /dev/rfcomm0"**
- Your user needs to be in the `dialout` group:
  ```bash
  sudo usermod -aG dialout test
  # Log out and back in for changes to take effect
  ```

---

## Step 4: Test Data Flow

### Option A: Direct read from rfcomm

```bash
# Read raw data (Ctrl+C to stop)
sudo cat /dev/rfcomm0

# Should show JSON lines like:
# {"freq": 433.92, "signal_db": -45.2, "timestamp": 1234567890}
```

### Option B: Monitor with timeout

```bash
# Read for 10 seconds then stop
timeout 10 sudo cat /dev/rfcomm0
```

---

## Step 5: Connect Web App on Phone

1. **Enable Bluetooth** on your phone
2. **Open the web app** in your browser:
   - If running locally: `http://localhost:3000`
   - If on Netlify: Use your Netlify app URL
3. **Check console** for connection status:
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for "Bluetooth connected" or "Reading from /dev/rfcomm0"

### Troubleshooting Web App Connection:

**"rfcomm0 not found"**
- The device wasn't bound. Go back to Step 2 and bind it again.

**"No data arriving"**
- Check if the scanner service is running (Step 3)
- Check if Bluetooth is enabled on your phone
- Check if the rfcomm device has data: `sudo cat /dev/rfcomm0`

**"App shows empty circle"**
- Data is arriving but signal is weak
- Move phone and Pi closer together, or adjust location near antenna

---

## Complete Startup Sequence

Run this every time you restart your Pi:

```bash
#!/bin/bash
# complete-startup.sh

echo "=== Bluetooth Communication Setup ==="

# Step 1: Get paired phone MAC
MAC=$(bluetoothctl paired-devices | head -n1 | awk '{print $2}')
if [ -z "$MAC" ]; then
  echo "❌ No paired devices found. Pair your phone first."
  exit 1
fi
echo "✅ Found paired device: $MAC"

# Step 2: Release old rfcomm binding
sudo rfcomm release /dev/rfcomm0 2>/dev/null || true

# Step 3: Bind new rfcomm
echo "Binding rfcomm..."
sudo rfcomm bind /dev/rfcomm0 "$MAC"
if [ ! -e /dev/rfcomm0 ]; then
  echo "❌ Failed to bind rfcomm"
  exit 1
fi
echo "✅ rfcomm0 bound"

# Step 4: Start scanner service
echo "Starting scanner service..."
sudo systemctl restart rpi_scanner.service
sleep 2

# Step 5: Check status
if sudo systemctl is-active --quiet rpi_scanner.service; then
  echo "✅ Scanner service is running"
else
  echo "❌ Scanner service failed to start"
  sudo systemctl status rpi_scanner.service
  exit 1
fi

# Step 6: Verify data flow
echo "Testing data flow..."
timeout 3 sudo cat /dev/rfcomm0 > /tmp/bt_test.txt 2>&1
if grep -q "signal_db" /tmp/bt_test.txt; then
  echo "✅ Data flowing correctly"
  head -n 2 /tmp/bt_test.txt
else
  echo "⚠️  No data detected yet (scanner may still be initializing)"
fi

echo ""
echo "=== Ready! Open your web app on your phone ==="
```

Save this as `~/complete-startup.sh` and run:
```bash
chmod +x ~/complete-startup.sh
~/complete-startup.sh
```

---

## Monitoring and Debugging

### Real-time logs:

```bash
# Watch scanner logs in real-time
journalctl -u rpi_scanner.service -f

# Watch with timestamp
journalctl -u rpi_scanner.service -f --no-pager
```

### Check Bluetooth status:

```bash
# List all Bluetooth devices
bluetoothctl devices

# Show connection info
bluetoothctl info $(bluetoothctl paired-devices | head -n1 | awk '{print $2}')

# Check rfcomm status
sudo rfcomm show
```

### Restart everything:

```bash
# Full reset
sudo systemctl stop rpi_scanner.service
sudo rfcomm release /dev/rfcomm0
sleep 1

# Then run the startup script again
~/complete-startup.sh
```

---

## Summary

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `bluetoothctl paired-devices` | Verify phone is paired |
| 2 | `sudo rfcomm bind /dev/rfcomm0 MAC` | Connect Bluetooth serial |
| 3 | `sudo systemctl status rpi_scanner.service` | Check scanner running |
| 4 | `sudo cat /dev/rfcomm0` | Test data flow |
| 5 | Open web app | Receive data on phone |

Once complete, you should see live signal data on your phone's web app! 🎉

