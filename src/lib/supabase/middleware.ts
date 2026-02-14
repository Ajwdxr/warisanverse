import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return early if environment variables are missing to prevent crash
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Protected routes
    const protectedRoutes = ['/dashboard', '/profile', '/realms', '/admin'];
    const isProtectedRoute = protectedRoutes.some((route) =>
      request.nextUrl.pathname.startsWith(route)
    );

    if (isProtectedRoute && !user) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      url.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    // Admin routes
    if (request.nextUrl.pathname.startsWith('/admin') && user) {
      // Use a separate try-catch for DB operations in middleware to be safe
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.role !== 'admin') {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      } catch (dbError) {
        console.error('Middleware DB Error:', dbError);
        // Fallback or just allow if DB is down? Better to redirect for security.
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Redirect logged in users away from auth pages
    if (request.nextUrl.pathname.startsWith('/auth') && user) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } catch (authError) {
    console.error('Middleware Auth Error:', authError);
    // On auth error, we just return the standard response (user will likely be considered unauthenticated)
  }

  return supabaseResponse;
}

