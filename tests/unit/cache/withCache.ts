import { expect } from 'chai';
import sinon from 'sinon';
import cache from '../../../src/cache/client';
import { withCache } from '../../../src/cache/withCache';

describe('withCache', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    cache.flushAll();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('calls fn on a cache miss and returns its result', async () => {
    const fn = sandbox.stub().resolves('result-value');
    const wrapped = withCache(() => 'test-key', fn);

    const result = await wrapped();

    expect(fn.calledOnce).to.be.true;
    expect(result).to.equal('result-value');
  });

  it('stores the result in cache after a miss', async () => {
    const fn = sandbox.stub().resolves('stored-value');
    const wrapped = withCache(() => 'test-key', fn);

    await wrapped();

    expect(cache.get('test-key')).to.equal('stored-value');
  });

  it('returns the cached value on a hit without calling fn', async () => {
    cache.set('test-key', 'cached-value');
    const fn = sandbox.stub().resolves('fresh-value');
    const wrapped = withCache(() => 'test-key', fn);

    const result = await wrapped();

    expect(fn.called).to.be.false;
    expect(result).to.equal('cached-value');
  });

  it('derives the cache key from the args passed to fn', async () => {
    const keyFn = sandbox.stub<[string], string>().callsFake((id) => `key:${id}`);
    const fn = sandbox.stub<[string], Promise<string>>().resolves('value');
    const wrapped = withCache(keyFn, fn);

    await wrapped('my-id');

    expect(keyFn.calledOnceWith('my-id')).to.be.true;
  });

  it('calls fn again after the cache is flushed', async () => {
    const fn = sandbox.stub().resolves('value');
    const wrapped = withCache(() => 'test-key', fn);

    await wrapped();
    cache.flushAll();
    await wrapped();

    expect(fn.calledTwice).to.be.true;
  });
});
