import cache from './client';
import { cardsByCompanyKey, cardsByEmployeeKey } from './keys';

/**
 * Invalidates all cache entries that could hold stale card data after a card mutation.
 *
 * Cards are cached under two keys: one scoped to the employee, one scoped to the company.
 * Both must be busted together — invalidating only one would leave the other serving stale data.
 *
 * @param employeeId - The ID of the employee who owns the card.
 * @param companyId  - The ID of the company the employee belongs to.
 */
export function invalidateCardCaches(employeeId: string, companyId: string): void {
  cache.del(cardsByEmployeeKey(employeeId));
  cache.del(cardsByCompanyKey(companyId));
}
