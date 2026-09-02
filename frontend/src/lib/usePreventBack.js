import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * usePreventBack
 * 
 * Deprecated: Browser back button should not be hijacked or blocked as it
 * breaks Next.js App Router client-side routing, history state, and sidebar
 * navigation. Authentication guarding is handled properly by useAuthGuard.
 */
export function usePreventBack() {
  // Intentionally no-op to allow native browser navigation and maintain Next.js App Router state
}
