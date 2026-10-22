import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.spyOn(console, 'warn').mockImplementation(() => {});

const { pdfFriendlyUrl, pdfImage, sniffImage } = await import('./pdf-image');

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

describe('loghi nel PDF dei biglietti', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('a Cloudinary chiede il PNG, gli altri indirizzi restano uguali', () => {
    expect(pdfFriendlyUrl('https://res.cloudinary.com/demo/image/upload/v1/logo.webp')).toBe('https://res.cloudinary.com/demo/image/upload/f_png/v1/logo.webp');
    expect(pdfFriendlyUrl('https://res.cloudinary.com/demo/image/upload/f_png/v1/logo')).toBe('https://res.cloudinary.com/demo/image/upload/f_png/v1/logo');
    expect(pdfFriendlyUrl('https://example.com/logo.png')).toBe('https://example.com/logo.png');
  });

  it('riconosce PNG e JPEG dai primi byte', () => {
    expect(sniffImage(PNG)).toBe('image/png');
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(sniffImage(new TextEncoder().encode('<svg></svg>'))).toBeNull();
  });

  it('logo remoto: scaricato e incorporato; se la rete fallisce o non è un PNG/JPEG, niente logo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(PNG, { status: 200 })));
    expect(await pdfImage('https://example.com/ok.png')).toMatch(/^data:image\/png;base64,/);
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('timeout'))));
    expect(await pdfImage('https://example.com/lento.png')).toBeUndefined();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<svg/>', { status: 200 })));
    expect(await pdfImage('https://example.com/logo.svg')).toBeUndefined();
    expect(await pdfImage('http://example.com/insicuro.png')).toBeUndefined();
    expect(await pdfImage(null)).toBeUndefined();
  });

  it('logo del sito: letto da public/', async () => {
    expect(await pdfImage('/img/logo_white_fg.png')).toMatch(/^data:image\/png;base64,/);
    expect(await pdfImage('/img/../segreto.png')).toBeUndefined();
  });
});
