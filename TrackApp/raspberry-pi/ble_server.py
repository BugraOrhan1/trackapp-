#!/usr/bin/env python3
"""BlueZ D-Bus GATT server for TrackApp.

Exposes the latest scanner results as a readable BLE characteristic so the
mobile app can pair and fetch a live snapshot.
"""

from __future__ import annotations

import json
import os
import signal
from pathlib import Path
from typing import Any

from gi.repository import GLib
from dbus.mainloop.glib import DBusGMainLoop
from pydbus import SystemBus
from pydbus.generic import signal as dbus_signal

BASE_DIR = Path(__file__).resolve().parent
DETECTIONS_FILE = BASE_DIR / "detections.json"
BLUE_EYE_SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
BLUE_EYE_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"
BLUE_EYE_STATUS_UUID = "d4e1e2f3-4a5b-6c7d-8e9f-0a1b2c3d4e5f"
TRACKAPP_SERVICE_NAME = "org.bluez"
ADAPTER_PATH = "/org/bluez/hci0"
SERVICE_PATH = "/org/trackapp/service0"
CHAR_PATH = f"{SERVICE_PATH}/char0"
STATUS_PATH = f"{SERVICE_PATH}/char1"


class Advertisement(object):
    """BlueZ LE advertisement."""

    def __init__(self, bus: SystemBus):
        self.bus = bus
        self.path = "/org/trackapp/advertisement0"
        self.local_name = "TrackApp-RPI"
        self.service_uuids = [BLUE_EYE_SERVICE_UUID]
        self.manufacturer_data = {0xFFFF: [0x54, 0x52, 0x41, 0x43]}
        self.include_tx_power = True

    def Release(self):
        print("Advertisement released")

    @property
    def Type(self) -> str:
        return "peripheral"

    @property
    def ServiceUUIDs(self) -> list[str]:
        return self.service_uuids

    @property
    def LocalName(self) -> str:
        return self.local_name

    @property
    def ManufacturerData(self) -> dict[int, list[int]]:
        return self.manufacturer_data

    @property
    def Includes(self) -> list[str]:
        return ["tx-power"] if self.include_tx_power else []

    @property
    def ServiceData(self) -> dict[str, list[int]]:
        return {BLUE_EYE_SERVICE_UUID: [0x01, 0x02, 0x03]}

    @property
    def Path(self) -> str:
        return self.path


class Descriptor(object):
    def __init__(self, characteristic: "Characteristic", index: int, uuid: str, flags: list[str]):
        self.characteristic = characteristic
        self.index = index
        self.uuid = uuid
        self.flags = flags
        self.path = f"{characteristic.path}/desc{index}"

    def ReadValue(self, options: dict[str, Any]) -> list[int]:
        return [ord(c) for c in "TrackApp descriptor"]

    @property
    def UUID(self) -> str:
        return self.uuid

    @property
    def Flags(self) -> list[str]:
        return self.flags

    @property
    def Path(self) -> str:
        return self.path


class Characteristic(object):
    def __init__(self, service: "Service", index: int, uuid: str, flags: list[str]):
        self.service = service
        self.index = index
        self.uuid = uuid
        self.flags = flags
        self.path = f"{service.path}/char{index}"
        self.notifying = False
        self.descriptors = [Descriptor(self, 0, "2901", ["read"])]

    def ReadValue(self, options: dict[str, Any]) -> list[int]:
        if self.uuid == BLUE_EYE_STATUS_UUID:
            payload = {"status": "ready", "device": "TrackApp-RPI"}
        else:
            if DETECTIONS_FILE.exists():
                payload = json.loads(DETECTIONS_FILE.read_text(encoding="utf-8"))
            else:
                payload = {"updated_at": None, "detections": []}
        return [ord(char) for char in json.dumps(payload)]

    def StartNotify(self):
        self.notifying = True
        self.PropertiesChanged("org.bluez.GattCharacteristic1", {"Value": self.ReadValue({})}, [])

    def StopNotify(self):
        self.notifying = False

    def WriteValue(self, value: list[int], options: dict[str, Any]):
        if self.uuid == BLUE_EYE_STATUS_UUID:
            return
        text = bytes(value).decode("utf-8", errors="ignore")
        DETECTIONS_FILE.write_text(text, encoding="utf-8")
        if self.notifying:
            self.PropertiesChanged("org.bluez.GattCharacteristic1", {"Value": self.ReadValue({})}, [])

    @dbus_signal("org.freedesktop.DBus.Properties", signature="sa{sv}as")
    def PropertiesChanged(self, interface_name, changed_properties, invalidated_properties):
        pass

    @property
    def UUID(self) -> str:
        return self.uuid

    @property
    def Service(self) -> str:
        return self.service.path

    @property
    def Flags(self) -> list[str]:
        return self.flags

    @property
    def Descriptors(self) -> list[Descriptor]:
        return self.descriptors

    @property
    def Path(self) -> str:
        return self.path


class Service(object):
    def __init__(self, index: int, uuid: str, primary: bool = True):
        self.index = index
        self.uuid = uuid
        self.primary = primary
        self.path = f"{SERVICE_PATH}"
        self.characteristics = [
            Characteristic(self, 0, BLUE_EYE_CHAR_UUID, ["read", "write", "notify"]),
            Characteristic(self, 1, BLUE_EYE_STATUS_UUID, ["read", "notify"]),
        ]

    @property
    def UUID(self) -> str:
        return self.uuid

    @property
    def Primary(self) -> bool:
        return self.primary

    @property
    def Characteristics(self) -> list[Characteristic]:
        return self.characteristics

    @property
    def Path(self) -> str:
        return self.path


class Application(object):
    def __init__(self):
        self.services = [Service(0, BLUE_EYE_SERVICE_UUID)]

    @property
    def Services(self) -> list[Service]:
        return self.services


class GattManager:
    def __init__(self):
        self.bus = SystemBus()
        self.adapter = self.bus[TRACKAPP_SERVICE_NAME][ADAPTER_PATH]
        self.adapter.Powered = True
        self.app = Application()
        self.advertisement = Advertisement(self.bus)

    def register(self):
        self.adapter.RegisterApplication(self.app, {})
        self.adapter.RegisterAdvertisement(self.advertisement, {})
        print("BLE GATT server registered")

    def unregister(self):
        try:
            self.adapter.UnregisterAdvertisement(self.advertisement)
        except Exception:
            pass
        try:
            self.adapter.UnregisterApplication(self.app)
        except Exception:
            pass


def main() -> int:
    DBusGMainLoop(set_as_default=True)
    manager = GattManager()
    manager.register()

    loop = GLib.MainLoop()

    def stop(*_args):
        manager.unregister()
        loop.quit()

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)

    print("TrackApp BLE server running. Advertisement name: TrackApp-RPI")
    loop.run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
