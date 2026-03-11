import { expect } from 'chai';
import cache from '../../../src/cache/client';
import { invalidateCardCaches } from '../../../src/cache/invalidators';
import { cardsByCompanyKey, cardsByEmployeeKey } from '../../../src/cache/keys';

describe('invalidateCardCaches', () => {
  beforeEach(() => {
    cache.flushAll();
  });

  it('removes the by-employee cache entry', () => {
    cache.set(cardsByEmployeeKey('emp-1'), ['card-data']);

    invalidateCardCaches('emp-1', 'co-1');

    expect(cache.get(cardsByEmployeeKey('emp-1'))).to.be.undefined;
  });

  it('removes the by-company cache entry', () => {
    cache.set(cardsByCompanyKey('co-1'), ['card-data']);

    invalidateCardCaches('emp-1', 'co-1');

    expect(cache.get(cardsByCompanyKey('co-1'))).to.be.undefined;
  });

  it('removes both entries together so neither key serves stale data', () => {
    cache.set(cardsByEmployeeKey('emp-1'), ['card-data']);
    cache.set(cardsByCompanyKey('co-1'), ['card-data']);

    invalidateCardCaches('emp-1', 'co-1');

    expect(cache.get(cardsByEmployeeKey('emp-1'))).to.be.undefined;
    expect(cache.get(cardsByCompanyKey('co-1'))).to.be.undefined;
  });

  it('does not affect unrelated cache entries', () => {
    cache.set('unrelated-key', 'unrelated-value');

    invalidateCardCaches('emp-1', 'co-1');

    expect(cache.get('unrelated-key')).to.equal('unrelated-value');
  });
});
