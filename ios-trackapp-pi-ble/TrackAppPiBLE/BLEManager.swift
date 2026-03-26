import Foundation
import CoreBluetooth
import SwiftUI

final class BLEManager: NSObject, ObservableObject {
    enum SignalStatus: String {
        case green = "GREEN"
        case yellow = "YELLOW"
        case red = "RED"
        case unknown = "WAITING"
    }

    @Published var signalStatus: SignalStatus = .unknown
    @Published var connectionState: String = "Starting BLE..."
    @Published var lastUpdateText: String = ""
    @Published var isConnected: Bool = false

    private let restoreID = "com.trackapp.pi.ble.central"
    private let targetNames = ["TrackApp-Pi", "TrackScan"]

    // If your Pi exposes a known UUID, fill these.
    private let signalServiceUUID: CBUUID? = nil
    private let signalCharacteristicUUID: CBUUID? = nil

    private var central: CBCentralManager!
    private var targetPeripheral: CBPeripheral?
    private var signalCharacteristic: CBCharacteristic?
    private var reconnectWorkItem: DispatchWorkItem?

    override init() {
        super.init()
        central = CBCentralManager(
            delegate: self,
            queue: nil,
            options: [
                CBCentralManagerOptionRestoreIdentifierKey: restoreID,
                CBCentralManagerOptionShowPowerAlertKey: true,
            ]
        )
    }

    func start() {
        guard central.state == .poweredOn else {
            connectionState = "Bluetooth not ready"
            return
        }
        startScan()
    }

    private func startScan() {
        reconnectWorkItem?.cancel()
        connectionState = "Scanning for TrackApp-Pi..."
        let serviceFilter = signalServiceUUID.map { [$0] }
        central.scanForPeripherals(withServices: serviceFilter, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
    }

    private func connect(_ peripheral: CBPeripheral) {
        targetPeripheral = peripheral
        targetPeripheral?.delegate = self
        connectionState = "Connecting to \(peripheral.name ?? "TrackApp-Pi")..."

        central.connect(
            peripheral,
            options: [
                CBConnectPeripheralOptionNotifyOnConnectionKey: true,
                CBConnectPeripheralOptionNotifyOnDisconnectionKey: true,
                CBConnectPeripheralOptionNotifyOnNotificationKey: true,
            ]
        )
    }

    private func scheduleReconnect() {
        reconnectWorkItem?.cancel()
        let work = DispatchWorkItem { [weak self] in
            self?.start()
        }
        reconnectWorkItem = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0, execute: work)
    }

    private func parseSignal(from data: Data) -> SignalStatus? {
        guard let raw = String(data: data, encoding: .utf8) else { return nil }
        let value = raw.trimmingCharacters(in: .whitespacesAndNewlines)

        switch value.uppercased() {
        case "GREEN": return .green
        case "YELLOW": return .yellow
        case "RED": return .red
        default:
            if let jsonData = value.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
                if let status = (json["signal_status"] as? String) ?? (json["level"] as? String) {
                    switch status.uppercased() {
                    case "GREEN": return .green
                    case "YELLOW": return .yellow
                    case "RED": return .red
                    default: break
                    }
                }
            }
            return nil
        }
    }

    private func updateStatus(_ status: SignalStatus) {
        signalStatus = status
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm:ss"
        lastUpdateText = "Last update: \(formatter.string(from: Date()))"
    }
}

extension BLEManager: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            connectionState = "Bluetooth ON"
            startScan()
        case .poweredOff:
            connectionState = "Turn Bluetooth ON"
            isConnected = false
        case .unauthorized:
            connectionState = "Bluetooth permission denied"
            isConnected = false
        case .unsupported:
            connectionState = "BLE not supported"
            isConnected = false
        default:
            connectionState = "Bluetooth state: \(central.state.rawValue)"
            isConnected = false
        }
    }

    func centralManager(_ central: CBCentralManager, willRestoreState dict: [String: Any]) {
        if let peripherals = dict[CBCentralManagerRestoredStatePeripheralsKey] as? [CBPeripheral],
           let peripheral = peripherals.first {
            connect(peripheral)
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
        let name = peripheral.name ?? ""
        if targetNames.contains(where: { name.caseInsensitiveCompare($0) == .orderedSame }) {
            central.stopScan()
            connect(peripheral)
        }
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        isConnected = true
        connectionState = "Connected: \(peripheral.name ?? "TrackApp-Pi")"
        if let serviceUUID = signalServiceUUID {
            peripheral.discoverServices([serviceUUID])
        } else {
            peripheral.discoverServices(nil)
        }
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        isConnected = false
        connectionState = "Connect failed: \(error?.localizedDescription ?? "unknown")"
        scheduleReconnect()
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        isConnected = false
        signalCharacteristic = nil
        connectionState = "Disconnected. Reconnecting..."
        scheduleReconnect()
    }
}

extension BLEManager: CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard error == nil else {
            connectionState = "Service discovery error"
            return
        }

        guard let services = peripheral.services else { return }
        for service in services {
            if let charUUID = signalCharacteristicUUID {
                peripheral.discoverCharacteristics([charUUID], for: service)
            } else {
                peripheral.discoverCharacteristics(nil, for: service)
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard error == nil else {
            connectionState = "Characteristic discovery error"
            return
        }

        guard let characteristics = service.characteristics else { return }
        for characteristic in characteristics {
            let matchedByUUID = (signalCharacteristicUUID != nil && characteristic.uuid == signalCharacteristicUUID)
            let matchedFallback = signalCharacteristicUUID == nil
            if matchedByUUID || matchedFallback {
                peripheral.discoverDescriptors(for: characteristic)
                if characteristic.properties.contains(.notify) {
                    peripheral.setNotifyValue(true, for: characteristic)
                }
                if characteristic.properties.contains(.read) {
                    peripheral.readValue(for: characteristic)
                }
                // Save first candidate, may be replaced by descriptor match later.
                if signalCharacteristic == nil {
                    signalCharacteristic = characteristic
                }
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverDescriptorsFor characteristic: CBCharacteristic, error: Error?) {
        guard error == nil, let descriptors = characteristic.descriptors else { return }
        for descriptor in descriptors {
            if descriptor.uuid == CBUUIDCharacteristicUserDescriptionString {
                peripheral.readValue(for: descriptor)
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor descriptor: CBDescriptor, error: Error?) {
        guard error == nil else { return }
        if descriptor.uuid == CBUUIDCharacteristicUserDescriptionString,
           let text = descriptor.value as? String,
           text.lowercased().contains("signal_status"),
           let char = descriptor.characteristic {
            signalCharacteristic = char
            if char.properties.contains(.notify) {
                peripheral.setNotifyValue(true, for: char)
            }
            if char.properties.contains(.read) {
                peripheral.readValue(for: char)
            }
            connectionState = "signal_status characteristic ready"
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        guard error == nil else {
            connectionState = "Read error"
            return
        }

        guard let data = characteristic.value,
              let parsed = parseSignal(from: data) else {
            return
        }
        updateStatus(parsed)
    }
}
