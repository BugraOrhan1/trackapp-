# iPhone App (Middenroute: Capacitor)

Deze route houdt je bestaande webapp intact en draait die in een native iOS shell.

## Wat is toegevoegd
- `capacitor.config.ts`
- Capacitor + BLE plugin dependencies in `package.json`
- Native BLE bridge in `app.js` (Capacitor BLE wordt eerst geprobeerd)

## Mac stappen (Xcode machine)
1. In projectmap:
   - `npm install`
2. iOS platform toevoegen:
   - `npm run cap:add:ios`
3. Sync web assets + plugins:
   - `npm run cap:sync`
4. Open in Xcode:
   - `npm run cap:open:ios`

## Xcode instellingen
1. Signing & Capabilities: kies Team
2. Background Modes: zet `Uses Bluetooth LE accessories` aan
3. Info (permissions):
   - `NSBluetoothAlwaysUsageDescription`
   - `NSBluetoothPeripheralUsageDescription`

## BLE flow
- App probeert eerst native Capacitor BLE.
- Device naam voorkeur:
  1. `TrackApp-Pi`
  2. `TrackScan`
- Waarden `GREEN/YELLOW/RED` worden direct op signal UI gezet.

## Belangrijk
- iOS build kan alleen op macOS met Xcode.
- Raspberry Pi moet BLE advertentie + lees/notify karakteristiek leveren voor stabiele updates.
