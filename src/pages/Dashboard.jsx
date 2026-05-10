import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  Book, FileText, Receipt, CreditCard, Wallet, BookOpen, BarChart3,
  ArrowUpRight, TrendingUp, Users, Store, Wheat, IndianRupee, Banknote 
} from "lucide-react";
import StatCard from "../components/StatCard";
import { motion } from "framer-motion";

const modules = [
  { path: "/kanta-book", label: "Kanta Book", desc: "Initial crop entry register", icon: Book, color: "bg-emerald-500" },
  { path: "/tak-patti", label: "Tak Patti", desc: "Detailed farmer transaction sheet", icon: FileText, color: "bg-amber-500" },
  { path: "/bazaar-bills", label: "Bazaar Bills", desc: "Trader billing register", icon: Receipt, color: "bg-blue-500" },
  { path: "/padam", label: "Padam", desc: "Credit–Debit ledger book", icon: CreditCard, color: "bg-purple-500" },
  { path: "/bazaar-payments", label: "Bazaar Payments", desc: "Trader payment tracking", icon: Wallet, color: "bg-rose-500" },
  { path: "/katha-book", label: "Katha Book", desc: "Trader account ledger", icon: BookOpen, color: "bg-teal-500" },
  { path: "/jama-karchu", label: "Jama–Karchu", desc: "Final financial statement", icon: BarChart3, color: "bg-indigo-500" },
];

// 🔥 STRICT 2-DECIMAL HELPER (Rounded exactly like your ledgers)
const formatMoney = (num) => {
  const parsed = Math.round(Number(num || 0));
  if (isNaN(parsed)) return "0.00";
  return parsed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function Dashboard() {
  const [stats, setStats] = useState({ 
    farmers: 0, 
    traders: 0, 
    kantaEntries: 0, 
    todayVolume: 0,
    overallProfit: 0,
    overallIncome: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      const today = new Date().toISOString().split("T")[0];

      try {
        // 🔥 Replaced base44 with native fetches to your local database
        const [kantaRes, takPattiRes, bazaarBillsRes] = await Promise.all([
          fetch("http://localhost:5000/api/kanta").then(r => r.json()).catch(() => []),
          fetch("http://localhost:5000/api/takpatti").then(r => r.json()).catch(() => []),
          fetch("http://localhost:5000/api/bazaarbills").then(r => r.json()).catch(() => [])
        ]);

        // Calculate unique counts
        const uniqueFarmers = new Set(takPattiRes.map(t => t.farmer_name).filter(Boolean)).size;
        const uniqueTraders = new Set(bazaarBillsRes.map(b => b.trader_name).filter(Boolean)).size;
        
        // Calculate Today's Volume (Total sum_amount from today's TakPatti)
        const todayVolume = takPattiRes
          .filter(t => t.date === today)
          .reduce((sum, t) => sum + (Number(t.sum_amount) || 0), 0);

        // 🔥 OVERALL PROFIT: Sum of all commissions across ALL days
        const overallProfit = takPattiRes.reduce((sum, t) => sum + (Number(t.commission) || 0), 0);

        // 🔥 OVERALL INCOME: Sum of all sub_totals in Bazaar Bills across ALL days
        const overallIncome = bazaarBillsRes.reduce((sum, b) => sum + (Number(b.sub_total || b.net_amount || b.total_amount) || 0), 0);

        setStats({
          farmers: uniqueFarmers,
          traders: uniqueTraders,
          kantaEntries: Array.isArray(kantaRes) ? kantaRes.length : 0,
          todayVolume,
          overallProfit,
          overallIncome
        });
      } catch (err) {
        console.error("Failed to load dashboard stats", err);
      }
    };

    loadStats();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <div className="mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest mb-2">Welcome back</p>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground">
            OM BALAJI TRADERS
          </h1>
          <p className="text-muted-foreground mt-2 max-w-lg">
            Manage your agricultural trading operations — from crop entries to final financial statements.
          </p>
        </motion.div>
      </div>

      {/* Highlighted Analysis Cards (Overall Cumulative Totals) */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Analysis</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          
          {/* OVERALL PROFIT CARD */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-emerald-100 text-xs font-semibold uppercase tracking-widest mb-1">OVERALL PROFIT (COMMISSION)</p>
                <p className="text-3xl font-bold font-mono">₹{formatMoney(stats.overallProfit)}</p>
                <p className="text-emerald-200 text-xs mt-2">Cumulative profit</p>
              </div>
              <div className="bg-white/20 rounded-xl p-2.5 z-10 relative">
                <IndianRupee className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full bg-white/5" />
          </div>

          {/* OVERALL INCOME CARD */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-blue-100 text-xs font-semibold uppercase tracking-widest mb-1">OVERALL INCOME (SALES)</p>
                <p className="text-3xl font-bold font-mono">₹{formatMoney(stats.overallIncome)}</p>
                <p className="text-blue-200 text-xs mt-2">Total revenue</p>
              </div>
              <div className="bg-white/20 rounded-xl p-2.5 z-10 relative">
                <Banknote className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full bg-white/5" />
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard title="Farmers" value={stats.farmers} icon={Users} />
        <StatCard title="Traders" value={stats.traders} icon={Store} />
        <StatCard title="Kanta Entries" value={stats.kantaEntries} icon={Wheat} />
        <StatCard title="Today's Volume" value={`₹${formatMoney(stats.todayVolume)}`} icon={TrendingUp} />
      </div>

      {/* Module Navigation Cards */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Modules</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {modules.map((mod, i) => {
          const Icon = mod.icon;
          return (
            <motion.div
              key={mod.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Link
                to={mod.path}
                className="group block bg-card rounded-xl border border-border p-5 hover:shadow-xl hover:border-primary/20 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl ${mod.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">{mod.label}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{mod.desc}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}