import { expect } from 'chai';
import { createLogger } from '../../src/utils/logger';

const logger = createLogger(module);

describe('Example integration test module', () => {
  it('example integration test', () => {
    logger.info('hello from integration test');
    expect(true).to.be.true;
  });
});
