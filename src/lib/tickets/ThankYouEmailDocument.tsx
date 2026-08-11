import * as React from 'react';
import {
  Html, Head, Body, Container, Section, Text, Button, Img, Link, Hr
} from '@react-email/components';

interface ThankYouEmailProps {
  buyerName: string;
  eventId: string;
}

export const ThankYouEmailDocument: React.FC<Readonly<ThankYouEmailProps>> = ({
  buyerName,
  eventId
}) => {
  const isAssaggia = eventId === 'assaggia-passeggia';
  const eventName = isAssaggia ? 'Assaggia & Passeggia' : 'il nostro evento';
  
  return (
    <Html>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px' }}>
              <Img src="https://prolocogasperina.it/img/Logo_color_sm.png" height="90" alt="Pro Loco Gasperina" style={{ margin: '0 auto' }} />
              {isAssaggia && (
                <Img src="https://prolocogasperina.it/img/LogoAP_GA_nero.png" height="90" alt="Assaggia e Passeggia" style={{ margin: '0 auto' }} />
              )}
            </div>
          </Section>

          <Img 
            src="https://prolocogasperina.it/img/email_bg.jpg" 
            alt="Momento dell'evento" 
            style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '300px', objectFit: 'cover' }} 
          />

          <Section style={content}>
            <Text style={title}>GRAZIE PER AVER PARTECIPATO!</Text>
            
            <Text style={paragraph}>
              Ciao <strong>{buyerName.split(' ')[0]}</strong>,<br /><br />
              Speriamo che tu ti sia divertito a <strong>{eventName}</strong>! La tua presenza ha reso l'evento ancora più speciale.
            </Text>

            {isAssaggia && (
              <>
                <Text style={paragraph}>
                  Abbiamo appena pubblicato la galleria con tutte le foto e i ricordi più belli della giornata. Puoi sfogliarle online e, se ti fa piacere, ti invitiamo a <strong>lasciarci una recensione</strong> per aiutarci a rendere le prossime edizioni sempre più uniche.
                </Text>
                
                <Section style={btnContainer}>
                  <Button style={button} href="https://prolocogasperina.it/assaggia-e-passeggia">
                    Guarda le Foto & Lascia una Recensione
                  </Button>
                </Section>
              </>
            )}

            <Hr style={hr} />
            
            <Text style={footer}>
              Un caro saluto,<br />
              <strong style={{ color: '#E8A91A' }}>Il team della Pro Loco Gasperina</strong>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f8f9fa',
  backgroundImage: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
  fontFamily: '"DM Sans", -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  color: '#2d3748'
};

const container = {
  backgroundColor: '#ffffff',
  margin: '40px auto',
  border: '1px solid #e2e8f0',
  borderRadius: '16px',
  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
  overflow: 'hidden'
};

const header = {
  padding: '40px 32px 30px',
  background: 'linear-gradient(to right, #ffffff, #faf7f0)',
  borderBottom: '1px solid #e2e8f0',
  textAlign: 'center' as const,
};

const content = {
  padding: '40px 40px',
};

const title = {
  fontSize: '28px',
  fontWeight: '700',
  fontFamily: '"Cormorant Garamond", serif',
  color: '#b07a0a', /* Darker gold for better readability on light bg */
  marginBottom: '24px',
  textAlign: 'center' as const,
  letterSpacing: '0.05em'
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '28px',
  color: '#4a5568',
};

const btnContainer = {
  textAlign: 'center' as const,
  marginTop: '40px',
  marginBottom: '32px',
};

const button = {
  background: 'linear-gradient(135deg, #E8A91A 0%, #b07a0a 100%)',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  boxShadow: '0 4px 15px rgba(232, 169, 26, 0.4)'
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
};

const footer = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#718096',
};

export default ThankYouEmailDocument;
