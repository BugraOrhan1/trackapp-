# KiCad stap voor stap (zonder voorkennis)

Doel: je schema voor ESP32 + Si4463 invullen en daarna Gerber maken.

## 1. Project openen

1. Open KiCad.
2. Open project: `pcb/trackapp.kicad_pro`.
3. Klik op Schematic Editor.

## 2. Componenten plaatsen

Plaats deze symbolen met toets A:

- ESP32 module (U1)
- Si4463 transceiver (U2)
- AMS1117-3.3 LDO (U3)
- Condensatoren: C1 C2 C3 C4 C5 C6 C7 C8 C9 C10
- Weerstand: R1
- LED: D1
- SMA connector: J1
- 2-pin power input: J2
- Testpads: TP1 t/m TP6
- SAW filter: FL1
- TCXO: Y1
- Matching: L1

Tip: als een exact symbool niet bestaat, kies tijdelijk een equivalent en behoud de referentie (U1, U2, enz.).

## 3. Netlabels exact zo zetten

Gebruik Label Net (toets L) en gebruik exact deze namen:

- +5V_IN
- +3V3
- GND
- RF_CS
- RF_SCK
- RF_MOSI
- RF_MISO
- RF_IRQ
- RF_SDN
- RF_ANT

## 4. Aansluitingen (belangrijkste)

### Voeding

- J2 pin1 -> +5V_IN
- J2 pin2 -> GND
- U3 IN -> +5V_IN
- U3 GND -> GND
- U3 OUT -> +3V3
- C7 tussen +5V_IN en GND
- C8 tussen +3V3 en GND

### ESP32 naar Si4463

- U1 GPIO5 -> RF_CS -> U2 NSEL
- U1 GPIO18 -> RF_SCK -> U2 SCLK
- U1 GPIO23 -> RF_MOSI -> U2 SDI
- U1 GPIO19 -> RF_MISO -> U2 SDO
- U1 GPIO4 <- RF_IRQ <- U2 NIRQ
- U1 GPIO27 -> RF_SDN -> U2 SDN

### Voeding op ICs

- U1 VCC pins -> +3V3
- U2 VDD pins -> +3V3
- Alle GND pins -> GND
- C1 C2 dicht bij U1 op +3V3/GND
- C5 C6 dicht bij U2 op +3V3/GND
- C3 C4 extra HF ontkoppeling op +3V3/GND

### RF pad

- U2 RF pin -> FL1 -> L1/C9/C10 matching -> RF_ANT -> J1 center pin
- J1 shield -> GND

### LED

- ESP32 status pin (bijv GPIO2) -> R1 -> D1 anode
- D1 kathode -> GND

### Testpads

- TP1 RF_CS
- TP2 RF_SCK
- TP3 RF_MOSI
- TP4 RF_MISO
- TP5 RF_IRQ
- TP6 RF_SDN

## 5. Footprints koppelen

Tools -> Assign Footprints en zet:

- U1: RF_Module:ESP32-WROOM-32
- U2: Package_QFN:QFN-20-1EP_4x4mm_P0.5mm
- U3: Package_TO_SOT_SMD:SOT-223-3_TabPin2
- C/R: 0603 of 0805 volgens BOM
- J1: edge-mount SMA footprint
- TPx: TestPoint pad 1.5mm

## 6. Controle

1. Klik ERC en los rode fouten op.
2. Sla schema op.
3. Update PCB from Schematic.
4. In PCB Editor: route + ground plane.

## 7. Gerber export

1. PCB Editor -> File -> Fabrication Outputs -> Gerbers.
2. Selecteer lagen:
   - F.Cu
   - B.Cu
   - F.Mask
   - B.Mask
   - F.SilkS
   - B.SilkS
   - Edge.Cuts
3. Klik Generate Drill Files.
4. Zip alle gerbers + drill samen.

Klaar voor PCBWay / Makerfabs.
