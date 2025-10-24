import { WhopServerSdk, makeUserTokenVerifier } from '@whop/api';

const APP_ID =
  process.env.WHOP_APP_ID ??
  process.env.NEXT_PUBLIC_WHOP_APP_ID ??
  'fallback';

const AGENT_USER_ID =
  process.env.WHOP_AGENT_USER_ID ??
  process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID ??
  undefined;

export const whopApi = WhopServerSdk({
  appApiKey: process.env.WHOP_API_KEY ?? 'fallback',
  ...(AGENT_USER_ID ? { onBehalfOfUserId: AGENT_USER_ID } : {}),
});

export const verifyUserToken = makeUserTokenVerifier({
  appId: APP_ID,
  dontThrow: true,
});
