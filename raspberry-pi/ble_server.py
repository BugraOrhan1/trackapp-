#!/usr/bin/env python3
"""
TrackApp BLE GATT server.
Pure BlueZ D-Bus implementation (no pip BLE packages).
"""

import json
import signal
import sys

import dbus
import dbus.exceptions
import dbus.mainloop.glib
import dbus.service
from gi.repository import GLib

from target_blue_eye_scanner import TargetBlueEyeScanner


BLUEZ_SERVICE_NAME = "org.bluez"
DBUS_OM_IFACE = "org.freedesktop.DBus.ObjectManager"
DBUS_PROP_IFACE = "org.freedesktop.DBus.Properties"
GATT_MANAGER_IFACE = "org.bluez.GattManager1"
LE_ADVERTISING_MANAGER_IFACE = "org.bluez.LEAdvertisingManager1"
GATT_SERVICE_IFACE = "org.bluez.GattService1"
GATT_CHRC_IFACE = "org.bluez.GattCharacteristic1"
LE_ADVERTISEMENT_IFACE = "org.bluez.LEAdvertisement1"
ADAPTER_IFACE = "org.bluez.Adapter1"

DEVICE_NAME = "TrackApp-RPI"

SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
DETECTIONS_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"
COMMAND_UUID = "cba1d466-344c-4be3-ab3f-189f80dd7518"
STATUS_UUID = "d4e1e2f3-4a5b-6c7d-8e9f-0a1b2c3d4e5f"


class InvalidArgsException(dbus.exceptions.DBusException):
    _dbus_error_name = "org.freedesktop.DBus.Error.InvalidArgs"


class NotSupportedException(dbus.exceptions.DBusException):
    _dbus_error_name = "org.bluez.Error.NotSupported"


class Application(dbus.service.Object):
    def __init__(self, bus):
        self.path = "/"
        self.services = []
        super().__init__(bus, self.path)

    def get_path(self):
        return dbus.ObjectPath(self.path)

    def add_service(self, service):
        self.services.append(service)

    @dbus.service.method(DBUS_OM_IFACE, out_signature="a{oa{sa{sv}}}")
    def GetManagedObjects(self):
        response = {}
        for service in self.services:
            response[service.get_path()] = service.get_properties()
            for chrc in service.get_characteristics():
                response[chrc.get_path()] = chrc.get_properties()
        return response


class Service(dbus.service.Object):
    PATH_BASE = "/org/trackapp/service"

    def __init__(self, bus, index, uuid, primary):
        self.path = self.PATH_BASE + str(index)
        self.bus = bus
        self.uuid = uuid
        self.primary = primary
        self.characteristics = []
        super().__init__(bus, self.path)

    def get_properties(self):
        return {
            GATT_SERVICE_IFACE: {
                "UUID": self.uuid,
                "Primary": self.primary,
                "Characteristics": dbus.Array(self.get_characteristic_paths(), signature="o"),
            }
        }

    def get_path(self):
        return dbus.ObjectPath(self.path)

    def add_characteristic(self, characteristic):
        self.characteristics.append(characteristic)

    def get_characteristics(self):
        return self.characteristics

    def get_characteristic_paths(self):
        return [chrc.get_path() for chrc in self.characteristics]

    @dbus.service.method(DBUS_PROP_IFACE, in_signature="s", out_signature="a{sv}")
    def GetAll(self, interface):
        if interface != GATT_SERVICE_IFACE:
            raise InvalidArgsException()
        return self.get_properties()[GATT_SERVICE_IFACE]


class Characteristic(dbus.service.Object):
    def __init__(self, bus, index, uuid, flags, service):
        self.path = service.path + "/char" + str(index)
        self.bus = bus
        self.uuid = uuid
        self.service = service
        self.flags = flags
        self.notifying = False
        super().__init__(bus, self.path)

    def get_properties(self):
        return {
            GATT_CHRC_IFACE: {
                "Service": self.service.get_path(),
                "UUID": self.uuid,
                "Flags": self.flags,
            }
        }

    def get_path(self):
        return dbus.ObjectPath(self.path)

    @dbus.service.method(DBUS_PROP_IFACE, in_signature="s", out_signature="a{sv}")
    def GetAll(self, interface):
        if interface != GATT_CHRC_IFACE:
            raise InvalidArgsException()
        return self.get_properties()[GATT_CHRC_IFACE]

    @dbus.service.method(GATT_CHRC_IFACE, in_signature="a{sv}", out_signature="ay")
    def ReadValue(self, options):
        raise NotSupportedException()

    @dbus.service.method(GATT_CHRC_IFACE, in_signature="aya{sv}", out_signature="")
    def WriteValue(self, value, options):
        raise NotSupportedException()

    @dbus.service.method(GATT_CHRC_IFACE, in_signature="", out_signature="")
    def StartNotify(self):
        raise NotSupportedException()

    @dbus.service.method(GATT_CHRC_IFACE, in_signature="", out_signature="")
    def StopNotify(self):
        raise NotSupportedException()

    @dbus.service.signal(DBUS_PROP_IFACE, signature="sa{sv}as")
    def PropertiesChanged(self, interface, changed, invalidated):
        pass


