import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// 1. Vector SVG for Click Segurança exactly matching official mark (images.png)
const clickSegurancaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" width="600" height="420">
  <defs>
    <style>
      .cs-green {
        fill: none;
        stroke: #007a3d;
        stroke-width: 52;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .cs-gold {
        fill: none;
        stroke: #f1a800;
        stroke-width: 52;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .cs-text {
        font-family: 'Montserrat', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
        font-size: 58px;
        font-weight: 900;
        fill: #000000;
        letter-spacing: -1px;
      }
    </style>
  </defs>

  <!-- Green 'C' on the left -->
  <path class="cs-green" d="M 230 115 A 82 82 0 1 0 230 235" />

  <!-- Gold Infinity loop interlinked on the right -->
  <!-- Left lobe of infinity (interlocking through green C) and Right lobe -->
  <path class="cs-gold" d="M 330 175 C 275 90, 195 95, 195 175 C 195 255, 275 260, 330 175 C 385 90, 465 95, 465 175 C 465 255, 385 260, 330 175 Z" />

  <!-- Click Segurança Text -->
  <text x="300" y="365" text-anchor="middle" class="cs-text">Click Segurança</text>
</svg>`;

// 2. Vector SVG for Copasa exactly matching official mark (COPA0002_copasa_marca_versao_completa_colorida_fundo_claro_rgb.webp)
const copasaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 280" width="820" height="280">
  <defs>
    <linearGradient id="copasaTopWave" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4d94f7" />
      <stop offset="100%" stop-color="#2468e2" />
    </linearGradient>
    <linearGradient id="copasaTopHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7ab4ff" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
    <linearGradient id="copasaBottomWave" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#194fbe" />
      <stop offset="100%" stop-color="#2569e5" />
    </linearGradient>
    <linearGradient id="copasaBottomHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#559df8" />
      <stop offset="100%" stop-color="#7ab4ff" />
    </linearGradient>
  </defs>

  <!-- Left Sphere / Wave Symbol -->
  <g transform="translate(30, 20)">
    <!-- Top-Right crescent swoop -->
    <path d="M 105 25 C 160 25, 205 70, 205 120 C 205 142, 196 162, 182 176 C 172 155, 150 126, 114 116 C 72 105, 48 76, 56 46 C 66 28, 85 25, 105 25 Z" fill="url(#copasaTopWave)" />
    <path d="M 140 45 C 176 56, 198 84, 198 118 C 198 134, 188 152, 178 162 C 168 144, 146 120, 114 114 C 132 90, 136 68, 140 45 Z" fill="url(#copasaTopHighlight)" />
    
    <!-- Bottom-Left crescent swoop -->
    <path d="M 105 215 C 50 215, 5 170, 5 120 C 5 98, 14 78, 28 64 C 38 85, 60 114, 96 124 C 138 135, 162 164, 154 194 C 144 212, 125 215, 105 215 Z" fill="url(#copasaBottomWave)" />
    <path d="M 70 195 C 34 184, 12 156, 12 122 C 12 106, 22 88, 32 78 C 42 96, 64 120, 96 126 C 78 150, 74 172, 70 195 Z" fill="url(#copasaBottomHighlight)" />
  </g>

  <!-- "copasa" Wordmark -->
  <!-- Modern geometric lowercase bold brand typography -->
  <g fill="#122d5a" transform="translate(290, 166)">
    <text font-family="'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif" font-size="142" font-weight="900" letter-spacing="-3">copasa</text>
  </g>
</svg>`;

async function run() {
  const logosDir = path.resolve('public/logos');
  if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
  }

  // Write SVGs
  fs.writeFileSync(path.join(logosDir, 'click_seguranca.svg'), clickSegurancaSvg);
  fs.writeFileSync(path.join(logosDir, 'copasa.svg'), copasaSvg);

  // Generate crisp PNGs via sharp
  const clickSegurancaPngBuffer = await sharp(Buffer.from(clickSegurancaSvg))
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(logosDir, 'click_seguranca.png'), clickSegurancaPngBuffer);

  const copasaPngBuffer = await sharp(Buffer.from(copasaSvg))
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(logosDir, 'copasa.png'), copasaPngBuffer);

  // Generate Base64 constants file
  const base64Click = `data:image/png;base64,${clickSegurancaPngBuffer.toString('base64')}`;
  const base64Copasa = `data:image/png;base64,${copasaPngBuffer.toString('base64')}`;

  const constantsContent = `// Auto-generated safety logos for PDF and Report generator
export const LOGO_COPASA_BASE64 = "${base64Copasa}";
export const LOGO_CLICK_SEGURANCA_BASE64 = "${base64Click}";

export const DEFAULT_LOGOS = {
  logo1: LOGO_CLICK_SEGURANCA_BASE64, // Click Segurança (Esquerda)
  logo2: LOGO_COPASA_BASE64           // Copasa (Direita)
};
`;

  fs.writeFileSync(path.resolve('src/constants/safetyLogos.ts'), constantsContent);
  console.log('Logos successfully generated and updated in public/logos/ and src/constants/safetyLogos.ts');
}

run().catch(console.error);
