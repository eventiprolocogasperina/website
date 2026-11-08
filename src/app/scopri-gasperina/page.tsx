import Image from 'next/image';
import type { Metadata } from 'next';
import { PageHero, V3Page } from '@/components/site/ui';

export const metadata: Metadata = {
  title: 'Scopri Gasperina',
  description: 'Scopri la storia, la cultura, le tradizioni e i luoghi di interesse di Gasperina, splendido borgo della Calabria centrale.',
};

const pois = [
  { nome: 'Santuario della Madonna dei Termini', cat: 'Religioso', desc: 'Luogo di grande devozione popolare, legato alla leggenda della statua della Madonna ritrovata in mare e trasportata su un carro trainato da buoi.' },
  { nome: 'Belvedere sul Golfo di Squillace', cat: 'Panorama', desc: 'Vista mozzafiato sul Mar Ionio: nelle giornate più limpide lo sguardo arriva fino a Punta Stilo e Capo Rizzuto.' },
  { nome: 'Centro Storico – Le Rughe', cat: 'Cultura', desc: 'Strette viuzze, archi in pietra e scalinate intrecciate. I "vicoli" nel dialetto locale rivelano antichi palazzi nobiliari e chiese storiche.' },
  { nome: 'Parco Naturale delle Serre', cat: 'Natura', desc: 'A pochi chilometri da Gasperina, boschi di faggio e castagno tra le Serre Calabresi, già frequentate dai monaci certosini.' },
];

const foods = [
  { nome: 'Vino di Gasperina', desc: 'La produzione vinicola di Gasperina vanta una tradizione secolare, apprezzata ben oltre i confini locali. Un vino autentico che racconta il territorio.' },
  { nome: "Olio extravergine d'oliva", desc: 'Gli uliveti gasperinesi producono un olio di qualità eccellente, frutto di una vocazione agricola tramandata da generazioni tra le colline della Calabria ionica.' },
  { nome: 'Buccunotti', desc: 'Dolci tipici della tradizione gasperinese, fragranti e ripieni di marmellata o crema. Uno dei simboli della pasticceria locale.' },
  { nome: 'Zzìppuli', desc: "Frittelle natalizie preparate con un impasto di farina, acqua, sale e lievito, fritte in abbondante olio d'oliva. La variante con l'acciuga è tipicamente gasperinese." },
  { nome: 'Cuzzupi', desc: 'Biscotti pasquali dalla forma intrecciata, decorati con uova fresche intere che diventano sode durante la cottura. La forma classica è grande e rotonda.' },
  { nome: 'Chjàcchjari & Nguanti', desc: 'Dolci di Carnevale a base di acqua, uova e farina, ricoperti di zucchero a velo. Croccanti e leggeri, accompagnano le feste del periodo carnevalesco.' },
  { nome: 'Muruneḍi', desc: 'Dolci tradizionali a base di mosto cotto, legati alla stagione della vendemmia. Un connubio tra la tradizione vinicola e quella dolciaria del territorio.' },
  { nome: 'Taralli pasquali', desc: "Biscotti secchi a pasta dura del periodo pasquale, spesso ricoperti da una glassa bianca chiamata 'u nnaspu. Croccanti e profumati, sono un classico della Pasqua gasperinese." },
];

export default function ScopriGasperinaPage() {
  return (
    <V3Page>
      <PageHero
        eyebrow="450 m s.l.m. · Calabria centrale"
        title="Scopri"
        accent="Gasperina."
        lede="Arroccata a circa 500 metri sul livello del mare, Gasperina è una vera terrazza naturale affacciata sul Golfo di Squillace: un piccolo gioiello della Calabria ionica, capace di sorprendere con la sua autenticità e il suo fascino senza tempo."
        image="/img/IMG_2.jpg"
        imageAlt="Gasperina vista aerea"
      />

      <section id="storia" className="panel p-cream">
        <div className="split">
          <div>
            <span className="eyebrow">Le radici</span>
            <h2 className="h2">Storia e identità.</h2>
            <p style={{ marginTop: 22 }}>
              Le origini di Gasperina risalgono almeno all&apos;XI secolo, in epoca medievale, ma è probabile che il territorio fosse già abitato tra il VII e l&apos;VIII secolo, quando le popolazioni costiere cercavano rifugio sulle alture per sfuggire alle incursioni saracene. Nel corso dei secoli, il borgo è stato influenzato da diverse dominazioni, tra cui quella normanna e quella sveva, che hanno contribuito a modellarne l&apos;identità culturale e architettonica.
            </p>
            <p>
              Un ruolo importante nella storia locale è stato svolto dai monaci certosini, legati alla vicina Certosa di Serra San Bruno, che hanno favorito lo sviluppo agricolo e spirituale della zona. Il centro storico conserva ancora oggi un impianto urbanistico tipico, fatto di strette viuzze, archi in pietra e scalinate, le cosiddette <em>&ldquo;rughe&rdquo;</em>, che si intrecciano tra loro creando un&apos;atmosfera intima e raccolta.
            </p>
          </div>
          <div className="roundpic" style={{ aspectRatio: '4/5', position: 'relative' }}>
            <Image src="/img/IMG1.jpg" alt="Centro storico di Gasperina" fill sizes="(max-width: 960px) 100vw, 520px" style={{ objectFit: 'cover' }} />
          </div>
        </div>
      </section>

      <section id="gastronomia" className="panel p-gold">
        <div className="panel-head">
          <div>
            <span className="eyebrow">Sapori autentici</span>
            <h2 className="h2">La tradizione gasperinese.</h2>
          </div>
        </div>
        <div className="grid g4">
          {foods.map((food) => (
            <div key={food.nome} className="vcard">
              <h3 className="h3">{food.nome}</h3>
              <p>{food.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="mappa" className="panel p-bluexl">
        <div className="panel-head">
          <div>
            <span className="eyebrow">Da visitare</span>
            <h2 className="h2">Luoghi da scoprire.</h2>
          </div>
        </div>
        <div className="grid g2">
          {pois.map((poi) => (
            <div key={poi.nome} className="vcard">
              <span className="tag">{poi.cat}</span>
              <h3 className="h3" style={{ marginTop: 14 }}>{poi.nome}</h3>
              <p>{poi.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-blued">
        <div className="split">
          <div>
            <span className="eyebrow">Come arrivare</span>
            <h2 className="h2">Gasperina, Calabria.</h2>
            <p className="lede" style={{ marginTop: 18 }}>39.0333° N, 16.5167° E · Provincia di Catanzaro, a pochi chilometri dalla costa ionica di Soverato.</p>
            <a className="vbtn vbtn-gold" href="https://maps.google.com/?q=Gasperina,Calabria,Italy" target="_blank" rel="noopener noreferrer">
              Apri in Google Maps
            </a>
          </div>
          <div className="roundpic" style={{ aspectRatio: '16/10', position: 'relative' }}>
            <Image src="/img/IMG_3.jpg" alt="Gasperina e il suo territorio" fill sizes="(max-width: 960px) 100vw, 560px" style={{ objectFit: 'cover' }} />
          </div>
        </div>
      </section>
    </V3Page>
  );
}