class DetectionsCharacteristic(Characteristic):
    def __init__(self, bus, index, service, scanner):
        super().__init__(bus, index, DETECTIONS_UUID, ["read", "notify"], service)
        self.scanner = scanner
        self._last_json = "[]"
        self._notify_source = None

    def _build_payload(self):
        detections = self.scanner.get_latest_detections()
        payload = {
            "device": DEVICE_NAME,
            "scan_active": self.scanner.monitoring,
            "baseline_complete": self.scanner.get_status().get("status") in ["baseline_complete", "monitoring"],
            "detections": detections,
        }
        return json.dumps(payload, ensure_ascii=False)

    @dbus.service.method(GATT_CHRC_IFACE, in_signature="a{sv}", out_signature="ay")
    def ReadValue(self, options):
        self._last_json = self._build_payload()
        return dbus.ByteArray(self._last_json.encode("utf-8"))

    @dbus.service.method(GATT_CHRC_IFACE, in_signature="", out_signature="")
    def StartNotify(self):
        if self.notifying:
            return
        self.notifying = True
        self._notify_source = GLib.timeout_add_seconds(2, self._notify)

    @dbus.service.method(GATT_CHRC_IFACE, in_signature="", out_signature="")
    def StopNotify(self):
        if not self.notifying:
            return
        self.notifying = False
        if self._notify_source is not None:
            GLib.source_remove(self._notify_source)
            self._notify_source = None

    def _notify(self):
        if not self.notifying:
            return False
        current_json = self._build_payload()
        if current_json != self._last_json:
            self._last_json = current_json
            self.PropertiesChanged(
                GATT_CHRC_IFACE,
                {"Value": dbus.ByteArray(current_json.encode("utf-8"))},
                [],
            )
        return True


class CommandCharacteristic(Characteristic):
    def __init__(self, bus, index, service, scanner):
        super().__init__(bus, index, COMMAND_UUID, ["write"], service)
        self.scanner = scanner

    @dbus.service.method(GATT_CHRC_IFACE, in_signature="aya{sv}", out_signature="")
    def WriteValue(self, value, options):
        try:
            raw = bytes(value).decode("utf-8")
            cmd = json.loads(raw)
            if not isinstance(cmd, dict):
                print("[BLE] Command must be a JSON object")
                return
            action = cmd.get("action", "")
            if action == "start_scan":
                self.scanner.start_continuous_monitoring()
            elif action == "stop_scan":
                self.scanner.stop_continuous_monitoring()
            elif action == "baseline":
                self.scanner.perform_baseline_scan()
            elif action == "ping":
                pass
            else:
                print(f"[BLE] Unknown command action: {action}")
        except Exception as exc:
            print(f"[BLE] Command parse error: {exc}")


class StatusCharacteristic(Characteristic):
    def __init__(self, bus, index, service, scanner):
        super().__init__(bus, index, STATUS_UUID, ["read"], service)
        self.scanner = scanner

    @dbus.service.method(GATT_CHRC_IFACE, in_signature="a{sv}", out_signature="ay")
    def ReadValue(self, options):
        status = self.scanner.get_status()
        payload = {
            "device": DEVICE_NAME,
            "status": status.get("status"),
            "simulate": status.get("simulate"),
            "monitoring": status.get("monitoring"),
        }
        return dbus.ByteArray(json.dumps(payload).encode("utf-8"))


