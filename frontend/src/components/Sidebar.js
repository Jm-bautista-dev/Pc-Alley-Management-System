"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Package, Users, UserPlus, LogOut, LayoutDashboard,
  Settings, ShieldCheck, ChevronDown, Download, Upload, ClipboardList,
  DollarSign, FileText, CornerDownLeft, Activity,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import SettingsPanel from "./SettingsPanel";
import { useState, useEffect } from "react";
import { useLayout } from "@/context/LayoutContext";
import { useTheme } from "@/context/ThemeContext";
import { LogoBrandingV2, LogoIcon } from "./Logo";
import { usePreventBack } from "@/lib/usePreventBack";
import { useAuthGuard } from "@/lib/useAuthGuard";

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState(() => {
    const initial = {};
    const paths = {
      "Contacts":        ["/customers", "/customer-groups", "/import-contacts", "/suppliers"],
      "Products":        ["/products", "/reports/stock", "/products/my-requests", "/admin/product-requests", "/products/brands", "/products/import"],
      "Purchases":       ["/purchases"],
      "Sell":            ["/sell"],
      "Reports":         ["/reports"],
      "Analytics":       ["/forecasting", "/prescriptive-analytics"],
      "User Management": ["/staff", "/roles"],
    };
    Object.entries(paths).forEach(([key, matches]) => {
      if (matches.some((p) => pathname.startsWith(p))) initial[key] = true;
    });
    return initial;
  });

  const { isCollapsed, isMobile, isSidebarOpen, setIsSidebarOpen } = useLayout();
  const { theme } = useTheme();
  const { user, isChecking } = useAuthGuard();
  usePreventBack(!!user);
  const personnelTitle = user?.role === "super_admin" ? "Team List" : "Our Staff";

  const getNavItems = () => {
    const role = user?.role;
    if (role === "employee" || role === "staff") return [
      { title: "Dashboard",     icon: LayoutDashboard, path: "/dashboard",   group: "MAIN" },
      { title: "Sales Terminal", icon: Upload, path: "/sales",               group: "MAIN" },
      { title: "Sales",     icon: FileText,    path: "#sell",                group: "SALES", subItems: [{ title: "All Sales", path: "/sell/all" }, { title: "Warranties", path: "/sell/quotations" }, { title: "Saved Drafts", path: "/sell/drafts" }] },
      { title: "Customers", icon: Users,       path: "#contacts",            group: "SALES", subItems: [{ title: "Customer List", path: "/customers" }] },
      { title: "Products",  icon: Package,     path: "#products",            group: "SALES", subItems: [{ title: "Product List", path: "/products" }, { title: "Manage Stock", path: "/reports/stock" }] },
    ];
    if (role === "super_admin") return [
      { title: "Dashboard",    icon: LayoutDashboard, path: "/dashboard", group: "MAIN" },
      { title: "Contacts",     icon: Users,           path: "#contacts",  group: "SALES", subItems: [{ title: "Customer", path: "/customers" }, { title: "Supplier", path: "/suppliers" }] },
      { title: "Products",     icon: Package,         path: "#products",  group: "SALES", subItems: [{ title: "Product List", path: "/products" }, { title: "Manage Stock", path: "/reports/stock" }, { title: "Categories", path: "/products/categories" }, { title: "Brands", path: "/products/brands" }, { title: "Import Products", path: "/products/import" }, { title: "Product Requests", path: "/admin/product-requests" }] },
      { title: "Sales",        icon: Upload,          path: "#sell",      group: "SALES", subItems: [
        { title: "All Sales", path: "/sell/all" },
        { title: "Warranties", path: "/sell/quotations" },
        { title: "Returns", path: "/sell/returns" },
        { title: "Shipments", path: "/sell/shipments" },
        { title: "Discounts", path: "/sell/discounts" },
        { title: "Import Sales", path: "/sell/import" }
      ] },
      { title: "Buy Stock",    icon: Download,        path: "#purchases", group: "SALES", subItems: [{ title: "Stock Purchases", path: "/purchases" }, { title: "Order Stock", path: "/purchases/restock" }] },
      { title: "Reports",      icon: ClipboardList,   path: "#reports",   group: "SYSTEM", subItems: [{ title: "Profit / Loss", path: "/reports/profit-loss" }, { title: "Stock Activity", path: "/reports/purchase-sale" }, { title: "Brand Reports", path: "/reports/brands" }] },
      { title: "Analytics",    icon: Activity,        path: "#analytics", group: "SYSTEM", subItems: [
        { title: "Forecasting", path: "/forecasting" },
        { title: "Prescriptive Analytics", path: "/prescriptive-analytics" }
      ] },
      { title: "System Admin", icon: ShieldCheck,     path: "/admin",     group: "SYSTEM" },
    ];
    return [
      { title: "Dashboard",    icon: LayoutDashboard, path: "/dashboard",        group: "MAIN" },
      { title: "Customers",    icon: Users,           path: "#contacts",         group: "SALES", subItems: [{ title: "Customer List", path: "/customers" }] },
      { title: "Products",     icon: Package,         path: "#products",         group: "SALES", subItems: [{ title: "Product List", path: "/products" }, { title: "Manage Stock", path: "/reports/stock" }, { title: "Categories", path: "/products/categories" }, { title: "Brands", path: "/products/brands" }, { title: "My Requests", path: "/products/my-requests" }] },
      { title: "Buy Stock",    icon: Download,        path: "#purchases",        group: "SALES", subItems: [{ title: "Stock Purchases", path: "/purchases" }, { title: "Order Stock", path: "/purchases/restock" }] },
      { title: "Sales",        icon: Upload,          path: "#sell",             group: "SALES", subItems: [
        { title: "All Sales", path: "/sell/all" },
        { title: "Warranties", path: "/sell/quotations" },
        { title: "Saved Drafts", path: "/sell/drafts" },
        { title: "Returns", path: "/sell/returns" },
        { title: "Shipments", path: "/sell/shipments" },
        { title: "Discounts", path: "/sell/discounts" },
        { title: "Import Sales", path: "/sell/import" }
      ] },
      { title: personnelTitle, icon: UserPlus,        path: "#user-management",  group: "SALES", subItems: [{ title: "Staff List", path: "/staff" }] },
      { title: "Reports",      icon: ClipboardList,   path: "#reports",          group: "SYSTEM", subItems: [{ title: "Profit / Loss", path: "/reports/profit-loss" }, { title: "Stock Activity", path: "/reports/purchase-sale" }] },
    ];
  };

  const navItems = getNavItems();
  const menuGroups = ["MAIN", "SALES", "SYSTEM"];

  const toggleMenu = (title, e) => {
    if (e) e.preventDefault();
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleLogout = () => {
    // Clear entire session
    localStorage.clear();
    sessionStorage.clear();
    // Replace history so there's no "back" entry pointing to authenticated pages
    window.history.replaceState(null, '', '/');
    router.replace('/');
  };



  useEffect(() => {
    if (isMobile) setIsSidebarOpen(false);
    const items = getNavItems();
    setOpenMenus((prev) => {
      const next = { ...prev };
      let changed = false;
      items.forEach((item) => {
        if (item.subItems?.some((sub) => sub.path === pathname) && !next[item.title]) {
          next[item.title] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [pathname, isMobile]);

  const getRoleTheme = (role) => {
    switch (role?.toLowerCase()) {
      case "super_admin":
      case "admin":   return { color: "#A78BD2", border: "border-[#A78BD2]/40" };
      case "branch_admin":
      case "manager": return { color: "#7B8CDE", border: "border-[#7B8CDE]/40" };
      case "employee":
      case "staff":   return { color: "#F9A8C9", border: "border-[#F9A8C9]/40" };
      default:        return { color: "#86EFAC", border: "border-[#86EFAC]/40" };
    }
  };

  const roleTheme  = getRoleTheme(user?.role);
  const userFullName = user?.first_name ? `${user.first_name} ${user.last_name}` : (user?.username || "Admin User");
  const initials   = (user?.first_name ? `${user.first_name[0]}${user.last_name?.[0] || ''}` : (user?.username || "AD")).substring(0, 2).toUpperCase();
  const userName   = userFullName;
  const roleName   = { super_admin: "Super Admin", branch_admin: "Branch Manager", employee: "Staff Associate" }[user?.role] || "Administrator";
  const isAllowed  = (p) => user?.role === "employee" ? !["/analytics", "/admin", "/staff"].includes(p) : true;
  const isExpanded = !isCollapsed || isHovered || isMobile;

  if (isChecking) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 z-[45]"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
        animate={{
          width: isMobile ? 240 : (isCollapsed ? (isHovered ? 240 : 72) : 240),
          x: isMobile ? (isSidebarOpen ? 0 : -240) : 0,
        }}
        transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
        className="fixed left-0 top-0 h-screen bg-brand-surface border-r border-border flex flex-col z-50 overflow-hidden"
      >
        {/* ── Logo header ── */}
        <div className="h-16 flex items-center px-4 border-b border-border shrink-0">
          <Link href="/dashboard" className="flex items-center h-full w-full">
            {!isExpanded ? <LogoIcon className="w-7 h-7 mx-auto" /> : <LogoBrandingV2 size="normal" />}
          </Link>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar space-y-1">

          {!isExpanded ? (
            /* COLLAPSED — icon only, centered */
            <div className="space-y-1">
              {navItems.filter((i) => isAllowed(i.path)).map((item) => {
                const active = pathname === item.path || item.subItems?.some((s) => s.path === pathname);
                const Wrapper = item.subItems ? "button" : Link;
                return (
                  <Wrapper
                    key={item.title}
                    href={item.subItems ? undefined : item.path}
                    onClick={item.subItems ? (e) => toggleMenu(item.title, e) : undefined}
                    title={item.title}
                    className={`
                      w-full flex items-center justify-center
                      h-10 rounded-lg
                      ${active
                        ? "bg-brand-bgbase"
                        : "text-muted hover:text-main hover:bg-brand-bgbase"
                      }
                    `}
                  >
                    <div
                      className="w-7 h-7 flex items-center justify-center rounded-md"
                      style={active ? { backgroundColor: roleTheme.color + "25", color: roleTheme.color } : {}}
                    >
                      <item.icon size={15} strokeWidth={active ? 2.5 : 1.8} />
                    </div>
                  </Wrapper>
                );
              })}
            </div>

          ) : (
            /* EXPANDED — grouped with labels */
            <div className="space-y-5">
              {menuGroups.map((group) => {
                const items = navItems.filter((i) => i.group === group && isAllowed(i.path));
                if (!items.length) return null;
                return (
                  <div key={group}>
                    {/* Group label */}
                    <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted/60 select-none">
                      {group}
                    </p>

                    <div className="space-y-0.5">
                      {items.map((item) => {
                        const active = pathname === item.path || item.subItems?.some((s) => s.path === pathname);
                        const open   = openMenus[item.title];
                        const Wrapper = item.subItems ? "button" : Link;

                        return (
                          <div key={item.title}>
                            {/* Nav row */}
                            <Wrapper
                              href={item.subItems ? undefined : item.path}
                              onClick={item.subItems ? (e) => toggleMenu(item.title, e) : undefined}
                              className={`
                                relative w-full flex items-center gap-3
                                h-10 px-3 rounded-lg
                                text-sm font-medium
                                ${active
                                  ? "font-semibold"
                                  : "text-muted hover:text-main hover:bg-brand-bgbase"
                                }
                              `}
                              style={active ? { backgroundColor: roleTheme.color + "15", color: roleTheme.color } : {}}
                            >
                              {/* Active left bar */}
                              {active && (
                                <span
                                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                                  style={{ backgroundColor: roleTheme.color }}
                                />
                              )}

                              {/* Icon — fixed 28×28 box so all labels align */}
                              <span
                                className="w-7 h-7 flex items-center justify-center rounded-md shrink-0"
                                style={active ? { backgroundColor: roleTheme.color + "25" } : {}}
                              >
                                <item.icon size={15} strokeWidth={active ? 2.5 : 1.8} />
                              </span>

                              {/* Label */}
                              <span className="flex-1 text-left truncate">{item.title}</span>

                              {/* Chevron */}
                              {item.subItems && (
                                <ChevronDown
                                  size={13}
                                  className={`shrink-0 text-muted/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                                />
                              )}
                            </Wrapper>

                            {/* Sub-items — height animate */}
                            <AnimatePresence initial={false}>
                              {item.subItems && open && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.18, ease: "easeInOut" }}
                                  className="overflow-hidden"
                                >
                                  <div className="pl-10 pr-3 pt-0.5 pb-1 space-y-0.5">
                                    {item.subItems.map((sub) => {
                                      const subActive = pathname === sub.path;
                                      return (
                                        <Link
                                          key={sub.path}
                                          href={sub.path}
                                          className={`
                                            flex items-center gap-2.5
                                            h-8 px-2 rounded-md
                                            text-sm font-medium
                                            ${subActive
                                              ? "font-semibold"
                                              : "text-muted hover:text-main hover:bg-brand-bgbase"
                                            }
                                          `}
                                          style={subActive ? { color: roleTheme.color, backgroundColor: roleTheme.color + "12" } : {}}
                                        >
                                          <span
                                            className="w-1.5 h-1.5 rounded-full shrink-0"
                                            style={{
                                              backgroundColor: subActive ? roleTheme.color : "currentColor",
                                              opacity: subActive ? 1 : 0.3,
                                            }}
                                          />
                                          {sub.title}
                                        </Link>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Settings row */}
          <div className="pt-3 mt-3 border-t border-border">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`
                w-full flex items-center gap-3
                h-10 px-3 rounded-lg
                text-sm font-medium text-muted
                hover:text-main hover:bg-brand-bgbase
                ${!isExpanded ? "justify-center" : ""}
              `}
            >
              <span className="w-7 h-7 flex items-center justify-center rounded-md shrink-0">
                <Settings size={15} strokeWidth={1.8} />
              </span>
              {isExpanded && <span>Settings</span>}
            </button>
          </div>
        </nav>

        {/* ── Profile footer ── */}
        <div className="p-3 border-t border-border">
          <div
            className={`
              flex items-center gap-3 px-3 py-2.5
              rounded-lg bg-brand-bgbase border border-border
              ${!isExpanded ? "justify-center" : ""}
            `}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className={`w-8 h-8 rounded-lg border-2 ${roleTheme.border} flex items-center justify-center text-white text-xs font-bold`}
                style={{ backgroundColor: roleTheme.color }}
              >
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border-2 border-brand-surface" />
            </div>

            {isExpanded && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-main truncate leading-tight">{userName}</p>
                  <p className="text-xs text-muted truncate">{roleName}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Layout spacer */}
      {!isMobile && (
        <motion.div
          animate={{ width: isCollapsed ? 72 : 240 }}
          transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
          className="flex-shrink-0"
        />
      )}

      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

export default Sidebar;
