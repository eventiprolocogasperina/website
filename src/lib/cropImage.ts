export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Set canvas dimensions to the cropped size (downscale if necessary)
  const MAX_WIDTH = 1600;
  const MAX_HEIGHT = 1600;
  
  let targetWidth = pixelCrop.width;
  let targetHeight = pixelCrop.height;
  
  if (targetWidth > MAX_WIDTH) {
    targetHeight *= MAX_WIDTH / targetWidth;
    targetWidth = MAX_WIDTH;
  }
  if (targetHeight > MAX_HEIGHT) {
    targetWidth *= MAX_HEIGHT / targetHeight;
    targetHeight = MAX_HEIGHT;
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          console.error('Canvas is empty');
          return reject(new Error('Canvas is empty'));
        }
        resolve(blob);
      },
      'image/jpeg',
      0.85
    );
  });
}
