import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listProducts from "./tools/list-products";
import getProduct from "./tools/get-product";
import listBoutiques from "./tools/list-boutiques";
import listMyOrders from "./tools/list-my-orders";
import getMyOrder from "./tools/get-my-order";
import myLoyalty from "./tools/my-loyalty";
import listWishlist from "./tools/list-wishlist";
import addToWishlist from "./tools/add-to-wishlist";
import removeFromWishlist from "./tools/remove-from-wishlist";
import listAddresses from "./tools/list-addresses";

// The OAuth issuer must be the direct Supabase host. Read the project ref from
// the Vite env (inlined at build time — no runtime env read here).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "helvetica-mp-mcp",
  title: "HELVETICA-MP Store MCP",
  version: "0.1.0",
  instructions: [
    "Outils MCP pour la boutique HELVETICA-MP.",
    "• Outils lecture publique : list_products, get_product, list_boutiques.",
    "• Outils utilisateur (authentifié) : list_my_orders, get_my_order, my_loyalty, list_wishlist, add_to_wishlist, remove_from_wishlist, list_my_addresses.",
    "Toutes les actions utilisateur passent par Supabase RLS et n'accèdent qu'aux données du compte connecté.",
  ].join("\n"),
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listProducts,
    getProduct,
    listBoutiques,
    listMyOrders,
    getMyOrder,
    myLoyalty,
    listWishlist,
    addToWishlist,
    removeFromWishlist,
    listAddresses,
  ],
});
