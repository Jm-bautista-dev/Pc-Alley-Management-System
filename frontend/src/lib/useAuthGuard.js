import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isTokenExpired, handleSessionExpired } from './session';

/**
 * useAuthGuard
 * 
 * Protects authenticated pages by verifying token validity and expiration.
 * - If missing: redirects cleanly to login, preserving destination.
 * - If expired: triggers the friendly session expiration dialog.
 * - If malformed: clears corrupt auth data and redirects.
 * 
 * @returns {{ user: object|null, token: string|null, isChecking: boolean }}
 */
export function useAuthGuard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    // 1. Missing session -> normal redirect to login preserving destination
    if (!storedToken || !storedUser) {
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath && currentPath !== '/') {
        try {
          sessionStorage.setItem('session_redirect', currentPath);
        } catch (_) {}
        router.replace(`/?redirect=${encodeURIComponent(currentPath)}`);
      } else {
        router.replace('/');
      }
      return;
    }

    // 2. Inspect token expiration
    const expiredStatus = isTokenExpired(storedToken);

    if (expiredStatus === true) {
      // Valid JWT whose expiration timestamp has passed -> trigger session expiration dialog
      handleSessionExpired();
      setIsChecking(false);
      return;
    }

    if (expiredStatus === null) {
      // Malformed or unreadable token -> invalid-auth flow (clear without claiming session expired)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath && currentPath !== '/') {
        router.replace(`/?redirect=${encodeURIComponent(currentPath)}`);
      } else {
        router.replace('/');
      }
      return;
    }

    // 3. Token is valid (expiredStatus === false) -> parse user data
    try {
      const parsed = JSON.parse(storedUser);
      setToken(storedToken);
      setUser(parsed);
    } catch {
      // Corrupted user data -> clear and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.replace('/');
    } finally {
      setIsChecking(false);
    }
  }, [router]);

  return { user, token, isChecking };
}
