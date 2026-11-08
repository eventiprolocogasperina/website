import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllNews } from '@/lib/data/news';
import FormattedText from '@/components/ui/FormattedText';
import { NewsCardV3, PageHero, V3Page, excerptOf, newsDate } from '@/components/site/ui';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Notizie - Pro Loco Gasperina',
  description: 'Resta aggiornato su tutte le novità, le iniziative e gli avvisi della Pro Loco Gasperina.',
};

export default async function NotiziePage() {
  const news = await getAllNews();
  // La prima notizia "in evidenza" (o la più recente) apre la pagina; le altre stanno in griglia.
  const lead = news.find((n) => n.featured) ?? news[0];
  const rest = news.filter((n) => n !== lead);

  return (
    <V3Page>
      <PageHero eyebrow="Comunicazioni ufficiali" title="Notizie" accent="& avvisi." lede="Resta aggiornato su tutte le novità, le iniziative e le comunicazioni ufficiali della Pro Loco." />

      <section className="panel p-cream">
        {!lead ? (
          <p className="lede" role="status">Nessuna notizia pubblicata al momento.</p>
        ) : (
          <>
            <Link className="lead-news" href={`/notizie/${lead.slug}`}>
              {lead.coverImage ? <Image src={lead.coverImage} alt="" width={1000} height={700} priority sizes="(max-width: 960px) 100vw, 600px" /> : <div className="news-ph" />}
              <div className="body">
                {lead.featured && <span className="tag">In evidenza</span>}{' '}
                <time className="muted" dateTime={lead.publishedAt} style={{ fontWeight: 600, fontSize: 14, marginLeft: 8 }}>{newsDate(lead.publishedAt)}</time>
                <FormattedText as="h2" className="h2" style={{ fontSize: 'clamp(34px,3.6vw,52px)', margin: '18px 0 16px' }} text={lead.title} />
                <p>{excerptOf(lead.content, 220)}</p>
                <span className="vbtn vbtn-blue" style={{ marginTop: 10 }}>Leggi tutto</span>
              </div>
            </Link>
            {rest.length > 0 && (
              <div className="grid g3" style={{ marginTop: 24 }}>
                {rest.map((n) => (
                  <NewsCardV3 key={n.id} article={n} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </V3Page>
  );
}
