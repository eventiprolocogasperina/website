import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Esito del pagamento non valido', robots: { index: false, follow: false } };

/** Ritorno da Nexi con firma non valida o per un ordine sconosciuto: niente viene registrato. */
export default function InvalidResultPage() {
  return (
    <main className="ui-root min-h-screen bg-bg px-4 pb-16 pt-28 text-fg">
      <div role="alert" className="mx-auto max-w-xl rounded-lg border border-border bg-surface p-5">
        <h1 className="text-title font-semibold">Non riusciamo a leggere l’esito del pagamento</h1>
        <p className="mt-2 text-body">
          Se il pagamento è andato a buon fine riceverai comunque l’email con i biglietti entro qualche minuto. Se non arriva, scrivici dalla pagina Contatti indicando
          l’ora del pagamento: non ripetere l’acquisto.
        </p>
      </div>
    </main>
  );
}
