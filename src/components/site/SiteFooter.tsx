import Link from 'next/link';
import Image from 'next/image';
import { v3Fonts } from './fonts';

const columns = [
  { title: 'Associazione', links: [['Chi siamo', '/associazione'], ['Diventa socio', '/iscriviti'], ['Sponsor', '/sponsor'], ['Trasparenza', '/trasparenza']] },
  { title: 'Territorio', links: [['Storia e cultura', '/scopri-gasperina#storia'], ['Gastronomia', '/scopri-gasperina#gastronomia'], ['Luoghi da scoprire', '/scopri-gasperina#mappa'], ['Galleria', '/media']] },
  { title: 'Partecipa', links: [['Tutti gli eventi', '/eventi'], ['Notizie', '/notizie'], ['Contattaci', '/contatti']] },
] as const;

/** Piè di pagina delle pagine v3: solo pagine esistenti (§13.1) e i dati legali dell'associazione. */
export default function SiteFooter() {
  return (
    <div className={`v3 ${v3Fonts}`}>
      <div className="page">
        <footer className="site-footer">
          <div className="f-top">
            <div>
              <Image src="/img/Logo_color_sm.png" alt="Pro Loco Gasperina" width={120} height={120} />
              <p>Associazione di Promozione Sociale per la valorizzazione della cultura, delle tradizioni e del turismo di Gasperina, Calabria.</p>
            </div>
            {columns.map((col) => (
              <div key={col.title}>
                <h4>{col.title}</h4>
                {col.links.map(([label, href]) => (
                  <Link key={href} href={href}>
                    {label}
                  </Link>
                ))}
              </div>
            ))}
            <div>
              <h4>Contatti</h4>
              <span>
                Via Raffaele Milano SNC
                <br />
                88060 Gasperina (CZ)
              </span>
              <a href="mailto:prolocogasperina@gmail.com">prolocogasperina@gmail.com</a>
              <a href="tel:+393505757501">+39 350 575 7501</a>
            </div>
          </div>
          <div className="giant" aria-hidden>
            Gasperina
          </div>
          <div className="legal">
            <span>© {new Date().getFullYear()} Pro Loco Gasperina APS · C.F. 99330790793 · P.IVA 03923590792</span>
            <span>
              <Link href="/privacy">Informativa privacy (GDPR)</Link> · <Link href="/trasparenza">Trasparenza</Link> · <Link href="/admin">Admin</Link>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
