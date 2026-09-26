/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as battle from "../battle.js";
import type * as imageGen from "../imageGen.js";
import type * as images from "../images.js";
import type * as lobby from "../lobby.js";
import type * as marketplace from "../marketplace.js";
import type * as nft from "../nft.js";
import type * as nftGen from "../nftGen.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  battle: typeof battle;
  imageGen: typeof imageGen;
  images: typeof images;
  lobby: typeof lobby;
  marketplace: typeof marketplace;
  nft: typeof nft;
  nftGen: typeof nftGen;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
