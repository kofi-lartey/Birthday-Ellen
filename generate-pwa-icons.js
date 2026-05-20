import sharp from 'sharp';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const logoUrl = 'https://res.cloudinary.com/djjgkezui/image/upload/v1778959179/IMG-20260516-WA0050_zegaok.jpg';
const publicDir = path.join(process.cwd(), 'public');
const iconsDir = path.join(publicDir, 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes to generate (including maskable)
const iconSizes = [72, 96, 128, 144, 152, 192, 256, 384, 512];
const maskableSize = 512;

// Download the logo
async function downloadLogo() {
  try {
    const response = await axios({
      url: logoUrl,
      method: 'GET',
      responseType: 'stream'
    });
    const chunks = [];
    for await (const chunk of response.data) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Error downloading logo:', error.message);
    process.exit(1);
  }
}

// Generate regular icon
async function generateIcon(buffer, size, fileName) {
  try {
    await sharp(buffer)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .toFile(path.join(iconsDir, fileName));
    console.log(`Generated ${fileName}`);
  } catch (error) {
    console.error(`Error generating ${fileName}:`, error.message);
  }
}

// Generate maskable icon with padding (safe zone)
async function generateMaskableIcon(buffer, size, fileName) {
  try {
    // Calculate padding (typically 1/6 of the size for maskable icons)
    const padding = Math.floor(size / 6);
    const innerSize = size - 2 * padding;

    await sharp(buffer)
      .resize(innerSize, innerSize, {
        fit: 'inside',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(path.join(iconsDir, fileName));
    console.log(`Generated ${fileName} (maskable)`);
  } catch (error) {
    console.error(`Error generating ${fileName}:`, error.message);
  }
}

async function main() {
  console.log('Downloading logo...');
  const logoBuffer = await downloadLogo();

  console.log('Generating icons...');
  // Generate regular icons
  for (const size of iconSizes) {
    await generateIcon(logoBuffer, size, `icon-${size}x${size}.png`);
  }

  // Generate maskable icon
  await generateMaskableIcon(logoBuffer, maskableSize, `icon-${maskableSize}x${maskableSize}-maskable.png`);

  console.log('Icon generation complete!');
}

main();