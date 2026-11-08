// Mattoni della pagina /trasparenza: pannelli e tabelle del design v3.

const TONES = { cream: 'p-cream', white: 'p-white', blue: 'p-bluexl', dark: 'p-blued' } as const;

export function Section({ n, id, title, tone = 'white', children }: { n: number; id: string; title: string; tone?: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className={`panel ${TONES[tone]}`}>
      <div className="panel-head">
        <div>
          <span className="eyebrow">{n}</span>
          <h2 id={`${id}-t`} className="h2">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

/** Tabella che scorre in orizzontale su telefono. */
export function DataTable<T>({ caption, columns, rows }: { caption: string; columns: Array<{ label: string; cell: (row: T) => React.ReactNode }>; rows: T[] }) {
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={caption}>
      <table>
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
