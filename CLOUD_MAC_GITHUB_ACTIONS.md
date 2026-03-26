# Cloud Mac optie (Windows -> iOS build via GitHub Actions)

Je hebt nu een cloud-mac workflow in:
- `.github/workflows/ios-cloud-build.yml`

Deze draait op GitHub macOS runners en bouwt:
1. **altijd** een unsigned iOS archive
2. **optioneel** een signed IPA (als secrets zijn gezet)
3. bij handmatig runnen kun je nu `build_signed_ipa=true` kiezen; als secrets missen faalt de run direct met welke secrets ontbreken
4. **optioneel** TestFlight upload via `upload_testflight=true`

## 1) Repository secrets instellen
Ga naar: GitHub repo -> Settings -> Secrets and variables -> Actions -> New repository secret

Verplicht voor signed IPA:
- `IOS_CERT_BASE64` : base64 van je `.p12` signing cert
- `IOS_CERT_PASSWORD` : wachtwoord van `.p12`
- `IOS_PROFILE_BASE64` : base64 van provisioning profile `.mobileprovision`
- `IOS_TEAM_ID` : Apple Developer Team ID
- `IOS_PROFILE_NAME` : exacte naam van provisioning profile
- `IOS_BUNDLE_ID` : bundle id (bijv. `com.trackapp.signal`)

Extra verplicht voor TestFlight upload:
- `ASC_KEY_ID` : App Store Connect API Key ID
- `ASC_ISSUER_ID` : App Store Connect Issuer ID
- `ASC_PRIVATE_KEY_BASE64` : base64 van `AuthKey_<KEY_ID>.p8`

Als je deze niet zet, krijg je nog steeds unsigned archive artifacts.

## 2) Workflow starten
- GitHub -> Actions -> `iOS Cloud Build (Capacitor)` -> Run workflow
- Laat `build_signed_ipa` op `true` staan om een IPA te forceren.
- Zet `upload_testflight` op `true` om direct naar TestFlight te uploaden.
- Als signing niet compleet is, stopt de workflow met een duidelijke foutmelding (in plaats van stil alleen archive maken).

Let op bij `upload_testflight=true`:
- De exportmethode wordt `app-store`.
- Je provisioning profile moet hiervoor geschikt zijn (App Store distribution).

## 3) Artifact downloaden
Na success:
- `ios-unsigned-xcarchive` (altijd)
- `ios-signed-ipa` (alleen als secrets compleet zijn)

## 4) Belangrijk
- Zonder Apple signing secrets kan iPhone geen installeerbare IPA krijgen.
- TestFlight zelf is gratis voor testers, maar je hebt wel een betaald Apple Developer account nodig om te uploaden.
- Deze workflow houdt je bestaande webapp + Capacitor setup intact.

## Base64 helpers (lokaal)
### Windows PowerShell
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\file.p12"))
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\profile.mobileprovision"))
```
