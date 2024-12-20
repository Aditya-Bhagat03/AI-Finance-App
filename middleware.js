import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Route matcher for protected routes
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/account(.*)",
  "/transaction(.*)",
]);

// Clerk middleware to handle authentication
const clerk = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth(); // Get user ID

  // If user is not authenticated and trying to access protected routes
  if (!userId && isProtectedRoute(req)) {
    const { redirectToSignIn } = await auth(); // Get the redirect function
    return redirectToSignIn(); // Redirect to sign-in if not authenticated
  }

  return NextResponse.next(); // Continue the request if authenticated or not protected
});

// The main middleware function chaining Clerk middleware
export default async function middleware(req) {
  try {
    // Run Clerk middleware for authentication and access control
    const clerkResponse = await clerk(req);
    return clerkResponse || NextResponse.next(); // Continue request if allowed or block
  } catch (error) {
    console.error("Middleware Error: ", error); // Log error
    return NextResponse.error(); // Return a generic error if anything goes wrong
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run middleware for API routes
    "/(api|trpc)(.*)",
  ],
};
