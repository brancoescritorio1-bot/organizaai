import fs from 'fs';
import sharp from 'sharp';

// SVG for Copasa Logo
const copasaSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 240" width="700" height="240">
  <!-- Copasa Emblem (Swirl / Water sphere) -->
  <g transform="translate(40, 20)">
    <!-- Top-right crescent wave -->
    <path d="M 90 20 C 135 20, 170 55, 170 100 C 170 120, 162 138, 150 152 C 142 135, 125 110, 95 102 C 60 93, 40 70, 48 45 C 56 28, 72 20, 90 20 Z" fill="#2563eb" />
    <path d="M 120 40 C 150 48, 165 72, 165 100 C 165 115, 158 130, 148 140 C 140 125, 122 105, 95 100 C 110 80, 115 60, 120 40 Z" fill="#3b82f6" opacity="0.85" />
    
    <!-- Bottom-left crescent wave -->
    <path d="M 90 180 C 45 180, 10 145, 10 100 C 10 80, 18 62, 30 48 C 38 65, 55 90, 85 98 C 120 107, 140 130, 132 155 C 124 172, 108 180, 90 180 Z" fill="#1d4ed8" />
    <path d="M 60 160 C 30 152, 15 128, 15 100 C 15 85, 22 70, 32 60 C 40 75, 58 95, 85 100 C 70 120, 65 140, 60 160 Z" fill="#60a5fa" opacity="0.85" />
  </g>

  <!-- "copasa" text in bold dark navy -->
  <text x="250" y="142" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="115" font-weight="900" fill="#132d5e" letter-spacing="-2">copasa</text>
</svg>
`;

// SVG for Click Segurança Logo
const clickSegurancaSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350" width="500" height="350">
  <defs>
    <style>
      .infinity-green {
        fill: none;
        stroke: #007a3d;
        stroke-width: 38;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .infinity-gold {
        fill: none;
        stroke: #f2a900;
        stroke-width: 38;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .text-title {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 50px;
        font-weight: 900;
        fill: #000000;
        letter-spacing: -0.5px;
      }
    </style>
  </defs>

  <!-- Infinity Loop Icon -->
  <g transform="translate(10, 0)">
    <!-- Left Green Loop -->
    <path class="infinity-green" d="M 240 120 C 190 40, 70 40, 70 120 C 70 200, 190 200, 240 120" />
    
    <!-- Right Gold Loop -->
    <path class="infinity-gold" d="M 240 120 C 290 200, 410 200, 410 120 C 410 40, 290 40, 240 120" />
    
    <!-- Smooth overlap clip -->
    <path d="M 220 100 C 230 110, 240 120, 250 130" stroke="#007a3d" stroke-width="38" stroke-linecap="round" fill="none" />
  </g>

  <!-- Text "Click Segurança" -->
  <text x="250" y="295" text-anchor="middle" class="text-title">Click Segurança</text>
</svg>
`;

async function generate() {
  fs.writeFileSync('public/logos/copasa.svg', copasaSvg.trim());
  fs.writeFileSync('public/logos/click_seguranca.svg', clickSegurancaSvg.trim());

  await sharp(Buffer.from(copasaSvg))
    .png()
    .toFile('public/logos/copasa.png');

  await sharp(Buffer.from(clickSegurancaSvg))
    .png()
    .toFile('public/logos/click_seguranca.png');

  const copasaBuffer = await sharp(Buffer.from(copasaSvg)).png().toBuffer();
  const clickBuffer = await sharp(Buffer.from(clickSegurancaSvg)).png().toBuffer();

  const tsContent = `// Auto-generated safety logos for PDF and Report generator
export const LOGO_COPASA_BASE64 = "data:image/png;base64,${copasaBuffer.toString('base64')}";
export const LOGO_CLICK_SEGURANCA_BASE64 = "data:image/png;base64,${clickBuffer.toString('base64')}";

export const DEFAULT_LOGOS = {
  logo1: LOGO_CLICK_SEGURANCA_BASE64, // Click Segurança (Esquerda)
  logo2: LOGO_COPASA_BASE64           // Copasa (Direita)
};
`;

  fs.writeFileSync('src/constants/safetyLogos.ts', tsContent);
  console.log('Logos successfully generated and exported!');
}

generate().catch(console.error);
