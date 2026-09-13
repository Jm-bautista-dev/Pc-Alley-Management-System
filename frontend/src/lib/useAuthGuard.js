import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * useAuthGuard
 * 
 * Protects authenticated pages by checking for a valid session and user.
 * If missing, invalid, or expired, safely redirects to the login page
 * preserving the intended destination.
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

    const getRedirectTarget = () => {
      if (typeof window === 'undefined') return '/';
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath && currentPath !== '/' && !currentPath.startsWith('/forgot-password') && !currentPath.startsWith('/register')) {
        return `/?redirect=${encodeURIComponent(currentPath)}`;
      }
      return '/';
    };

    if (!storedToken || !storedUser) {
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem("auth_notice", "Session expired. Please log in again.");
        } catch (e) {}
      }
      router.replace(getRedirectTarget());
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      setToken(storedToken);
      setUser(parsed);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem("auth_notice", "Session expired. Please log in again.");
        } catch (e) {}
      }
      router.replace(getRedirectTarget());
    } finally {
      setIsChecking(false);
    }
  }, [router]);

  return { user, token, isChecking };
}
