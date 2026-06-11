import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * usePreventBack
 * 
 * Prevents the browser Back button from navigating to authenticated pages
 * after the user has logged out, and prevents going back to login when
 * already authenticated.
 * 
 * @param {boolean} isAuthenticated - true if the user is currently logged in
 */
export function usePreventBack(isAuthenticated) {
  const router = useRouter();

  useEffect(() => {
    // Push a new entry so pressing Back lands here first, not the previous page
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      const token = localStorage.getItem('token');
      const user  = localStorage.getItem('user');
      const loggedIn = !!(token && user);

      if (!loggedIn) {
        // Not logged in — any back attempt should go to login
        window.history.pushState(null, '', window.location.href);
        router.replace('/');
      } else {
        // Logged in — prevent going back to the login page
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated, router]);
}
