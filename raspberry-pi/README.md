# Raspberry Pi RTL-SDR + Bluetooth (All-in-One)

Everything is now in one file:

- `rpi_live_scanner.py`

This single script has two modes:

- `scanner` mode: Raspberry Pi RTL-SDR scan + Bluetooth JSON transmit
- `receiver` mode: Laptop/PC serial Bluetooth receive + CSV logging

Running with no subcommand defaults to scanner mode for service compatibility.

## Quick Start

### 1. Install packages on Raspberry Pi

```bash
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-dev
sudo apt-get install -y librtlsdr-dev rtl-sdr
sudo apt-get install -y bluez bluez-tools rfcomm
python3 -m pip install --user numpy pyrtlsdr pyserial
```

### 2. Pair phone with Raspberry Pi Bluetooth

```bash
sudo hcitool scan

# Optional manual bind test (not required for normal use)
# sudo rfcomm bind /dev/rfcomm0 00:1A:2B:3C:4D:5E
```

### 3. Start scanner on Raspberry Pi

```bash
python3 rpi_live_scanner.py
```

Equivalent explicit command:

```bash
python3 rpi_live_scanner.py scanner --bt-port /dev/rfcomm0 --bt-baudrate 115200
```

### 4. Receive data on laptop/pc (same file)

Linux/macOS:

```bash
python3 rpi_live_scanner.py receiver --port /dev/ttyUSB0 --output-csv scanner_data.csv
```

Windows:

```bash
python rpi_live_scanner.py receiver --port COM5 --output-csv scanner_data.csv
```

## Important Commands

### Scanner mode options

```bash
python3 rpi_live_scanner.py scanner \
   --threshold-db 8.0 \
   --baseline-cycles 14 \
   --scan-delay-sec 0.1 \
   --sample-rate 2400000 \
   --samples-per-read 32768
```

Auto bind RFCOMM (optional):

```bash
python3 rpi_live_scanner.py scanner --auto-bind-mac 00:1A:2B:3C:4D:5E
```

### Receiver mode options

```bash
python3 rpi_live_scanner.py receiver \
   --port /dev/ttyUSB0 \
   --baudrate 115200 \
   --output-csv scanner_data.csv
```

### Logging options

```bash
python3 rpi_live_scanner.py --log-file /home/pi/rpi_scanner.log
python3 rpi_live_scanner.py --debug
```

## Output JSON format

Status messages:

```json
{"status":"BASELINE_START","cycles_remaining":14}
{"status":"BASELINE","cycle":5,"cycles_remaining":9}
{"status":"BASELINE_READY","persistent_channels":12}
{"status":"SCANNING"}
```

Live cycle messages:

```json
{
   "cycle": 45,
   "alert": true,
   "level": "red",
   "peak_freq_mhz": 385.23,
   "peak_db": -47.1,
   "peak_delta_db": 12.5,
   "num_anomalies": 3,
   "top_channels": [45, 46, 47],
   "power_range": [-90.5, -45.2]
}
```

## Systemd service

`rpi_scanner.service` still works unchanged because `rpi_live_scanner.py` defaults to scanner mode.

Install service:

```bash
sudo cp rpi_scanner.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable rpi_scanner.service
sudo systemctl start rpi_scanner.service

# After changing BT_TARGET_MAC
sudo systemctl restart rpi_scanner.service
```

Check logs:

```bash
journalctl -u rpi_scanner.service -f
```

## Compatibility note

`bt_receiver.py` is now a compatibility wrapper that forwards to:

```bash
python3 rpi_live_scanner.py receiver ...
```

## Full auto-start behavior

With the updated service:

- Raspberry Pi boot starts scanner service automatically.
- Service tries to auto-select the first paired phone and create `/dev/rfcomm0`.
- Scanner keeps reconnecting Bluetooth while running, so web app data resumes automatically after reconnect.

## Troubleshooting

- No `/dev/rfcomm0`: ensure your phone is paired/trusted; optional fallback: `sudo rfcomm bind /dev/rfcomm0 <MAC_ADDR>`
- RTL-SDR missing: run `rtl_test -t`
- Permission issue for `/var/log/rpi_scanner.log`: use `--log-file /home/pi/rpi_scanner.log`
- High CPU: lower `--sample-rate` and `--samples-per-read`, or increase `--scan-delay-sec`
