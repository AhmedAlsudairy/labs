import { getLaboratoryUserId } from "@/actions/admin/lab";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  // This `try/catch` block is only here for the interactive tutorial.
  // Feel free to remove once you have Supabase connected.
  try {
    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const user = await supabase.auth.getUser();

    const authRedirectUrl = new URL("/sign-in", request.url);
    const adminDashboardUrl = new URL("/protected/admin", request.url);
  // Add lab dashboard URL construction
const labDashboardUrl = (labId: number) => 
  new URL(`/protected/labs/${labId}`, request.url);

    // Handle unauthenticated users trying to access protected routes
    if (request.nextUrl.pathname.startsWith("/protected") && user.error) {
      return NextResponse.redirect(authRedirectUrl);
    }
  
    // Handle authenticated users based on role
    if (!user.error && user.data?.user) {
      const isAdmin = user.data.user.user_metadata.role === 'admin';
      const isLabInCharge = user.data.user.user_metadata.role === 'lab in charge';
      const isAdminRoute = request.nextUrl.pathname.startsWith('/protected/admin');
      const isRootRoute = request.nextUrl.pathname === '/';
    // Check lab association if user is lab manager
    console.log(isLabInCharge)
    if (isLabInCharge) {
      // console.log(user.data.user.id)
      // Update the query with better logging and error handling
      // console.log('Checking lab manager with userId:',  user.data.user.id);

      try {
        const data = await getLaboratoryUserId( user.data.user.id);

        if (!data) {
          // console.warn('No laboratory found for manager:',  user.data.user.id);
          // Handle case where lab manager has no assigned laboratory
          return NextResponse.redirect(authRedirectUrl);
        }

        // Continue with existing logic...
        if (data) {
          // Redirect lab managers from root to their lab dashboard
          if (isRootRoute) {
            return NextResponse.redirect(labDashboardUrl(data.lab_id));
          }
        }
      } catch (err) {
        console.error('Unexpected error in laboratory query:', err);
        return NextResponse.redirect(authRedirectUrl);
      }
    }
  
      // Redirect non-admin users away from admin routes
      if (!isAdmin && isAdminRoute) {
        return NextResponse.redirect(authRedirectUrl);
      }
  
      // Redirect admin users from root to admin dashboard
      if (isAdmin && isRootRoute) {
        return NextResponse.redirect(adminDashboardUrl);
      }

      // Check if it's the exact /protected path and user is coordinator
      if (request.nextUrl.pathname === '/' && 
          user.data.user.user_metadata.role === 'cordinator') {
        return NextResponse.redirect(new URL('/protected/cordinator', request.url));
      }
    }
    return response;

  
  } catch (e) {
    // If you are here, a Supabase client could not be created.
    // This is likely because you have not set up environment variables.
    // Check out http://localhost:3000 for Next Steps.
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
