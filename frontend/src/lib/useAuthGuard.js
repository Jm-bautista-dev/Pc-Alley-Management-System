import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * useAuthGuard
 * 
 * Protects authenticated pages by checking for a valid token and user
 * in localStorage. If missing, immediately redirects to the login page.
 * 
 * @returns {{ user: object|null, token: string|null, isChecking: boolean }}
 */
export function useAuthGuard() {
  const router = useRouter();
  const [user, setUser]         = useState(null);
  const [token, setToken]       = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser  = localStorage.getItem('user');

    if (!storedToken || !storedUser) {
      // No session — send to login
      router.replace('/');
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      setToken(storedToken);
      setUser(parsed);
    } catch {
      // Corrupted data — clear and redirect
      localStorage.clear();
      router.replace('/');
    } finally {
      setIsChecking(false);
    }
  }, [router]);

  return { user, token, isChecking };
}
