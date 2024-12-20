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
  const { userId } = await auth(); // Ensure you're correctly awaiting auth()

  // Check if the user is not authenticated and if the route is protected
  if (!userId && isProtectedRoute(req)) {
    const { redirectToSignIn } = await auth(); // Get the redirect function
    return redirectToSignIn(); // Redirect to sign-in page if not authenticated
  }

  return NextResponse.next(); // Allow the request to continue
});

// The main middleware function to chain ArcJet and Clerk middlewares
export default async function middleware(req) {
  try {
    // Run ArcJet middleware first
    const arcjetResponse = await aj(req); // Await the ArcJet middleware
    if (arcjetResponse) {
      return arcjetResponse; // Return early if ArcJet blocks the request
    }

    // Run Clerk middleware second
    const clerkResponse = await clerk(req); // Await Clerk middleware
    return clerkResponse || NextResponse.next(); // Return Clerk response or continue
  } catch (error) {
    console.error("Middleware Error: ", error); // Log any middleware errors for debugging
    return NextResponse.error(); // Return a generic error response if something fails
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
