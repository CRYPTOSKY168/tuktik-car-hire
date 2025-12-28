const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconDir = path.join(__dirname, '../public/icons');

// Create SVG content
const createSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb"/>
      <stop offset="100%" style="stop-color:#4f46e5"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#bg)"/>
  <text x="256" y="320" font-family="Arial Black, sans-serif" font-size="220" font-weight="900" text-anchor="middle" fill="white">T</text>
  <circle cx="390" cy="140" r="40" fill="#22c55e"/>
  <path d="M370 140 L385 155 L410 125" stroke="white" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

// Ensure icons directory exists
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

async function generateIcons() {
  console.log('Generating PWA icons...');

  const svgBuffer = Buffer.from(createSvg(512));

  for (const size of sizes) {
    const outputPath = path.join(iconDir, `icon-${size}x${size}.png`);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✓ Generated: icon-${size}x${size}.png`);
  }

  // Generate Apple Touch Icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(iconDir, 'apple-touch-icon.png'));
  console.log('✓ Generated: apple-touch-icon.png');

  // Generate favicon
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(iconDir, 'favicon-32x32.png'));
  console.log('✓ Generated: favicon-32x32.png');

  await sharp(svgBuffer)
    .resize(16, 16)
    .png()
    .toFile(path.join(iconDir, 'favicon-16x16.png'));
  console.log('✓ Generated: favicon-16x16.png');

  // Generate shortcut icons
  await sharp(svgBuffer)
    .resize(96, 96)
    .png()
    .toFile(path.join(iconDir, 'shortcut-booking.png'));
  console.log('✓ Generated: shortcut-booking.png');

  await sharp(svgBuffer)
    .resize(96, 96)
    .png()
    .toFile(path.join(iconDir, 'shortcut-dashboard.png'));
  console.log('✓ Generated: shortcut-dashboard.png');

  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(console.error);
