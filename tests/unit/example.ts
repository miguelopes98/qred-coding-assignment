import { expect } from 'chai';
import { createLogger } from '../../src/utils/logger';

const logger = createLogger(module);

describe('Example unit test module', () => {
  it('example unit test', () => {
    logger.info('hello from unit test');
    expect(true).to.be.true;
  });
});
