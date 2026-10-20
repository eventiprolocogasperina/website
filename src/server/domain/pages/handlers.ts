// Handler delle pagine pubbliche: quando un'edizione apre le vendite parte l'avviso agli iscritti
// "Avvisami" del suo format. Importato da editions/index.ts, che pubblica gli eventi di stato.
import { on, registerOnce } from '@/server/domain/events';
import { notifyEditionOnSale } from './notify';

registerOnce('notify-signups', () => {
  on('edition.on_sale', (event) => notifyEditionOnSale(event.editionId).then(() => undefined));
});
