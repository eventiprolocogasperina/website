import { notFound } from 'next/navigation';
import { getNewsBySlug } from '@/lib/data/news';
import Image from 'next/image';
import Link from 'next/link';
import FormattedText from '@/components/ui/FormattedText';
import ShareButtons from '@/components/ui/ShareButtons';
import PhotoGallery from '@/components/ui/PhotoGallery';
import { V3Page, newsDate } from '@/components/site/ui';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const news = await getNewsBySlug(slug);
  if (!news) return { title: 'Notizia non trovata' };
  
  return { 
    title: `${news.title} - Pro Loco Gasperina`,
    description: news.content.substring(0, 150),
    openGraph: {
      title: news.title,
      description: news.content.substring(0, 150),
      images: news.coverImage ? [{ url: news.coverImage }] : undefined,
      type: 'article',
    },
    alternates: {
      canonical: `https://prolocogasperina.it/notizie/${news.slug}`,
    }
  };
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const news = await getNewsBySlug(slug);

  if (!news) notFound();

  const photos = news.config?.carouselPhotos;

  return (
    <V3Page>
      <section className="hero">
        <Link className="crumb" href="/notizie">← Torna alle notizie</Link>
        <br />
        <span className="eyebrow">
          {newsDate(news.publishedAt)}
          {news.author ? ` · ${news.author}` : ''}
        </span>
        <FormattedText as="h1" className="h1" style={{ fontSize: 'clamp(40px,5.4vw,84px)', maxWidth: '18ch' }} text={news.title} />
      </section>

      <section className="panel p-white">
        <div className="split" style={{ alignItems: 'start', gridTemplateColumns: news.coverImage ? '1.5fr 1fr' : '1fr' }}>
          <article className="prose">
            {news.content.split('\n').filter(Boolean).map((para, i) => (
              <FormattedText key={i} as="p" text={para.trim()} />
            ))}
            <ShareButtons title={news.title} />
          </article>
          {news.coverImage && (
            <aside style={{ display: 'grid', gap: 18 }}>
              <div className="roundpic">
                <Image src={news.coverImage} alt={news.title} width={700} height={700} priority sizes="(max-width: 960px) 100vw, 440px" />
              </div>
            </aside>
          )}
        </div>
        {photos && photos.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <PhotoGallery photos={photos} />
          </div>
        )}
        <div className="actions" style={{ marginTop: 40 }}>
          <Link className="vbtn vbtn-blue" href="/notizie">Tutte le notizie</Link>
        </div>
      </section>
    </V3Page>
  );
}
