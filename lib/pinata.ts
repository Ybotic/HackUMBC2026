'server only';

import { PinataSDK } from 'pinata';
import { env } from '@/env';

export const pinata = new PinataSDK({
  pinataJwt: env.PINATA_JWT,
  pinataGateway: env.NEXT_PUBLIC_GATEWAY_URL,
});
