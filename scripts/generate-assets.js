/**
 * Generate placeholder assets for Expo app
 * Run with: node scripts/generate-assets.js
 */

const fs = require('fs');
const path = require('path');

// Create a simple 1x1 transparent PNG (base64 encoded)
// This is a minimal valid PNG
const minimalPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

const assetsDir = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Generate placeholder images
const assets = [
  'icon.png',
  'splash.png',
  'adaptive-icon.png',
  'favicon.png'
];

assets.forEach(asset => {
  const filePath = path.join(assetsDir, asset);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, minimalPNG);
    console.log(`Created placeholder: ${asset}`);
  } else {
    console.log(`Skipped (already exists): ${asset}`);
  }
});

console.log('\n✅ Placeholder assets created!');
console.log('Replace these with your actual app icons and splash screens.');
