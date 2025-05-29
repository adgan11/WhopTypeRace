import { WhopServerSdk, makeUserTokenVerifier } from "@whop/api";

export const whopApi = WhopServerSdk({
  // Add your app api key here - this is required.
  // You can get this from the Whop dashboard after creating an app in the "API Keys" section.
  appApiKey: process.env.WHOP_API_KEY ?? "fallback",

  // This will make api requests on behalf of this user.
  // This is optional, however most api requests need to be made on behalf of a user.
  // You can create an agent user for your app, and use their userId here.
  // You can also apply a different userId later with the `withUser` function.
});

export const verifyUserToken = makeUserTokenVerifier({
  appId: process.env.WHOP_APP_ID ?? "fallback",
  dontThrow: true,
});
