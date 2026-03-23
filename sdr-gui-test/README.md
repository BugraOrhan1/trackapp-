# RTL2832U SDR Test GUI

Losse testtool voor antenne + RTL2832U, apart van de webapp.

## Wat doet deze GUI?
- Baseline sweep van 380 tot 400 MHz
- Daarna live monitoring rond 380 MHz en 400 MHz
- Peak-detectie t.o.v. baseline
- Alarmstatus in de GUI + logvenster
- Simulatiemodus als er geen RTL hardware aanwezig is

## Benodigd
- Python 3.10+
- RTL2832U dongle (voor echte metingen)
- Drivers voor RTL-SDR op Windows (bv. via Zadig)

## Installatie
1. Open terminal in deze map.
2. Maak virtuele omgeving (optioneel):
   - `python -m venv .venv`
   - `.venv\\Scripts\\activate`
3. Installeer packages:
   - `pip install -r requirements.txt`

## Starten
- `python sdr_test_gui.py`
- of dubbelklik op `start_sdr_gui.bat`

## Gebruik
1. Kies modus:
   - `Auto`: probeert echte RTL, valt terug op simulatie
   - `RTL-SDR`: forceer hardwaremodus
   - `Simulated`: zonder hardware testen
2. Klik `Run Baseline (380-400 MHz)`.
3. Wacht tot baseline klaar is.
4. Klik `Start Live Monitor`.
5. Bij een sterke piek boven baseline verandert de status naar `ALERT`.

## Tip voor antenne test
- Zet de threshold slider lager (bijv. 6 dB) voor gevoeliger detectie.
- Zet gain iets hoger als signalen zwak lijken.
- Vergelijk baseline op verschillende locaties om ruisbronnen te vinden.

## Bekende beperkingen
- Dit is een testtool voor SDR-signaaldetectie, geen geverifieerde flitswaarschuwing.
- Exacte frequentieplannen van hulpdiensten verschillen per regio.
