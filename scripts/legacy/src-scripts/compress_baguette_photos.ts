import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SOURCE_DIR = '/Volumes/Extreme SSD/2026/Baguette/Export';
const TARGET_DIR = path.join(process.cwd(), 'public', 'img', 'baguette-2026');
const OUTPUT_JSON = path.join(process.cwd(), 'src', 'lib', 'data', 'baguette-2026-gallery.json');

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tiff', '.webp'];

interface PhotoData {
  src: string;
  width: number;
  height: number;
}

async function getFilesRecursively(dir: string): Promise<string[]> {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFilesRecursively(res) : res;
  }));
  return Array.prototype.concat(...files);
}

async function processPhotos() {
  console.log(`Searching for photos in ${SOURCE_DIR}...`);
  
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  let files: string[] = [];
  try {
    files = await getFilesRecursively(SOURCE_DIR);
  } catch (error) {
    console.error('Error reading source directory:', error);
    process.exit(1);
  }

  const imageFiles = files.filter(f => 
    ALLOWED_EXTENSIONS.includes(path.extname(f).toLowerCase()) && 
    !f.includes('__MACOSX') && 
    !path.basename(f).startsWith('.')
  );

  console.log(`Found ${imageFiles.length} images to process.`);
  
  const galleryData: PhotoData[] = [];
  let count = 0;

  for (const file of imageFiles) {
    count++;
    const ext = path.extname(file);
    const basename = path.basename(file, ext).replace(/\s+/g, '_');
    const newFilename = `${basename}.webp`;
    const targetPath = path.join(TARGET_DIR, newFilename);
    const webPath = `/img/baguette-2026/${newFilename}`;

    try {
      // Check if already processed to save time on reruns
      if (fs.existsSync(targetPath)) {
        console.log(`[${count}/${imageFiles.length}] Skipping existing: ${newFilename}`);
        const metadata = await sharp(targetPath).metadata();
        galleryData.push({
          src: webPath,
          width: metadata.width || 1920,
          height: metadata.height || 1080
        });
        continue;
      }

      console.log(`[${count}/${imageFiles.length}] Processing: ${basename}${ext} -> ${newFilename}`);
      
      const image = sharp(file);
      const metadata = await image.metadata();
      
      // Auto-orient based on EXIF, resize to max 1920x1920, convert to WebP
      const processed = await image
        .rotate() // Auto orient
        .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toFile(targetPath);

      galleryData.push({
        src: webPath,
        width: processed.width,
        height: processed.height
      });
    } catch (err) {
      console.error(`Failed to process ${file}:`, err);
    }
  }

  // Save the JSON data
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(galleryData, null, 2));
  console.log(`\nDone! Processed ${galleryData.length} images.`);
  console.log(`JSON data saved to: ${OUTPUT_JSON}`);
}

processPhotos();
