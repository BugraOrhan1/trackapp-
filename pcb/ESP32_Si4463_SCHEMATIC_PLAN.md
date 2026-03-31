# ESP32 + Si4463 Schematisch Plan (voor KiCad)

Dit document is de schematische tekening/verbindingstabel voor het project in `pcb/`.
Gebruik deze netnamen exact in KiCad voor nette ERC/PCB-koppeling.

## 1) Blokdiagram

```text
USB_5V_IN (J2)
   |
   v
LDO 5V->3V3 (U3, AMS1117-3.3)
   |---- C7 22uF (IN naar GND)
   |---- C8 22uF (OUT naar GND)
   v
+3V3 rail ---------------------------------------------+
   |                                                    |
   v                                                    v
ESP32-WROOM-32UE (U1)                            Si4463 (U2)
SPI master                                       SPI slave
CS/SCK/MOSI/MISO ------------------------------> NSEL/SCLK/SDI/SDO
GPIO IRQ <------------------------------------- NIRQ
GPIO SDN -------------------------------------> SDN
   |                                                    |
   +--> D1 LED + R1                                    +--> Y1 TCXO 30MHz
                                                        +--> FL1 SAW 390MHz
                                                        +--> L1/C9/C10 matching
                                                               |
                                                               v
                                                          J1 SMA-EDGE
```

## 2) Voeding en decoupling

- Net: `+5V_IN` van J2 pin 1 naar U3 IN.
- Net: `GND` op J2 pin 2 en alle GND-pinnen.
- U3 (AMS1117-3.3):
  - IN -> `+5V_IN`
  - GND -> `GND`
  - OUT -> `+3V3`
- C7 = 22uF tussen `+5V_IN` en `GND` (dicht bij U3 IN).
- C8 = 22uF tussen `+3V3` en `GND` (dicht bij U3 OUT).
- C1/C2 = 100nF bij ESP32 VCC-pinnen.
- C5/C6 = 100nF bij Si4463 VDD-pinnen.
- C3/C4 = 10nF extra HF-decoupling op `+3V3` nabij RF-sectie.

## 3) ESP32 <-> Si4463 pin mapping (aanbevolen)

Gebruik onderstaande GPIO’s in je firmware:

- `RF_CS`   : ESP32 GPIO5   -> Si4463 `NSEL`
- `RF_SCK`  : ESP32 GPIO18  -> Si4463 `SCLK`
- `RF_MOSI` : ESP32 GPIO23  -> Si4463 `SDI`
- `RF_MISO` : ESP32 GPIO19  <- Si4463 `SDO`
- `RF_IRQ`  : ESP32 GPIO4   <- Si4463 `NIRQ`
- `RF_SDN`  : ESP32 GPIO27  -> Si4463 `SDN`

Voedingen:
- ESP32 3V3 pinnen -> `+3V3`
- Si4463 VDD pinnen -> `+3V3`
- Alle gronden -> `GND`

## 4) RF keten

- Si4463 RF pin -> FL1 (SAW 390MHz) -> matching netwerk (`L1`, `C9`, `C10`) -> J1 SMA.
- `L1/C9/C10` op DNP/TBD laten voor eerste prototype; tune na VNA meting.
- Houd de RF trace als 50 ohm microstrip op de PCB.

## 5) LED en debug testpads

- D1 anode via R1 (1k) naar ESP32 status-pin (bijv. GPIO2 of GPIO13).
- D1 kathode naar `GND`.
- Testpads:
  - TP1 `RF_CS`
  - TP2 `RF_SCK`
  - TP3 `RF_MOSI`
  - TP4 `RF_MISO`
  - TP5 `RF_IRQ`
  - TP6 `RF_SDN`

## 6) Netnamen (exact gebruiken in KiCad)

- `+5V_IN`
- `+3V3`
- `GND`
- `RF_CS`
- `RF_SCK`
- `RF_MOSI`
- `RF_MISO`
- `RF_IRQ`
- `RF_SDN`
- `RF_ANT`

## 7) KiCad symbolen/footprints (suggestie)

- U1: `RF_Module:ESP32-WROOM-32`
- U2: Si4463 QFN-20 4x4mm
- U3: `Package_TO_SOT_SMD:SOT-223-3_TabPin2`
- C/R: 0603/0805 volgens BOM
- J1: edge-mount SMA
- TPx: testpad 1.5mm

## 8) Volgende stap in KiCad

1. Plaats symbolen volgens bovenstaande mapping.
2. Label alle nets met dezelfde namen.
3. Run ERC en fix eventuele unconnected pins (bewust NC markeren).
4. Update PCB from schematic.
5. Daarna kan Gerber + drill worden gegenereerd.
