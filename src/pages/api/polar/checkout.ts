import type { APIRoute } from "astro";
import { Checkout } from "@polar-sh/astro";

const POLAR_ACCESS_TOKEN = import.meta.env.POLAR_ACCESS_TOKEN;
const POLAR_SUCCESS_URL = "https://the99.az/posts/";

// Product ID URL-dən keçir: /api/polar/checkout?productId=b8986c2f-f33f-4ef4-ae21-9b68a81b6e9c
export const GET: APIRoute = Checkout({
  accessToken: POLAR_ACCESS_TOKEN,
  successUrl: POLAR_SUCCESS_URL,
  server: "sandbox",
  theme: "dark",
});
