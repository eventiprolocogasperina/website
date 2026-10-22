import { AdminPage } from '@/components/admin/shell/AdminPage';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { getCatalogWithAvailability } from '@/server/domain/catalog';
import { hasStockField, pickStockQuota } from '@/server/domain/catalog/stock';
import { editionFromParams, type EditionParams } from '@/server/domain/editions/page-params';
import { CatalogClient, type CatalogData } from './CatalogClient';

export const metadata = { title: 'Catalogo' };

export default async function CatalogPage(props: EditionParams & { searchParams: Promise<{ vista?: string }> }) {
  const edition = await editionFromParams(props);
  const denied = await pageDenied('catalog.edit', { edition: edition.slug });
  if (denied) return denied;
  const { catalog, availability } = await getCatalogWithAvailability((await getAdminCtx())!, edition.slug);
  const used = (id: string) => availability.quotas.find((u) => u.id === id)?.used ?? 0;
  const stockOf = (productId: string) => {
    const q = pickStockQuota(catalog.quotas, productId);
    return q ? Math.max(0, q.size - used(q.id)) : null;
  };
  const data: CatalogData = {
    products: catalog.products.map((p) => ({
      id: p.id,
      kind: p.kind,
      name: p.name,
      description: p.description,
      icon: p.icon,
      priceCents: p.priceCents,
      channels: p.channels,
      requiresSession: p.requiresSession,
      issuesTicket: p.issuesTicket,
      department: p.department,
      active: p.active,
      minPerOrder: p.minPerOrder,
      maxPerOrder: p.maxPerOrder,
      stockField: hasStockField(p),
      stockRemaining: hasStockField(p) ? stockOf(p.id) : null,
    })),
    sessions: catalog.sessions.map((s) => ({ id: s.id, label: s.label })),
    quotas: catalog.quotas.map((q) => ({ id: q.id, name: q.name, size: q.size, sessionId: q.sessionId, productIds: q.productIds, used: used(q.id) })),
    discounts: catalog.discounts.map((d) => ({
      id: d.id,
      code: d.code,
      kind: d.kind,
      value: d.value,
      maxUses: d.maxUses,
      usedCount: d.usedCount,
      validFrom: d.validFrom?.toISOString() ?? null,
      validUntil: d.validUntil?.toISOString() ?? null,
      appliesToProductIds: d.appliesToProductIds,
      active: d.active,
    })),
  };
  const { vista } = await props.searchParams;
  return (
    <AdminPage>
      <CatalogClient
        edition={{ slug: edition.slug, readOnly: edition.status === 'archived', legacy: edition.imported }}
        data={data}
        initialTab={vista === 'quote' || vista === 'sconti' ? vista : 'prodotti'}
      />
    </AdminPage>
  );
}
