# TrackAppPiBLE (iOS SwiftUI)

BLE iOS app that connects to Raspberry Pi and paints full screen by signal status.

## Implemented from your project data
- CoreBluetooth central mode
- Device target name: `TrackApp-Pi`
- Fallback name from existing setup: `TrackScan`
- Characteristic intent: `signal_status`
- Accepted values: `GREEN`, `YELLOW`, `RED`
- Full-screen color UI
- Background BLE keep-alive support (`bluetooth-central` + state restoration)

## Files
- `TrackAppPiBLE/TrackAppPiBLEApp.swift`
- `TrackAppPiBLE/ContentView.swift`
- `TrackAppPiBLE/BLEManager.swift`
- `TrackAppPiBLE/Info.plist`

## Run in Xcode
1. Open Xcode -> New Project -> iOS App (SwiftUI).
2. Name it `TrackAppPiBLE`.
3. Replace generated files with files from `TrackAppPiBLE/` folder in this repo.
4. In target settings:
   - Signing & Capabilities: add your Team
   - Background Modes: enable **Uses Bluetooth LE accessories**
5. Build to your iPhone.
6. Ensure Raspberry Pi advertises BLE as `TrackApp-Pi` (or `TrackScan` fallback).

## Notes
- iOS background behavior depends on system BLE policy and power state.
- For deterministic reading, configure a fixed service/characteristic UUID on Pi and set it in `BLEManager.swift` (`signalServiceUUID`, `signalCharacteristicUUID`).
