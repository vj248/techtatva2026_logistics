import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('session_token')?.value;

  // redirect logged in users to dashboard
  if (pathname === '/login' && token) {
    const payload = await verifyJWT(token);
    if (payload) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Public paths without authentication
  const publicPaths = ['/login', '/api/auth/login', '/favicon.ico'];
  if (publicPaths.some(path => pathname.startsWith(path)) || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // Helper to return unauthorized response
  const unauthorized = () => {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  };

  if (!token) {
    return unauthorized();
  }

  // Verify token
  const payload = await verifyJWT(token);

  if (!payload) {
    return unauthorized();
  }

  const { role } = payload;
  const roleLower = role.toLowerCase();

  // If accessing root, redirect to dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Role based access control

  const knownRoles = ['oc', 'cc', 'sc', 'category'];
  
  const pathParts = pathname.split('/');
  // pathname: /oc/dashboard -> ['', 'oc', 'dashboard']
  // pathname: /api/cc/create -> ['', 'api', 'cc', 'create']
  
  let roleSegment = pathParts[1]?.toLowerCase();
  
  // For API route, look second segment
  if (roleSegment === 'api') {
    roleSegment = pathParts[2]?.toLowerCase();
  }

  if (knownRoles.includes(roleSegment)) {
    // check if it matches the user's role
    if (roleSegment !== roleLower) {
      // Unauthorized access to another role's area
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.rewrite(new URL('/not-found', request.url));
    }
  } else if (!pathname.startsWith('/api/')) {
    // Allow /dashboard for all authenticated users
    if (pathname === '/dashboard') {
      return NextResponse.next();
    }
    // Allow /contact page for all authenticated users
    if (pathname === '/contact') {
      return NextResponse.next();
    }
    // Allow /account-management only for CC
    if (pathname.startsWith('/account-management')) {
      if (roleLower !== 'cc') {
        return NextResponse.rewrite(new URL('/not-found', request.url));
      }
      return NextResponse.next();
    }
    // Allow /inventory page for CC, OC, SC
    if (pathname === '/inventory') {
      if (roleLower === 'category') {
         return NextResponse.rewrite(new URL('/not-found', request.url));
      }
      return NextResponse.next();
    }
    // Allow /demands for everyone
    if (pathname === '/demands') {
      return NextResponse.next();
    }
    // Allow /mapping page for CC and OC
    if (pathname === '/mapping') {
      if (roleLower !== 'cc' && roleLower !== 'oc') {
         return NextResponse.rewrite(new URL('/not-found', request.url));
      }
      return NextResponse.next();
    }
    // Allow /negotiations only for CC
    if (pathname === '/negotiations') {
      if (roleLower !== 'cc') {
        return NextResponse.rewrite(new URL('/not-found', request.url));
      }
      return NextResponse.next();
    }
   // Allow /analysis only for CC and SC
    if (pathname === '/analysis') {
      if (roleLower !== 'cc' && roleLower !== 'sc') {
        return NextResponse.rewrite(new URL('/not-found', request.url));
      }
      return NextResponse.next();
    }    // Allow /deliveries only for CC and OC
    if (pathname === '/deliveries') {
      if (roleLower !== 'cc' && roleLower !== 'oc') {
        return NextResponse.rewrite(new URL('/not-found', request.url));
      }
      return NextResponse.next();
    }
    // Allow /invoices only for CC and OC
    if (pathname === '/invoices') {
      if (roleLower !== 'cc' && roleLower !== 'oc') {
        return NextResponse.rewrite(new URL('/not-found', request.url));
      }
      return NextResponse.next();
    }
    return NextResponse.rewrite(new URL('/not-found', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
