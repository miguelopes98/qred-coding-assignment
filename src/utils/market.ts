import { Market } from '@prisma/client';

const MARKET_CURRENCY: Record<Market, string> = {
  SWEDEN: 'SEK',
  FINLAND: 'EUR',
  DENMARK: 'DKK',
  NORWAY: 'NOK',
  NETHERLANDS: 'EUR',
  BELGIUM: 'EUR',
  GERMANY: 'EUR',
  BRAZIL: 'BRL',
};

export function getCurrency(market: Market): string {
  return MARKET_CURRENCY[market];
}
