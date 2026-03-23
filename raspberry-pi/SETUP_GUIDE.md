# Raspberry Pi Bluetooth Setup & Usage Guide (One-File Workflow)

Everything is now controlled by one script:

- `rpi_live_scanner.py`

Use `scanner` mode on Raspberry Pi, and `receiver` mode on your computer.

## Quick Start (3 Steps)

### Step 1: Pair Bluetooth on Raspberry Pi

```bash
ssh pi@<RPI_IP>
bash setup_bluetooth.sh
```

### Step 2: Start scanner on Raspberry Pi

```bash
# Default (same as scanner mode)
python3 rpi_live_scanner.py

# Explicit scanner mode
python3 rpi_live_scanner.py scanner --bt-port /dev/rfcomm0 --bt-baudrate 115200
```

Or as service:

```bash
sudo systemctl start rpi_scanner.service
sudo systemctl status rpi_scanner.service
```

### Step 3: Receive data on your computer

Windows:

```powershell
python rpi_live_scanner.py receiver --port COM5 --output-csv scanner_log.csv
```

Linux:

```bash
python3 rpi_live_scanner.py receiver --port /dev/ttyUSB0 --output-csv scanner_data.csv
```

macOS:

```bash
python3 rpi_live_scanner.py receiver --port /dev/cu.HC-05-DevB --output-csv scanner_data.csv
```

## Full Installation

1. Install dependencies on Raspberry Pi:

```bash
sudo apt-get update
sudo apt-get install -y bluez bluez-tools rfcomm python3-pip python3-dev
sudo apt-get install -y librtlsdr-dev rtl-sdr
python3 -m pip install --user numpy pyrtlsdr pyserial
```

2. Configure RTL-SDR permissions:

```bash
sudo tee /etc/udev/rules.d/rtlsdr.rules > /dev/null << EOF
SUBSYSTEMS=="usb", ATTRS{idVendor}=="0bda", ATTRS{idProduct}=="2832", MODE:="0666"
SUBSYSTEMS=="usb", ATTRS{idVendor}=="0bda", ATTRS{idProduct}=="2838", MODE:="0666"
EOF
sudo udevadm control --reload-rules
sudo udevadm trigger
```

3. Pair phone Bluetooth (automatic mode):

```bash
sudo hcitool scan

# Optional manual fallback only:
# sudo rfcomm bind /dev/rfcomm0 00:1A:2B:3C:4D:5E
```

4. Copy files and install service:

```bash
scp rpi_live_scanner.py pi@192.168.x.x:/home/pi/
scp rpi_scanner.service pi@192.168.x.x:/tmp/
ssh pi@192.168.x.x "sudo cp /tmp/rpi_scanner.service /etc/systemd/system/"
ssh pi@192.168.x.x "sudo systemctl daemon-reload && sudo systemctl enable rpi_scanner.service && sudo systemctl start rpi_scanner.service"

# If MAC is changed later
ssh pi@192.168.x.x "sudo systemctl restart rpi_scanner.service"
```

## Mode Options

Scanner mode:

```bash
python3 rpi_live_scanner.py scanner \
  --threshold-db 8.0 \
  --baseline-cycles 14 \
  --scan-delay-sec 0.1 \
  --sample-rate 2400000 \
  --samples-per-read 32768 \
  --bt-port /dev/rfcomm0
```

Optional auto bind:

```bash
python3 rpi_live_scanner.py scanner --auto-bind-mac 00:1A:2B:3C:4D:5E
```

Receiver mode:

```bash
python3 rpi_live_scanner.py receiver \
  --port /dev/ttyUSB0 \
  --baudrate 115200 \
  --output-csv data.csv
```

## Legacy Compatibility

`bt_receiver.py` still works, but it now forwards to:

```bash
python3 rpi_live_scanner.py receiver ...
```

## Troubleshooting

Boot starts scanner but no Bluetooth stream:

```bash
cat /etc/default/rpi_scanner
sudo systemctl status rpi_scanner.service
journalctl -u rpi_scanner.service -f
```

If needed, re-run:

```bash
bash setup_bluetooth.sh
```

`/dev/rfcomm0` missing:

```bash
sudo rfcomm bind /dev/rfcomm0 <MAC_ADDRESS>
sudo systemctl restart bluetooth
```

No data received:

```bash
sudo systemctl status rpi_scanner.service
journalctl -u rpi_scanner.service -f
rtl_test -t
```

High CPU:

```bash
python3 rpi_live_scanner.py scanner --sample-rate 1200000 --samples-per-read 16384 --scan-delay-sec 0.5
```

---

## Performance Tuning

### For Best Sensitivity
- Increase `threshold_db` to 12 or higher (fewer false alerts)
- Increase `occupancy_ema` decay to 0.01 (slower tracking)
- Use external LNA (Low Noise Amplifier)

### For Fastest Response
- Decrease `threshold_db` to 6 or lower
- Decrease `occupancy_ema` decay to 0.05 (faster tracking)
- Reduce `samples_per_read` to 16384
- Increase `sample_rate` if CPU allows

### Network Optimization (if sending over network)
- Send data in batches (every 5 cycles instead of every cycle)
- Compress JSON before transmission
- Use lower baud rate if using poor Bluetooth connection

---

## Remote Control / API

The scanner runs as a service and does not have remote control in this version. To add commands, modify main loop in `rpi_live_scanner.py` to listen on UDP/TCP socket.

Example incoming commands:
- `STOP` - Gracefully shutdown
- `RESTART` - Restart baseline
- `THRESHOLD:10.0` - Update detection threshold
- `GAIN:AUTO|MANUAL:XX` - Switch gain mode

---

## Data Analysis

### Parse CSV in Python
```python
import pandas as pd
df = pd.read_csv('scanner_data.csv')
alerts = df[df['alert'] == True]
print(f"Detected {len(alerts)} anomalies")
print(alerts[['timestamp', 'peak_freq_mhz', 'peak_db']])
```

### Plot Timeline
```python
import matplotlib.pyplot as plt
plt.figure(figsize=(12, 5))
plt.plot(df['cycle'], df['peak_db'])
plt.xlabel('Cycle')
plt.ylabel('Peak Power (dB)')
plt.title('RF Anomaly Scan Timeline')
plt.grid()
plt.savefig('timeline.png')
```

---

## Safety & Compliance

- **Frequency:** 380-400 MHz is typically TETRA/Emergency services in EU/UK
- **Regulations:** Check local RF usage laws before field deployment
- **Hardware:** Ensure adequate power supply (5V 2.5A minimum)
- **Temperature:** Monitor RPi temperature (run `vcgencmd measure_temp` on RPi)
- **Antenna:** Use appropriate UHF antenna; avoid strong transmitter fields

---

## Support

For issues or improvements, check logs:
```bash
# RPi logs
ssh pi@<RPI_IP> "journalctl -u rpi_scanner.service -n50"

# Receiver script
python3 bt_receiver.py /dev/ttyUSB0 2>&1 | tee receiver.log
```

