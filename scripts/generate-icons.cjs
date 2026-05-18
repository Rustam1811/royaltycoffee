/**
 * Generate app icons for iOS and Android from the project logo.
 * Uses the circular logo from public/images/logo.png, crops to square,
 * adds background color, and generates all required sizes.
 *
 * Usage: node scripts/generate-icons.cjs
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const LOGO = path.resolve(__dirname, '../public/images/logo.png');
const BANNER = path.resolve(__dirname, '../public/images/3.png');
const BG_COLOR = '#3D0A11'; // dark brown from theme_color
const SPLASH_BG = '#F4EDE4'; // cream background for splash

// Android adaptive icon: foreground layer (centered logo with padding)
const ANDROID_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};
const ANDROID_FOREGROUND_SIZE = 432; // 108dp * 4 for xxxhdpi (adaptive icon spec)

// iOS: single 1024x1024
const IOS_SIZE = 1024;

// PWA icons
const PWA_SIZES = [192, 512];

async function main() {
  console.log('Reading logo...');
  const logoMeta = await sharp(LOGO).metadata();
  console.log(`Logo: ${logoMeta.width}x${logoMeta.height}`);

  // Crop to square (center crop)
  const size = Math.min(logoMeta.width, logoMeta.height);
  const left = Math.floor((logoMeta.width - size) / 2);
  const top = Math.floor((logoMeta.height - size) / 2);

  const squareLogo = sharp(LOGO).extract({ left, top, width: size, height: size });

  // --- iOS icon (1024x1024, with background) ---
  console.log('\n--- iOS ---');
  const iosDir = path.resolve(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset');
  
  const iosIcon = await sharp({
    create: { width: IOS_SIZE, height: IOS_SIZE, channels: 4, background: BG_COLOR }
  })
    .composite([{
      input: await squareLogo.clone().resize(Math.round(IOS_SIZE * 0.75), Math.round(IOS_SIZE * 0.75), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
      gravity: 'center'
    }])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(iosDir, 'AppIcon-512@2x.png'), iosIcon);
  console.log(`  AppIcon-512@2x.png (${IOS_SIZE}x${IOS_SIZE})`);

  // --- Android icons ---
  console.log('\n--- Android ---');
  const androidResDir = path.resolve(__dirname, '../android/app/src/main/res');

  // Generate foreground layer (logo with safe zone padding)
  const fgBuffer = await sharp({
    create: { width: ANDROID_FOREGROUND_SIZE, height: ANDROID_FOREGROUND_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{
      input: await squareLogo.clone().resize(Math.round(ANDROID_FOREGROUND_SIZE * 0.60), Math.round(ANDROID_FOREGROUND_SIZE * 0.60), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
      gravity: 'center'
    }])
    .png()
    .toBuffer();

  for (const [folder, px] of Object.entries(ANDROID_SIZES)) {
    const dir = path.join(androidResDir, folder);
    
    // ic_launcher.png — filled square with logo
    const launcherBuf = await sharp({
      create: { width: px, height: px, channels: 4, background: BG_COLOR }
    })
      .composite([{
        input: await squareLogo.clone().resize(Math.round(px * 0.75), Math.round(px * 0.75), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
        gravity: 'center'
      }])
      .png()
      .toBuffer();
    
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), launcherBuf);
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), launcherBuf);

    // ic_launcher_foreground.png — scaled foreground for adaptive icon
    const fgScaled = await sharp(fgBuffer).resize(px, px).png().toBuffer();
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fgScaled);

    console.log(`  ${folder}: ic_launcher.png, ic_launcher_round.png, ic_launcher_foreground.png (${px}x${px})`);
  }

  // Create/update ic_launcher_background.xml for adaptive icons
  const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${BG_COLOR}</color>
</resources>
`;
  const valuesDir = path.join(androidResDir, 'values');
  if (!fs.existsSync(valuesDir)) fs.mkdirSync(valuesDir, { recursive: true });
  fs.writeFileSync(path.join(valuesDir, 'ic_launcher_background.xml'), bgXml);
  console.log('  values/ic_launcher_background.xml');

  // --- Splash screens ---
  console.log('\n--- Splash Screens ---');
  const splashDensities = {
    'drawable': 480,
    'drawable-land-mdpi': 480,
    'drawable-land-hdpi': 800,
    'drawable-land-xhdpi': 1280,
    'drawable-land-xxhdpi': 1600,
    'drawable-land-xxxhdpi': 1920,
    'drawable-port-mdpi': 480,
    'drawable-port-hdpi': 800,
    'drawable-port-xhdpi': 1280,
    'drawable-port-xxhdpi': 1600,
    'drawable-port-xxxhdpi': 1920,
  };

  for (const [folder, maxDim] of Object.entries(splashDensities)) {
    const dir = path.join(androidResDir, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const isLand = folder.includes('land');
    const w = isLand ? maxDim : Math.round(maxDim * 0.5625);
    const h = isLand ? Math.round(maxDim * 0.5625) : maxDim;
    // Use banner (3.png) for splash — scale to fit 70% of width
    const bannerW = Math.round(w * 0.70);
    const bannerH = Math.round(bannerW * (454 / 1215)); // keep aspect ratio

    const splashBuf = await sharp({
      create: { width: w, height: h, channels: 4, background: SPLASH_BG }
    })
      .composite([{
        input: await sharp(BANNER).resize(bannerW, bannerH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
        gravity: 'center'
      }])
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(dir, 'splash.png'), splashBuf);
    console.log(`  ${folder}/splash.png (${w}x${h})`);
  }

  // --- PWA icons ---
  console.log('\n--- PWA Icons ---');
  const publicDir = path.resolve(__dirname, '../public');

  for (const px of PWA_SIZES) {
    const iconBuf = await sharp({
      create: { width: px, height: px, channels: 4, background: BG_COLOR }
    })
      .composite([{
        input: await squareLogo.clone().resize(Math.round(px * 0.75), Math.round(px * 0.75), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
        gravity: 'center'
      }])
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(publicDir, `icon-${px}.png`), iconBuf);
    console.log(`  icon-${px}.png`);
  }

  // Maskable icon (512 with more padding)
  const maskBuf = await sharp({
    create: { width: 512, height: 512, channels: 4, background: BG_COLOR }
  })
    .composite([{
      input: await squareLogo.clone().resize(Math.round(512 * 0.60), Math.round(512 * 0.60), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
      gravity: 'center'
    }])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-512-maskable.png'), maskBuf);
  console.log('  icon-512-maskable.png');

  // Favicon
  const faviconBuf = await sharp({
    create: { width: 64, height: 64, channels: 4, background: BG_COLOR }
  })
    .composite([{
      input: await squareLogo.clone().resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
      gravity: 'center'
    }])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), faviconBuf);
  console.log('  favicon.png');

  console.log('\nDone! All icons generated.');
}

main().catch(console.error);
