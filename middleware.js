import arcjet, { createMiddleware, detectBot, shield } from "@arcjet/next";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/account(.*)",
  "/transaction(.*)",
]);

// Create Arcjet middleware
const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    // Shield protection for content and security
    shield({
      mode: "LIVE",
    }),
    detectBot({
      mode: "LIVE", // Will block requests. Use "DRY_RUN" to log only.
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc.
        "GO_HTTP", // For Inngest
      ],
    }),
  ],
});

// Create base Clerk middleware
const clerk = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth(); // Ensure you're correctly awaiting auth().

  if (!userId && isProtectedRoute(req)) {
    const { redirectToSignIn } = await auth();
    return redirectToSignIn(); // Redirect to sign-in if not authenticated
  }

  return NextResponse.next(); // Allow the request to continue
});

// Chain middlewares - ArcJet runs first, then Clerk
export default async function middleware(req) {
  const arcjetResponse = await aj(req); // Run ArcJet middleware first
  if (arcjetResponse) return arcjetResponse; // If ArcJet blocks, stop here.

  const clerkResponse = await clerk(req); // Run Clerk middleware next
  return clerkResponse || NextResponse.next(); // Proceed if Clerk allows
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
