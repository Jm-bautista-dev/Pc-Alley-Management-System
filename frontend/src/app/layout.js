import './globals.css';
import { Inter, DM_Sans, Rajdhani, Bebas_Neue } from 'next/font/google';
import { LayoutProvider } from '../context/LayoutContext';
import { NotificationProvider } from '../context/NotificationContext';
import { ModalProvider } from '../context/ModalContext';

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  variable: '--font-dm-sans',
});

const rajdhani = Rajdhani({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600', '700'],
  variable: '--font-rajdhani',
});

const bebasNeue = Bebas_Neue({ 
  weight: "400", 
  subsets: ["latin"],
  variable: '--font-bebas',
});

export const metadata = {
  title: 'PC Alley — Integrated Multi-Branch System',
  description: 'Enterprise ERP for IT resource management',
  other: {
    // Prevent browsers from caching authenticated pages
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

import { ThemeProvider } from '../context/ThemeContext';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'dark';
                  document.documentElement.classList.add(theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>

      <body className={`${dmSans.variable} ${rajdhani.variable} ${bebasNeue.variable} font-sans antialiased transition-colors duration-300`}>
        <ThemeProvider>
          <NotificationProvider>
            <ModalProvider>
              <LayoutProvider>
                {children}
              </LayoutProvider>
            </ModalProvider>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
