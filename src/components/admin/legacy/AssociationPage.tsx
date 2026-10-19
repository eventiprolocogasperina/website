'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, Check, X, Plus, Trash2 } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';

interface TeamMember {
  nome: string;
  ruolo: string;
}

interface AssociazioneContent {
  missionTitle: string;
  missionText1: string;
  missionText2: string;
  joinTitle: string;
  joinText: string;
  team: TeamMember[];
}

const DEFAULT_CONTENT: AssociazioneContent = {
  missionTitle: 'Promuovere, valorizzare, connettere',
  missionText1: "La Pro Loco Gasperina APS è un'associazione di promozione sociale nata nel 1995. Con passione e dedizione promuoviamo la cultura, le tradizioni e il turismo del nostro borgo, organizzando eventi, gestendo progetti culturali e rafforzando il senso di comunità.",
  missionText2: "Siamo un'associazione apartitica, senza scopo di lucro, guidata dalla passione per Gasperina e dal desiderio di tramandare l'identità calabrese alle future generazioni.",
  joinTitle: 'Diventa socio',
  joinText: "Entra a far parte della nostra comunità! Come socio potrai partecipare attivamente alla vita dell'associazione, ai nostri eventi e contribuire alla valorizzazione del territorio gasperinese.",
  team: [
    { nome: 'Francesco Martello', ruolo: 'Presidente' },
    { nome: 'Niccolò Vono', ruolo: 'Vicepresidente' },
    { nome: 'Antonella Bellocci', ruolo: 'Segretario' },
    { nome: 'Eleonora Truglia', ruolo: 'Tesoriere' },
    { nome: 'Stefania Fiorentino', ruolo: 'Consigliere' },
    { nome: 'Maria Assunta Fiorentino', ruolo: 'Consigliere' },
    { nome: 'Michele Gualtieri', ruolo: 'Consigliere' },
    { nome: 'Pasquale Lupica', ruolo: 'Consigliere' },
  ],
};

export default function AdminAssociazionePage() {
  const [content, setContent] = useState<AssociazioneContent>(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/pages?slug=associazione')
      .then(r => r.json())
      .then(data => {
        if (data.content) setContent({ ...DEFAULT_CONTENT, ...data.content });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'associazione', content }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ type: 'success', msg: 'Contenuti salvati con successo!' });
        setTimeout(() => setStatus(null), 4000);
      } else {
        setStatus({ type: 'error', msg: data.error || 'Errore nel salvataggio' });
      }
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const updateTeamMember = (idx: number, field: keyof TeamMember, value: string) => {
    const team = [...content.team];
    team[idx] = { ...team[idx], [field]: value };
    setContent({ ...content, team });
  };

  const addTeamMember = () => {
    setContent({ ...content, team: [...content.team, { nome: '', ruolo: '' }] });
  };

  const removeTeamMember = (idx: number) => {
    setContent({ ...content, team: content.team.filter((_, i) => i !== idx) });
  };

  const fieldStyle = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    background: 'var(--neutral-800)',
    border: '1px solid var(--neutral-700)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text)',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <div>
      <AdminHeader
        title="CMS: Chi Siamo"
        subtitle="Modifica i contenuti della pagina Associazione"
        actions={
          <button onClick={handleSave} disabled={saving || loading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Salvataggio...</> : <><Save size={14} /> Salva</>}
          </button>
        }
      />

      {status && (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: status.type === 'success' ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)', color: status.type === 'success' ? '#4ade80' : '#ef4444', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {status.type === 'success' ? <Check size={16} /> : <X size={16} />} {status.msg}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="animate-spin" size={32} style={{ color: 'var(--neutral-500)' }} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>

          {/* Missione */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: 'var(--color-heading)', fontWeight: 600, marginBottom: '1.25rem', fontSize: '1rem', borderBottom: '1px solid var(--neutral-800)', paddingBottom: '0.75rem' }}>
              🎯 Sezione Missione
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>Titolo</label>
                <input value={content.missionTitle} onChange={e => setContent({ ...content, missionTitle: e.target.value })} style={fieldStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>Testo paragrafo 1</label>
                <textarea rows={3} value={content.missionText1} onChange={e => setContent({ ...content, missionText1: e.target.value })} style={{ ...fieldStyle, resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>Testo paragrafo 2</label>
                <textarea rows={3} value={content.missionText2} onChange={e => setContent({ ...content, missionText2: e.target.value })} style={{ ...fieldStyle, resize: 'vertical' }} />
              </div>
            </div>
          </div>

          {/* Team / Consiglio direttivo */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--neutral-800)', paddingBottom: '0.75rem' }}>
              <h3 style={{ color: 'var(--color-heading)', fontWeight: 600, fontSize: '1rem' }}>
                👥 Consiglio Direttivo
              </h3>
              <button onClick={addTeamMember} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(27,75,170,0.15)', border: '1px solid rgba(27,75,170,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--blue-400)', padding: '0.4rem 0.85rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                <Plus size={13} /> Aggiungi membro
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {content.team.map((m, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    value={m.nome}
                    onChange={e => updateTeamMember(idx, 'nome', e.target.value)}
                    placeholder="Nome e Cognome"
                    style={fieldStyle}
                  />
                  <input
                    value={m.ruolo}
                    onChange={e => updateTeamMember(idx, 'ruolo', e.target.value)}
                    placeholder="Ruolo"
                    style={fieldStyle}
                  />
                  <button onClick={() => removeTeamMember(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-400)', padding: '0.4rem' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Diventa Socio */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: 'var(--color-heading)', fontWeight: 600, marginBottom: '1.25rem', fontSize: '1rem', borderBottom: '1px solid var(--neutral-800)', paddingBottom: '0.75rem' }}>
              🤝 Sezione "Diventa Socio"
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>Titolo</label>
                <input value={content.joinTitle} onChange={e => setContent({ ...content, joinTitle: e.target.value })} style={fieldStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>Testo</label>
                <textarea rows={3} value={content.joinText} onChange={e => setContent({ ...content, joinText: e.target.value })} style={{ ...fieldStyle, resize: 'vertical' }} />
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