class Advertisement(dbus.service.Object):
    PATH_BASE = "/org/trackapp/advertisement"

    def __init__(self, bus, index):
        self.path = self.PATH_BASE + str(index)
        self.bus = bus
        self.local_name = DEVICE_NAME
        self.service_uuids = [SERVICE_UUID]
        super().__init__(bus, self.path)

    def get_path(self):
        return dbus.ObjectPath(self.path)

    def get_properties(self):
        return {
            LE_ADVERTISEMENT_IFACE: {
                "Type": "peripheral",
                "ServiceUUIDs": dbus.Array(self.service_uuids, signature="s"),
                "LocalName": dbus.String(self.local_name),
                "IncludeTxPower": dbus.Boolean(True),
            }
        }

    @dbus.service.method(DBUS_PROP_IFACE, in_signature="s", out_signature="a{sv}")
    def GetAll(self, interface):
        if interface != LE_ADVERTISEMENT_IFACE:
            raise InvalidArgsException()
        return self.get_properties()[LE_ADVERTISEMENT_IFACE]

    @dbus.service.method(LE_ADVERTISEMENT_IFACE, in_signature="", out_signature="")
    def Release(self):
        print("[BLE] Advertisement released")


def find_adapter(bus):
    obj = bus.get_object(BLUEZ_SERVICE_NAME, "/")
    om = dbus.Interface(obj, DBUS_OM_IFACE)
    managed = om.GetManagedObjects()
    for path, interfaces in managed.items():
        if GATT_MANAGER_IFACE in interfaces and LE_ADVERTISING_MANAGER_IFACE in interfaces:
            return path
    return None


def set_adapter_alias(bus, adapter_path, alias):
    props = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, adapter_path), DBUS_PROP_IFACE)
    props.Set(ADAPTER_IFACE, "Alias", dbus.String(alias))


class BLEServer:
    def __init__(self):
        dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)
        self.bus = dbus.SystemBus()
        self.adapter_path = find_adapter(self.bus)
        if not self.adapter_path:
            raise RuntimeError("No BLE adapter with GATT and Advertising manager found")

        set_adapter_alias(self.bus, self.adapter_path, DEVICE_NAME)

        self.mainloop = GLib.MainLoop()
        self.scanner = TargetBlueEyeScanner()

        self.app = Application(self.bus)
        self.service = Service(self.bus, 0, SERVICE_UUID, True)
        self.detections = DetectionsCharacteristic(self.bus, 0, self.service, self.scanner)
        self.command = CommandCharacteristic(self.bus, 1, self.service, self.scanner)
        self.status = StatusCharacteristic(self.bus, 2, self.service, self.scanner)
        self.service.add_characteristic(self.detections)
        self.service.add_characteristic(self.command)
        self.service.add_characteristic(self.status)
        self.app.add_service(self.service)

        self.advertisement = Advertisement(self.bus, 0)

    def start(self):
        service_manager = dbus.Interface(
            self.bus.get_object(BLUEZ_SERVICE_NAME, self.adapter_path), GATT_MANAGER_IFACE
        )
        ad_manager = dbus.Interface(
            self.bus.get_object(BLUEZ_SERVICE_NAME, self.adapter_path), LE_ADVERTISING_MANAGER_IFACE
        )

        service_manager.RegisterApplication(
            self.app.get_path(), {}, reply_handler=self._app_registered, error_handler=self._app_register_error
        )
        ad_manager.RegisterAdvertisement(
            self.advertisement.get_path(), {}, reply_handler=self._ad_registered, error_handler=self._ad_register_error
        )

        print("[BLE] Starting baseline scan...")
        self.scanner.perform_baseline_scan()
        self.scanner.start_continuous_monitoring()

        signal.signal(signal.SIGINT, self._sigint)
        print("[BLE] Server running as TrackApp-RPI")
        self.mainloop.run()

    def stop(self):
        try:
            self.scanner.shutdown()
        finally:
            if self.mainloop.is_running():
                self.mainloop.quit()

    def _sigint(self, signum, frame):
        print("\n[BLE] Ctrl+C received, stopping...")
        self.stop()
        sys.exit(0)

    @staticmethod
    def _app_registered():
        print("[BLE] GATT application registered")

    @staticmethod
    def _app_register_error(error):
        print(f"[BLE] Failed to register app: {error}")

    @staticmethod
    def _ad_registered():
        print("[BLE] Advertisement registered")

    @staticmethod
    def _ad_register_error(error):
        print(f"[BLE] Failed to register advertisement: {error}")


def main():
    server = BLEServer()
    server.start()


if __name__ == "__main__":
    main()
