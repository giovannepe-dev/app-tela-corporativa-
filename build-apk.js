#!/usr/bin/env node

/**
 * Build APK for NEXDISPLAY using Bubblewrap
 * Run: node build-apk.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const config = {
  manifest: 'https://app-tela-corporativa.vercel.app/manifest.json',
  packageId: 'com.nexdisplay.app',
  name: 'NEXDISPLAY',
  launcherName: 'NEXDISPLAY - Gestão Inteligente',
  version: '1.0.0',
  versionCode: '1',
  minSdkVersion: '21',
  displayMode: 'standalone',
  enableNotifications: 'true',
};

console.log('🚀 Building APK for NEXDISPLAY...\n');

try {
  // Create build directory
  const buildDir = path.join(__dirname, 'bubblewrap-build');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  // Change to build directory
  process.chdir(buildDir);

  console.log('📦 Step 1: Initialize Bubblewrap...');

  // Use bubblewrap init with config file
  const initCmd = `bubblewrap init \\
    --manifest ${config.manifest} \\
    --package-id ${config.packageId} \\
    --app-name "${config.name}" \\
    --launcher-name "${config.launcherName}" \\
    --version ${config.version} \\
    --version-code ${config.versionCode} \\
    --min-sdk-version ${config.minSdkVersion} \\
    --display-mode ${config.displayMode}`;

  console.log('Running:', initCmd);
  console.log('(This may take a minute...)\n');

  try {
    execSync(initCmd, { stdio: 'inherit', shell: 'bash' });
  } catch (err) {
    console.error('❌ Init failed. Trying alternative approach...\n');

    // Try with interactive mode disabled
    const altCmd = `echo "" | bubblewrap init --manifest ${config.manifest}`;
    try {
      execSync(altCmd, { stdio: 'inherit', shell: 'bash' });
    } catch (err2) {
      console.log('ℹ️  Manual config needed. Creating web app config...\n');
    }
  }

  console.log('\n📱 Step 2: Build APK...');
  console.log('(This may take 5-10 minutes. JDK will be downloaded if needed...)\n');

  try {
    execSync('bubblewrap build', { stdio: 'inherit', shell: 'bash' });

    console.log('\n✅ APK built successfully!');
    console.log(`📁 Location: ${buildDir}/app-release.apk`);
    console.log('📲 You can now install it on Android devices!\n');

  } catch (buildErr) {
    console.error('❌ Build failed. Check the errors above.');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
