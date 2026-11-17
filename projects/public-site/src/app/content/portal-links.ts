import { CatalogConfig } from 'catalog';
import { OfferActionType } from 'data-access';
import { environment } from '../../environments/environment';
import { PAGE_PATHS } from './page-paths';

/** URL de una página del Portal (otra app); sin su dominio configurado queda en "#". */
export function portalHref(path: string): string {
  return environment.portalUrl ? new URL(path, environment.portalUrl).href : '#';
}

/** Catálogo de oferta formativa del Portal (pide iniciar sesión y vuelve al catálogo). */
export const PORTAL_CATALOG_HREF = portalHref('/catalogo');

/**
 * Acción de una ficha en el Portal (otra app, con la sesión): el Portal pide
 * iniciar sesión si hace falta y ejecuta la acción (postular, inscribirse,
 * pagar…). Sin el dominio del Portal configurado queda en "#".
 */
export function portalActionUrl(slug: string, action: OfferActionType): string {
  if (!environment.portalUrl) return '#';
  const url = new URL(`/inscripcion/${encodeURIComponent(slug)}`, environment.portalUrl);
  url.searchParams.set('accion', action);
  return url.href;
}

/** Catálogo de la landing: fichas en `/escuela/oferta/:slug` y acciones en el Portal. */
export const LANDING_CATALOG: CatalogConfig = {
  catalogPath: PAGE_PATHS.catalog,
  actionLink: (slug, action) => ({ href: portalActionUrl(slug, action) }),
  loginHint: true,
};
