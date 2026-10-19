// Modello predefinito dell'email di conferma (prompt 13). L'editor dei modelli arriva con il prompt 18.
import { Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text } from '@react-email/components';

export type OrderConfirmationProps = {
  reason: 'paid' | 'resent';
  name: string | null;
  code: string;
  editionTitle: string;
  when: string | null;
  location: string | null;
  lines: Array<{ label: string; amount: string }>;
  total: string;
  ticketCount: number;
  myTicketsUrl: string;
  qrSrc: string;
  accent: string;
};

const font = 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif';

export function OrderConfirmationEmail(p: OrderConfirmationProps) {
  const title = p.reason === 'resent' ? `I tuoi biglietti per ${p.editionTitle}` : `Ordine confermato: ${p.editionTitle}`;
  return (
    <Html lang="it">
      <Head />
      <Preview>{`${p.code} · ${p.ticketCount === 1 ? '1 biglietto' : `${p.ticketCount} biglietti`} in allegato`}</Preview>
      <Body style={{ margin: 0, background: '#f5f6f8', fontFamily: font, color: '#1c2130' }}>
        <Container style={{ maxWidth: 520, margin: '32px auto', background: '#ffffff', borderRadius: 12, overflow: 'hidden' }}>
          <Section style={{ background: p.accent, padding: '24px 32px' }}>
            <Text style={{ margin: 0, color: '#ffffff', fontSize: 14, opacity: 0.85 }}>Pro Loco Gasperina</Text>
            <Heading as="h1" style={{ margin: '4px 0 0', color: '#ffffff', fontSize: 22 }}>
              {title}
            </Heading>
          </Section>
          <Section style={{ padding: '24px 32px 8px' }}>
            <Text style={{ fontSize: 15, lineHeight: 1.5, margin: '0 0 12px' }}>
              {p.name ? `Ciao ${p.name.split(' ')[0]},` : 'Ciao,'} {p.reason === 'resent' ? 'ecco di nuovo i tuoi biglietti.' : 'grazie! Il pagamento è andato a buon fine.'} I biglietti sono nel PDF allegato e
              sempre disponibili su “I miei biglietti”.
            </Text>
            <Text style={{ fontSize: 13, color: '#666d80', margin: '0 0 4px' }}>Codice ordine</Text>
            <Text style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1, margin: '0 0 12px' }}>{p.code}</Text>
            {p.when && <Text style={{ fontSize: 15, margin: '0 0 4px' }}>📅 {p.when}</Text>}
            {p.location && <Text style={{ fontSize: 15, margin: '0 0 12px' }}>📍 {p.location}</Text>}
          </Section>
          <Section style={{ padding: '0 32px', textAlign: 'center' }}>
            <Img src={p.qrSrc} width="180" height="180" alt={`QR dell'ordine ${p.code}`} style={{ margin: '0 auto' }} />
            <Text style={{ fontSize: 12, color: '#666d80', margin: '4px 0 16px' }}>
              {p.ticketCount > 1 ? 'Primo biglietto. Tutti i QR sono nel PDF e su “I miei biglietti”.' : 'Mostralo all’ingresso.'}
            </Text>
            <Button href={p.myTicketsUrl} style={{ background: p.accent, color: '#ffffff', fontWeight: 600, padding: '12px 20px', borderRadius: 8, textDecoration: 'none' }}>
              Apri i miei biglietti
            </Button>
          </Section>
          <Section style={{ padding: '16px 32px 24px' }}>
            <Hr style={{ borderColor: '#e5e7eb' }} />
            {p.lines.map((l, i) => (
              <Text key={i} style={{ fontSize: 14, margin: '4px 0' }}>
                {l.label} — {l.amount}
              </Text>
            ))}
            <Text style={{ fontSize: 15, fontWeight: 700, margin: '8px 0 0' }}>Totale {p.total}</Text>
            <Text style={{ fontSize: 12, color: '#666d80', margin: '16px 0 0', lineHeight: 1.5 }}>
              Per qualsiasi problema rispondi a questa email indicando il codice ordine. Il link “I miei biglietti” è personale: non condividerlo.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
