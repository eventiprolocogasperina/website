import { describe, expect, it } from 'vitest';
import { photoLoader } from './photo';

describe('photoLoader', () => {
  const url = 'https://res.cloudinary.com/demo/image/upload/v1/albums/zuccaland-2026/foto.webp';

  it('fa ridimensionare a Cloudinary le foto degli album', () => {
    const { loader } = photoLoader(url);
    expect(loader!({ src: url, width: 640 })).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/v1/albums/zuccaland-2026/foto.webp');
    expect(loader!({ src: url, width: 1920, quality: 90 })).toContain('/upload/f_auto,q_90,c_limit,w_1920/v1/');
  });

  it('lascia a next/image le foto in public/', () => {
    expect(photoLoader('/img/assaggia-2026/foto.webp')).toEqual({});
  });
});
