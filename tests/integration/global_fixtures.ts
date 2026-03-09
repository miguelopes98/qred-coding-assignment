import nock from 'nock';

const NOCK_DOMAIN_ALLOWLIST = ['127.0.0.1', 'localhost'];

export async function mochaGlobalSetup() {
  nock.disableNetConnect();
  nock.enableNetConnect((host) =>
    Boolean(NOCK_DOMAIN_ALLOWLIST.find((domain) => host.includes(domain)))
  );
}

export async function mochaGlobalTeardown() {
  nock.enableNetConnect();
}
