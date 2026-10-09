import * as React from 'react';
import {
  Html, Head, Body, Container, Section, Text, Button, Img, Link, Hr
} from '@react-email/components';

interface PostponementEmailProps {
  buyerName: string;
  orderId: string;
  newDate: string;
  eventName?: string;
  messageBody: string;
  regulationUrl?: string;
  whatsappPhone?: string;
}

export const PostponementEmailDocument: React.FC<Readonly<PostponementEmailProps>> = ({
  buyerName,
  orderId,
  newDate,
  eventName = 'Zuccaland 2026',
  messageBody,
  regulationUrl = 'https://drive.google.com/file/d/1jaJ8vUe_ePAJubcM-dwLufVJ9Z8GgujK/view?usp=share_link',
  whatsappPhone = '393505757501'
}) => {
  const cleanPhone = whatsappPhone.replace(/\D/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Ciao, sono ${buyerName} (Prenotazione ${orderId}) e vorrei informazioni sul rinvio dell'evento ${eventName}.`)}`;

  // Formatted paragraphs from message text
  const paragraphs = messageBody
    .replace(/\{\{nome\}\}/gi, buyerName)
    .replace(/\{\{ordine_id\}\}/gi, orderId)
    .replace(/\{\{nuova_data\}\}/gi, newDate)
    .replace(/\{\{evento\}\}/gi, eventName)
    .replace(/\{\{regolamento\}\}/gi, regulationUrl)
    .replace(/\{\{supporto_whatsapp\}\}/gi, waUrl)
    .split('\n\n');

  return (
    <Html>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </Head>
      <Body style={main}>
        <Container style={container}>
          
          {/* Header Branding */}
          <Section style={header}>
            <Img src="https://prolocogasperina.it/img/Logo_color_sm.png" height="75" alt="Pro Loco Gasperina" style={{ margin: '0 auto' }} />
          </Section>

          {/* Status Alert Banner */}
          <Section style={alertBanner}>
            <Text style={alertTag}>📢 COMUNICAZIONE UFFICIALE METEO</Text>
            <Text style={alertTitle}>Avviso Rinvio {eventName}</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>
              Gentile <strong>{buyerName}</strong>,
            </Text>

            {/* Custom Message Body Paragraphs */}
            {paragraphs.map((p, idx) => (
              <Text key={idx} style={paragraph}>
                {p}
              </Text>
            ))}

            {/* Order Reference Box */}
            <Section style={infoBox}>
              <Text style={infoTitle}>📌 Riferimenti della tua Prenotazione</Text>
              <Text style={infoItem}>• <strong>Intestatario:</strong> {buyerName}</Text>
              <Text style={infoItem}>• <strong>Codice Prenotazione:</strong> <code style={codeStyle}>{orderId}</code></Text>
              <Text style={infoItem}>• <strong>Nuova Data di Recupero:</strong> <strong style={{ color: '#ea580c' }}>{newDate}</strong></Text>
              <Text style={infoSub}>*I biglietti e le attività già acquistate rimangono 100% validi per la nuova data senza bisogno di alcuna modifica.*</Text>
            </Section>

            {/* Action Buttons: WhatsApp Chat & Regulation PDF */}
            <Section style={btnContainer}>
              <Button style={whatsappButton} href={waUrl}>
                💬 Contatta l&apos;Assistenza su WhatsApp
              </Button>
              <div style={{ height: 12 }} />
              <Button style={pdfButton} href={regulationUrl}>
                📄 Leggi il Regolamento Ufficiale (PDF)
              </Button>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              A disposizione per ogni chiarimento,<br />
              <strong style={{ color: '#ea580c' }}>Associazione Pro Loco Gasperina APS</strong><br />
              <span style={{ fontSize: '12px', color: '#718096' }}>Email: contatto@prolocogasperina.it · WhatsApp: +39 350 575 7501</span>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f8fafc',
  fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  color: '#1e293b',
  padding: '20px 0',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '600px',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
  overflow: 'hidden' as const,
};

const header = {
  padding: '28px 24px 20px',
  backgroundColor: '#fff7ed',
  borderBottom: '1px solid #fed7aa',
  textAlign: 'center' as const,
};

const alertBanner = {
  backgroundColor: '#ea580c',
  padding: '20px 24px',
  textAlign: 'center' as const,
  color: '#ffffff',
};

const alertTag = {
  fontSize: '11px',
  fontWeight: 800,
  letterSpacing: '0.12em',
  margin: '0 0 4px',
  opacity: 0.9,
};

const alertTitle = {
  fontSize: '20px',
  fontWeight: 800,
  margin: 0,
};

const content = {
  padding: '32px 32px',
};

const greeting = {
  fontSize: '16px',
  color: '#0f172a',
  marginBottom: '16px',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.65',
  color: '#334155',
  marginBottom: '16px',
};

const infoBox = {
  backgroundColor: '#fff7ed',
  border: '1.5px dashed #fdba74',
  borderRadius: '12px',
  padding: '18px 20px',
  margin: '24px 0',
};

const infoTitle = {
  fontSize: '14px',
  fontWeight: 800,
  color: '#9a3412',
  margin: '0 0 10px',
};

const infoItem = {
  fontSize: '14px',
  color: '#431407',
  margin: '4px 0',
};

const infoSub = {
  fontSize: '12px',
  color: '#9a3412',
  marginTop: '10px',
  fontStyle: 'italic',
};

const codeStyle = {
  backgroundColor: '#ffedd5',
  padding: '2px 6px',
  borderRadius: '4px',
  color: '#c2410c',
  fontWeight: 700,
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '28px 0',
};

const whatsappButton = {
  backgroundColor: '#25D366',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 800,
  padding: '14px 24px',
  borderRadius: '999px',
  textDecoration: 'none',
  display: 'inline-block',
  boxShadow: '0 4px 14px rgba(37,211,102,0.35)',
};

const pdfButton = {
  backgroundColor: '#ea580c',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 750,
  padding: '12px 22px',
  borderRadius: '999px',
  textDecoration: 'none',
  display: 'inline-block',
  boxShadow: '0 4px 12px rgba(234,88,12,0.25)',
};

const hr = {
  borderColor: '#f1f5f9',
  margin: '28px 0',
};

const footer = {
  fontSize: '13px',
  color: '#64748b',
  lineHeight: '1.5',
  textAlign: 'center' as const,
};
