# Cloud Mac optie (Windows -> iOS build via GitHub Actions)

Je hebt nu een cloud-mac workflow in:
- `.github/workflows/ios-cloud-build.yml`

Deze draait op GitHub macOS runners en bouwt:
1. **altijd** een unsigned iOS archive
2. **optioneel** een signed IPA (als secrets zijn gezet)

## 1) Repository secrets instellen
Ga naar: GitHub repo -> Settings -> Secrets and variables -> Actions -> New repository secret

Verplicht voor signed IPA:
- `IOS_CERT_BASE64` : base64 van je `.p12` signing cert
- `IOS_CERT_PASSWORD` : wachtwoord van `.p12`
- `IOS_PROFILE_BASE64` : base64 van provisioning profile `.mobileprovision`
- `IOS_TEAM_ID` : Apple Developer Team ID
- `IOS_PROFILE_NAME` : exacte naam van provisioning profile
- `IOS_BUNDLE_ID` : bundle id (bijv. `com.trackapp.signal`)

Als je deze niet zet, krijg je nog steeds unsigned archive artifacts.

## 2) Workflow starten
- GitHub -> Actions -> `iOS Cloud Build (Capacitor)` -> Run workflow

## 3) Artifact downloaden
Na success:
- `ios-unsigned-xcarchive` (altijd)
- `ios-signed-ipa` (alleen als secrets compleet zijn)

## 4) Belangrijk
- Zonder Apple signing secrets kan iPhone geen installeerbare IPA krijgen.
- Voor TestFlight upload is extra stap nodig (App Store Connect API + upload flow).
- Deze workflow houdt je bestaande webapp + Capacitor setup intact.

## Base64 helpers (lokaal)
### Windows PowerShell
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\file.p12"))
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\profile.mobileprovision"))
```
