// Format/size exports from the original logo; no extra image dependencies.
const { app, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

app.whenReady().then(() => {
  const directory = path.resolve(__dirname, '../public/branding');
  const source = nativeImage.createFromPath(path.join(directory, 'logo-source.png'));
  if (source.isEmpty()) throw new Error('Cannot read the logo source.');
  const png = size => source.resize({ width: size, height: size, quality: 'best' }).toPNG();
  for (const size of [32, 64, 128, 256, 512, 1024]) {
    fs.writeFileSync(path.join(directory, `logo-${size}.png`), png(size));
  }

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const frames = sizes.map(png);
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((size, i) => {
    const entry = 6 + i * 16;
    header[entry] = header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(frames[i].length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += frames[i].length;
  });
  fs.writeFileSync(path.join(directory, 'icon.ico'), Buffer.concat([header, ...frames]));

  const chunks = [['icp4', 16], ['icp5', 32], ['icp6', 64], ['ic07', 128],
    ['ic08', 256], ['ic09', 512], ['ic10', 1024]].map(([type, size]) => {
    const image = png(size);
    const chunk = Buffer.alloc(8);
    chunk.write(type, 0, 4, 'ascii');
    chunk.writeUInt32BE(8 + image.length, 4);
    return Buffer.concat([chunk, image]);
  });
  const icnsHeader = Buffer.alloc(8);
  icnsHeader.write('icns', 0, 4, 'ascii');
  icnsHeader.writeUInt32BE(8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0), 4);
  fs.writeFileSync(path.join(directory, 'icon.icns'), Buffer.concat([icnsHeader, ...chunks]));
  console.log('Generated PNG, multi-resolution ICO, and ICNS icons in public/branding.');
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
