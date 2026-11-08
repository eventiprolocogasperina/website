import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllNews } from '@/lib/data/news';
import { loadEventCards } from '@/server/public/event-cards';
import { EventCardV3, NewsCardV3, V3Page } from '@/components/site/ui';

export const metadata: Metadata = {
  title: 'Pro Loco Gasperina APS — Cultura, Tradizioni e Turismo a Gasperina',
  description: 'La Pro Loco Gasperina APS promuove la cultura, le tradizioni e il turismo nel borgo calabrese di Gasperina. Scopri gli eventi, i progetti e la bellezza del territorio.',
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [{ upcoming, past }, news] = await Promise.all([loadEventCards(), getAllNews().catch(() => [])]);
  // Con eventi in arrivo la griglia li mostra; altrimenti gli ultimi conclusi e il pannello "Prossima edizione".
  const cards = (upcoming.length ? upcoming : past).slice(0, 3);

  return (
    <V3Page>
      <section className="home-hero">
        <span className="eyebrow">Gasperina · Calabria · dal 1995</span>
        <h1 className="h1">
          La nostra terra, <span>la nostra storia.</span>
        </h1>
        <p className="lede">Pro Loco Gasperina APS valorizza la cultura, le tradizioni e il turismo del nostro borgo calabrese. Unisciti a noi.</p>
        <div className="actions">
          <Link className="vbtn vbtn-gold" href="/eventi">Prossimi eventi</Link>
          <Link className="vbtn vbtn-line" href="/iscriviti">Diventa socio</Link>
        </div>
        <div className="pstack">
          <Image src="/img/IMG_3.jpg" alt="Gasperina vista dall'alto" width={900} height={700} priority sizes="(max-width: 960px) 100vw, 600px" />
          <Image src="/img/assaggia-2026/A%26P_S-23.webp" alt="Le rughe illuminate durante Assaggia & Passeggia" width={500} height={500} sizes="300px" />
        </div>
        <div className="seal">
          <span>
            <small>Pro Loco APS</small>dal 1995
          </span>
        </div>
      </section>

      <section className="panel p-cream">
        <div className="split" style={{ alignItems: 'end' }}>
          <div>
            <span className="eyebrow">Chi siamo</span>
            <h2 className="h2">Promuovere, valorizzare, connettere.</h2>
          </div>
          <div>
            <p className="lede" style={{ margin: '0 0 26px' }}>
              Un&apos;associazione di promozione sociale apartitica e senza scopo di lucro: organizziamo eventi, curiamo progetti culturali e rafforziamo il senso di comunità del borgo.
            </p>
            <div className="stats">
              <div className="stat"><b>30+</b><span>anni dalla fondazione</span></div>
              <div className="stat"><b>7+</b><span>eventi ogni anno</span></div>
              <div className="stat"><b>450 m</b><span>sul livello del mare</span></div>
            </div>
          </div>
        </div>
      </section>

      {cards.length > 0 && (
        <section className="panel p-gold">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Calendario</span>
              <h2 className="h2">I nostri eventi.</h2>
            </div>
            <Link className="vbtn vbtn-blue" href="/eventi">Tutti gli eventi</Link>
          </div>
          <div className="grid g3">
            {cards.map((event) => (
              <EventCardV3 key={event.id} event={event} past={!upcoming.length} />
            ))}
          </div>
        </section>
      )}

      {!upcoming.length && (
        <section className="panel p-blued">
          <div className="split">
            <div>
              <span className="eyebrow">Prossima edizione</span>
              <h2 className="h2">Al momento non ci sono eventi in calendario.</h2>
              <p className="lede" style={{ marginTop: 18 }}>Segui le pagine dei nostri eventi: l&apos;iscrizione &laquo;Avvisami&raquo; ti scrive appena apre la vendita dei biglietti della prossima edizione.</p>
              <div className="actions" style={{ marginTop: 22 }}>
                <Link className="vbtn vbtn-gold" href="/zuccaland">Zuccaland</Link>
                <Link className="vbtn vbtn-line" href="/assaggia-e-passeggia">Assaggia &amp; Passeggia</Link>
              </div>
            </div>
            <div className="rows">
              <div className="row">
                <Image src="/img/zuccaland/Pumpink.png" alt="" width={76} height={76} />
                <div><h3 className="h3">Biglietti online</h3><p>Acquisti dal sito e ricevi via email il biglietto con codice QR.</p></div>
              </div>
              <div className="row">
                <Image src="/img/assaggia-2026/A%26P_M-186.webp" alt="" width={76} height={76} />
                <div><h3 className="h3">Volontariato</h3><p>Ogni evento è possibile grazie ai volontari. Scrivici per dare una mano.</p></div>
              </div>
              <div className="row">
                <Image src="/img/IMG1.jpg" alt="" width={76} height={76} />
                <div><h3 className="h3">Diventa socio</h3><p>Quota annuale di 20 €: partecipi alla vita dell&apos;associazione.</p></div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="panel p-bluel">
        <div className="split">
          <div className="collage">
            <Image src="/img/IMG_2.jpg" alt="Gasperina vista dall'alto" width={700} height={900} sizes="(max-width: 960px) 60vw, 400px" />
            <Image src="/img/IMG1.jpg" alt="Centro storico di Gasperina" width={500} height={400} sizes="(max-width: 960px) 40vw, 260px" />
            <Image src="/img/assaggia-2026/A%26P_S-81.webp" alt="Le scalinate del centro storico" width={500} height={400} sizes="(max-width: 960px) 40vw, 260px" />
          </div>
          <div>
            <span className="eyebrow">Il nostro territorio</span>
            <h2 className="h2">Scopri Gasperina.</h2>
            <p className="lede" style={{ marginTop: 18 }}>
              Arroccata sulle colline della Calabria centrale, a pochi chilometri dal Mar Ionio, Gasperina è un borgo di antiche tradizioni e paesaggi mozzafiato. Dal centro storico alle vedute sul Golfo di Squillace, ogni angolo racconta secoli di storia.
            </p>
            <ul style={{ margin: '0 0 28px', paddingLeft: 20, lineHeight: 1.9, listStyle: 'disc' }}>
              <li>Tradizioni popolari e artigianato locale</li>
              <li>Gastronomia tipica calabrese</li>
              <li>Sentieri naturalistici e panorami sul Jonio</li>
              <li>Storia e architettura del borgo medievale</li>
            </ul>
            <Link className="vbtn vbtn-blue" href="/scopri-gasperina">Esplora il territorio</Link>
          </div>
        </div>
      </section>

      {news.length > 0 && (
        <section className="panel p-cream">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Notizie &amp; avvisi</span>
              <h2 className="h2">Ultime notizie.</h2>
            </div>
            <Link className="vbtn vbtn-blue" href="/notizie">Tutte le notizie</Link>
          </div>
          <div className="grid g3">
            {news.slice(0, 3).map((article) => (
              <NewsCardV3 key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}

      <section className="panel p-white">
        <div className="split">
          <p className="quote">&ldquo;Gasperina non è solo un luogo: è un sentimento, una radice, un legame che non si spezza con la distanza.&rdquo;</p>
          <div>
            <p className="lede">Ogni anno la Pro Loco porta avanti la tradizione e la cultura locale con passione e dedizione, per l&apos;intera comunità.</p>
            <p className="muted" style={{ fontWeight: 600 }}>— Consiglio Direttivo, Pro Loco Gasperina APS</p>
            <div className="actions" style={{ marginTop: 22 }}>
              <Link className="vbtn vbtn-gold" href="/iscriviti">Diventa socio</Link>
              <Link className="vbtn vbtn-line" href="/sponsor">Sostienici come sponsor</Link>
            </div>
          </div>
        </div>
      </section>
    </V3Page>
  );
}
