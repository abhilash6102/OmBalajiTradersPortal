import { Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { 
  LayoutDashboard, Book, FileText, Receipt, CreditCard, 
  Wallet, BookOpen, BarChart3, Users, Store, Menu, X, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/kanta-book", label: "Kanta Book", icon: Book },
  { path: "/tak-patti", label: "Tak Patti", icon: FileText },
  { path: "/bazaar-bills", label: "Bazaar Bills", icon: Receipt },
  { path: "/padam", label: "Padam", icon: CreditCard },
  { path: "/bazaar-payments", label: "Bazaar Payments", icon: Wallet },
  { path: "/katha-book", label: "Katha Book", icon: BookOpen },
  { path: "/jama-karchu", label: "Jama–Karchu", icon: BarChart3 },
  { divider: true },
  { path: "/farmers", label: "Farmers", icon: Users },
  { path: "/traders", label: "Traders", icon: Store },
];

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-50 h-screen w-[270px] bg-sidebar flex flex-col transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="px-6 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-display font-bold text-lg">ॐ</span>
            </div>
            <div>
              <h1 className="text-sidebar-foreground font-display font-bold text-lg leading-tight uppercase">Om Balaji</h1>
              <p className="text-sidebar-foreground/50 text-xs tracking-wider uppercase">Traders Portal</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item, i) => {
            if (item.divider) return <div key={i} className="my-3 mx-3 border-t border-sidebar-border" />;
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-sidebar-border">
          <p className="text-sidebar-foreground/40 text-xs">© 2026 OM BALAJI TRADERS</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center h-16 px-4 lg:px-8">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="lg:hidden p-2 rounded-lg hover:bg-muted mr-2"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1" />
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8 pb-20">
          <Outlet />
        </main>
      </div>
    </div>
  );
}