@echo off
REM Build APK for NEXDISPLAY using Bubblewrap
REM Requirements: Java JDK installed

echo.
echo ============================================
echo   NEXDISPLAY APK Builder
echo ============================================
echo.

REM Create build directory
if not exist bubblewrap-build mkdir bubblewrap-build
cd bubblewrap-build

echo [1/3] Initializing Bubblewrap...
echo This will download JDK if needed (first time only)
echo.

echo Y | bubblewrap init ^
  --manifest https://app-tela-corporativa.vercel.app/manifest.json ^
  --package-id com.nexdisplay.app ^
  --app-name NEXDISPLAY ^
  --launcher-name "NEXDISPLAY - Gestao Inteligente" ^
  --version 1.0.0 ^
  --version-code 1 ^
  --min-sdk-version 21

if errorlevel 1 (
  echo.
  echo [!] Init created config files or already exists
  echo Continuing with build...
  echo.
)

echo.
echo [2/3] Generating keystore for signing...
echo This is required for Google Play
echo.

REM Skip if already exists
if not exist app.keystore (
  keytool -genkey -v -keystore app.keystore ^
    -keyalg RSA -keysize 2048 -validity 10000 ^
    -alias nexdisplay ^
    -storepass nexdisplay123 ^
    -keypass nexdisplay123 ^
    -dname "CN=NEXDISPLAY, O=Your Company, C=BR"
)

echo.
echo [3/3] Building APK...
echo This may take 5-10 minutes on first build
echo.

bubblewrap build

if errorlevel 0 (
  echo.
  echo ============================================
  echo   SUCCESS!
  echo ============================================
  echo.
  echo APK Location: %cd%\app-release.apk
  echo.
  echo Next steps:
  echo 1. Download app-release.apk to your phone
  echo 2. Enable "Unknown Sources" in Android settings
  echo 3. Install the APK
  echo.
  echo To publish on Google Play:
  echo - Sign up: https://play.google.com/console
  echo - Upload APK with same keystore
  echo.
) else (
  echo.
  echo ============================================
  echo   BUILD FAILED
  echo ============================================
  echo.
  echo Check errors above
  echo.
)

pause
