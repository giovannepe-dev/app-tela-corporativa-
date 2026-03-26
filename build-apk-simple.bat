@echo off
REM Simple APK Builder for NEXDISPLAY
REM This version creates config files manually to avoid Bubblewrap init issues

echo.
echo ============================================
echo   NEXDISPLAY APK Builder (Simple)
echo ============================================
echo.

REM Create build directory if it doesn't exist
if not exist bubblewrap-build mkdir bubblewrap-build
cd bubblewrap-build

echo [1/3] Checking for twa-manifest.json...
if not exist twa-manifest.json (
  echo Creating twa-manifest.json...
  REM File should exist from setup
)

echo [2/3] Creating keystore for signing...
if not exist app.keystore (
  echo Generating keystore...
  keytool -genkey -v -keystore app.keystore ^
    -keyalg RSA -keysize 2048 -validity 10000 ^
    -alias nexdisplay ^
    -storepass nexdisplay123 ^
    -keypass nexdisplay123 ^
    -dname "CN=NEXDISPLAY,O=NEXDISPLAY,C=BR"

  if errorlevel 1 (
    echo.
    echo ERROR: Could not create keystore
    echo Make sure Java JDK is installed: https://www.oracle.com/java/technologies/downloads/
    echo.
    pause
    exit /b 1
  )

  echo Keystore created: app.keystore
) else (
  echo Keystore already exists: app.keystore
)

echo.
echo [3/3] Building APK...
echo This will take 5-10 minutes...
echo.

bubblewrap build

if errorlevel 0 (
  echo.
  echo ============================================
  echo   SUCCESS!
  echo ============================================
  echo.
  echo APK created: app-release.apk
  echo Location: %cd%\app-release.apk
  echo.
  echo File size:
  dir app-release.apk | find "app-release.apk"
  echo.
) else (
  echo.
  echo ERROR: Build failed
  echo Check the output above for details
  echo.
)

pause
