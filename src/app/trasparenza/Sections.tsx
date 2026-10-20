// Mattoni della pagina /trasparenza, con lo stesso aspetto delle sezioni di /privacy.

export function Section({ n, id, title, children }: { n: number; id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} style={{ background: 'var(--neutral-900)', border: '1px solid var(--neutral-800)', borderRadius: '1rem', padding: '1.75rem' }}>
      <h2 id={`${id}-t`} style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-heading)', display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
        <span style={{ color: 'var(--gold-400)' }}>{n}.</span> {title}
      </h2>
      {children}
    </section>
  );
}

/** Tabella che su telefono diventa una scheda per riga (classe .tr-table in globals.css). */
export function DataTable<T>({ caption, columns, rows }: { caption: string; columns: Array<{ label: string; cell: (row: T) => React.ReactNode }>; rows: T[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="tr-table">
        <caption style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.label} scope="col">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.label} data-label={c.label}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
