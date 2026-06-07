"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const Breadcrumb = ({ defaultTitle }) => {
  const pathname = usePathname();
  
  const pathParts = pathname.split('/').filter(x => x);
  const breadcrumbs = [
    { name: "Terminal", path: "/dashboard" },
    ...pathParts.map((part, index) => ({
      name: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
      path: '/' + pathParts.slice(0, index + 1).join('/')
    }))
  ].slice(-2); // Only show last 2 for clean look

  const currentTitle = defaultTitle || breadcrumbs[breadcrumbs.length - 1]?.name || "System Base";

  return (
    <div className="flex flex-col">
      <div className="hidden md:flex items-center gap-2 mb-1">
        {breadcrumbs.map((crumb, i) => (
          <div key={`${crumb.path}-${i}`} className="flex items-center gap-2">
            <Link 
              href={crumb.path}
              className={`text-[9px] font-black uppercase tracking-[2px] transition-colors ${
                i === breadcrumbs.length - 1 ? 'text-brand-neonblue' : 'text-muted/50 hover:text-muted'
              }`}
            >
              {crumb.name}
            </Link>
            {i < breadcrumbs.length - 1 && <span className="text-[9px] text-muted/30">/</span>}
          </div>
        ))}
      </div>
      <h1 className="text-sm md:text-xl font-rajdhani font-black text-main tracking-widest uppercase flex items-center gap-2 md:gap-3">
        <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-brand-crimson shadow-[0_0_8px_rgba(215,38,56,0.5)] flex-shrink-0" />
        <span className="truncate">{currentTitle}</span>
      </h1>
    </div>
  );
};

export default Breadcrumb;
