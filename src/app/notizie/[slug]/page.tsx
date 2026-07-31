import { notFound } from 'next/navigation';
import { getNewsBySlug } from '@/lib/data/news';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import FormattedText from '@/components/ui/FormattedText';
import ShareButtons from '@/components/ui/ShareButtons';
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

  return (
    <div style={{ paddingTop: '5rem', background: 'var(--neutral-950)', minHeight: '100vh' }}>
      
      {/* ── Hero ── */}
      <div style={{ position: 'relative', overflow: 'hidden', minHeight: news.coverImage ? '50vh' : 'auto', padding: news.coverImage ? 0 : '4rem 0' }}>
        {news.coverImage && (
          <>
            <Image
              src={news.coverImage}
              alt={news.title}
              fill
              style={{ objectFit: 'cover', objectPosition: 'center' }}
              priority
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,12,18,0.3) 0%, rgba(10,12,18,0.95) 100%)' }} />
          </>
        )}
        
        <div style={{ 
          position: news.coverImage ? 'absolute' : 'relative',
          bottom: 0, left: '50%', transform: 'translateX(-50%)', 
          width: '100%', maxWidth: '800px', padding: '2rem'
        }}>
          <Link href="/notizie" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '1.5rem', transition: 'color 0.2s' }}>
            <ArrowLeft size={14} /> Torna alle notizie
          </Link>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', color: news.coverImage ? 'var(--neutral-300)' : 'var(--neutral-400)', fontSize: '0.85rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={14} />
              {new Date(news.publishedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            {news.author && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={14} />
                {news.author}
              </span>
            )}
          </div>

          <FormattedText as="h1" style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 500, color: 'var(--color-heading)', lineHeight: 1.2, marginBottom: '0' }} text={news.title} />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="section" style={{ paddingTop: '2rem' }}>
        <div className="section-inner" style={{ maxWidth: '800px' }}>
          
          {/* Accent bar */}
          <div style={{ height: '2px', width: '60px', background: 'var(--gold-500)', marginBottom: '2.5rem' }} />

          {/* Content */}
          <div style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--neutral-300)' }}>
            {news.content.split('\n').filter(Boolean).map((para, i) => (
              <FormattedText key={i} as="p" style={{ marginBottom: '1.5rem' }} text={para.trim()} />
            ))}
          </div>
          
          <ShareButtons title={news.title} />

          {/* Share / Footer */}
          <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--neutral-800)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/notizie" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowLeft size={16} /> Tutte le notizie
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
