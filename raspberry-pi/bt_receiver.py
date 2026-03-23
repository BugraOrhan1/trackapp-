#!/usr/bin/env python3
"""
Compatibility wrapper.

Preferred command is now:
python3 rpi_live_scanner.py receiver --port <PORT> --output-csv <FILE>

This wrapper keeps older bt_receiver.py command lines working.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Compatibility wrapper for unified receiver mode")
    parser.add_argument("port", nargs="?", default="/dev/ttyUSB0")
    parser.add_argument("-b", "--baudrate", type=int, default=115200)
    parser.add_argument("-o", "--output", default="")
    args = parser.parse_args()

    script_path = Path(__file__).with_name("rpi_live_scanner.py")
    cmd = [
        sys.executable,
        str(script_path),
        "receiver",
        "--port",
        args.port,
        "--baudrate",
        str(args.baudrate),
    ]
    if args.output:
        cmd.extend(["--output-csv", args.output])

    return subprocess.call(cmd)


if __name__ == "__main__":
    raise SystemExit(main())
