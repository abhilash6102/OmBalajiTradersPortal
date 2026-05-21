import { API_BASE_URL } from "../api/config";
import React, { useState, useEffect } from "react";
import { Plus, Trash2, X, Save, Search, ChevronDown, ChevronRight, BookOpen, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "../components/PageHeader";

const formatMoney = (num) => Math.round(Number(num || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY_FORM = {
  record_type: "credit", 
  trader_name: "",
  date: new Date().toISOString().split("T")[0],
  amount: "",
  bill_no: ""
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const cleanDate = dateStr.split("T")[0];
  const [y, m, d] = cleanDate.split("-");
  return `${d}/${m}/${y}`;
}

export default function KathaBook() {
  const [entries, setEntries] = useState([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("traders"); 
  
  const [collapsedTraders, setCollapsedTraders] = useState({});
  const [collapsedMonths, setCollapsedMonths] = useState({});

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/kathabook`);
      const data = await res.json();
      if (Array.isArray(data)) setEntries(data);
    } catch (err) {
      console.error("Failed to load KathaBook", err);
    }
  };

  useEffect(() => {
    const initial = {};
    entries.forEach(e => {
      if (e.trader_name) initial[e.trader_name] = true;
    });
    setCollapsedTraders(initial);
  }, [entries]);

  useEffect(() => { load(); }, []);

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleAddNew = () => {
    setEditId(null);
    setForm({ 
      ...EMPTY_FORM, 
      record_type: activeTab === "commissions" ? "commission" : "credit" 
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = { ...form, amount: Number(form.amount), is_auto_generated: false };
    if (form.record_type === "commission") {
      payload.trader_name = "";
      payload.bill_no = "";
    }

    try {
      if (editId) {
        await fetch(`${API_BASE_URL}/kathabook/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch(`${API_BASE_URL}/kathabook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      setLoading(false);
      setForm(EMPTY_FORM);
      setEditId(null);
      setShowForm(false);
      load();
    } catch (err) {
      console.error("Save failed", err);
      setLoading(false);
      alert("Save failed: " + err.message);
    }
  };

  const handleEdit = (row) => {
    setForm({
      record_type: row.record_type ?? "credit",
      trader_name: row.trader_name ?? "",
      date: row.date ? row.date.split("T")[0] : "",
      amount: row.amount ?? "",
      bill_no: row.bill_no ?? ""
    });
    setEditId(row._id || row.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this manual ledger record? Note: Automated records should ideally be deleted from Kanta Book or Bazaar Payments directly to keep things perfectly synced.")) return;
    try {
      await fetch(`${API_BASE_URL}/kathabook/${id}`, { method: "DELETE" });
      load();
    } catch (err) { console.error("Delete failed", err); }
  };

  // 🔥 DAY-TO-DAY & MONTH-WISE COMMISSION GROUPING LOGIC (Perfected Chronological Sorting)
  const commissionRecords = entries.filter(e => e.record_type === "commission");
  const commGroups = {};
  
  commissionRecords.forEach(e => {
    const rawDate = e.date ? e.date.split("T")[0] : "";
    const d = new Date(rawDate);
    
    let monthLabel = "Unknown Month";
    let sortKey = "0000-00";

    if (!isNaN(d.getTime())) {
      monthLabel = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }); // e.g., "April 2026"
      sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // e.g., "2026-04" for perfect sorting
    }

    if (!commGroups[sortKey]) {
      commGroups[sortKey] = { label: monthLabel, days: {} };
    }
    
    if (!commGroups[sortKey].days[rawDate]) {
      commGroups[sortKey].days[rawDate] = 0;
    }
    
    // Sums up multiple Kanta entries on the same day into one daily total
    commGroups[sortKey].days[rawDate] += Number(e.amount) || 0;
  });
  
  // Sort months newest first
  const commissionEntries = Object.entries(commGroups).sort(([a], [b]) => b.localeCompare(a));

  // TRADER LEDGER GROUPING LOGIC
  const traderRecords = entries.filter(e => e.record_type !== "commission");
  const filteredTraders = traderRecords.filter(t => !searchFilter || t.trader_name?.toLowerCase().includes(searchFilter.toLowerCase()));
  
  const traderGroups = {};
  filteredTraders.forEach(e => {
    const tName = e.trader_name || "Unknown Trader";
    if (!traderGroups[tName]) traderGroups[tName] = { credits: [], debits: [] };
    if (e.record_type === "credit") traderGroups[tName].credits.push(e);
    if (e.record_type === "debit") traderGroups[tName].debits.push(e);
  });
  const traderLedgerEntries = Object.entries(traderGroups).sort(([a], [b]) => a.localeCompare(b));

  const toggleTrader = (key) => setCollapsedTraders(p => ({ ...p, [key]: !p[key] }));
  const toggleMonth = (key) => setCollapsedMonths(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="pb-20">
      <PageHeader title="Katha Book" subtitle="Trader account ledgers & daily commissions">
        {!showForm && (
          <Button onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" /> New Ledger Entry
          </Button>
        )}
      </PageHeader>

      {!showForm && (
        <div className="flex gap-2 mb-6 border-b border-border pb-px">
          <button onClick={() => setActiveTab("traders")} className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === "traders" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Trader Ledgers</button>
          <button onClick={() => setActiveTab("commissions")} className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === "commissions" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Day-to-Day Commissions</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">{editId ? "Edit Entry" : "New Ledger Entry"}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div className="space-y-1.5">
              <Label className="text-xs">Record Type <span className="text-destructive">*</span></Label>
              <Select value={form.record_type} onValueChange={(v) => setField("record_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">CREDIT (Payment Received)</SelectItem>
                  <SelectItem value="debit">DEBIT (Purchase/Sale)</SelectItem>
                  <SelectItem value="commission">Daily Commission (Income)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Date <span className="text-destructive">*</span></Label><Input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} required /></div>
            <div className="space-y-1.5"><Label className="text-xs">Amount (₹) <span className="text-destructive">*</span></Label><Input type="number" step="any" placeholder="0.00" value={form.amount} onChange={(e) => setField("amount", e.target.value)} required /></div>
            {form.record_type !== "commission" && (
              <>
                <div className="space-y-1.5"><Label className="text-xs">Trader Name <span className="text-destructive">*</span></Label><Input placeholder="Trader Name" value={form.trader_name} onChange={(e) => setField("trader_name", e.target.value)} required /></div>
                <div className="space-y-1.5"><Label className="text-xs">Bill No. (Optional)</Label><Input placeholder="e.g. 1-1" value={form.bill_no} onChange={(e) => setField("bill_no", e.target.value)} /></div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}><Save className="w-4 h-4 mr-2" />{loading ? "Saving..." : "Save Entry"}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* CONTENT: TRADERS LEDGER */}
      {!showForm && activeTab === "traders" && (
        <>
          <div className="mb-4 relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search Trader..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="pl-9" />
          </div>

          {traderLedgerEntries.length === 0 && <div className="bg-card rounded-xl border border-border py-14 text-center text-muted-foreground text-sm shadow-sm">No trader ledger records found.</div>}

          {traderLedgerEntries.map(([tName, records]) => {
            const totalCredit = records.credits.reduce((s, c) => s + (Number(c.amount) || 0), 0);
            const totalDebit = records.debits.reduce((s, c) => s + (Number(c.amount) || 0), 0);
            const maxRows = Math.max(records.credits.length, records.debits.length);
            const overallGrandTotal = Math.max(totalCredit, totalDebit);
            const balanceDiff = Math.abs(totalCredit - totalDebit);

            return (
              <div key={tName} className="mb-8">
                <button type="button" onClick={() => toggleTrader(tName)} className="flex items-center gap-2 mb-2 w-full text-left font-bold text-primary text-lg">
                  {collapsedTraders[tName] ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  <span className="uppercase tracking-wide">{tName}</span>
                </button>

                {!collapsedTraders[tName] && (
                  <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                      


                      {/* 🔥 CREDIT SIDE (Always on the RIGHT) */}
                      <div>
                        <div className="bg-emerald-50/50 px-4 py-3 border-b border-border font-bold text-sm text-emerald-800 text-center tracking-widest uppercase">
                          CREDIT — Traders
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/30 border-b border-border text-muted-foreground">
                                <th className="px-4 py-3 font-medium text-left uppercase text-xs tracking-wider">Bill No</th>
                                <th className="px-4 py-3 font-medium text-center uppercase text-xs tracking-wider">Credited Date</th>
                                <th className="px-4 py-3 font-medium text-right uppercase text-xs tracking-wider">Amount (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: maxRows }).map((_, i) => {
                                const row = records.credits[i];
                                if (!row) return <tr key={`c-empty-${i}`} className="h-[49px] border-b border-border/50"><td colSpan={3}></td></tr>;
                                return (
                                  <tr key={row._id || row.id} onClick={() => handleEdit(row)} className="border-b border-border/50 hover:bg-muted/40 cursor-pointer">
                    
<td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
  {row.book_no ? `${row.book_no}-${row.sl_no || "—"}` : "—"}
</td>
                                    <td className="px-4 py-3 text-center whitespace-nowrap text-muted-foreground">{formatDate(row.date)}</td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap font-mono font-bold text-emerald-600">₹{formatMoney(row.amount)}</td>
                                  </tr>
                                  
                                  
                                );
                              })}
                              {/* CREDIT TOTALS */}
                              <tr className="border-t border-border/50">
                                <td colSpan={2} className="px-4 py-3 text-right uppercase text-xs tracking-widest text-muted-foreground">Total Credit:</td>
                                <td className="px-4 py-3 text-right font-mono font-bold">₹{formatMoney(totalCredit)}</td>
                              </tr>
                              {/* BALANCE ROW */}
                              {totalDebit > totalCredit ? (
                                <tr>
                                  <td colSpan={2} className="px-4 py-3 text-right uppercase text-xs tracking-widest text-amber-600 font-bold">To Balance c/d:</td>
                                  <td className="px-4 py-3 text-right font-mono font-bold text-amber-600">₹{formatMoney(balanceDiff)}</td>
                                </tr>
                              ) : (
                                <tr><td colSpan={3} className="h-[45px]"></td></tr>
                              )}
                              {/* GRAND TOTAL */}
                              
                              <tr className="border-t-2 border-emerald-600/50 bg-emerald-50/30">
                                <td colSpan={2} className="px-4 py-3 text-right uppercase text-sm tracking-widest font-bold text-emerald-800">Grand Total:</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-base text-emerald-700">₹{formatMoney(overallGrandTotal)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                                            {/* 🔥 DEBIT SIDE (Always on the LEFT) */}
                      <div>
                        <div className="bg-rose-50/50 px-4 py-3 border-b border-border font-bold text-sm text-rose-800 text-center tracking-widest uppercase">
                          DEBIT — Traders
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/30 border-b border-border text-muted-foreground">
                                <th className="px-4 py-3 font-medium text-left uppercase text-xs tracking-wider">Bill No</th>
                                <th className="px-4 py-3 font-medium text-center uppercase text-xs tracking-wider">Purchase Date</th>
                                <th className="px-4 py-3 font-medium text-right uppercase text-xs tracking-wider">Amount (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: maxRows }).map((_, i) => {
                                const row = records.debits[i];
                                if (!row) return <tr key={`d-empty-${i}`} className="h-[49px] border-b border-border/50"><td colSpan={3}></td></tr>;
                                return (
                                  <tr key={row._id || row.id} onClick={() => handleEdit(row)} className="border-b border-border/50 hover:bg-muted/40 cursor-pointer">
                                    <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                                      {row.book_no ? `${row.book_no}-${row.sl_no || "—"}` : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-center whitespace-nowrap text-muted-foreground">{formatDate(row.date)}</td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap font-mono font-bold text-rose-600">₹{formatMoney(row.amount)}</td>
                                  </tr>
                                );
                              })}
                              {/* DEBIT TOTALS */}
                              <tr className="border-t border-border/50">
                                <td colSpan={2} className="px-4 py-3 text-right uppercase text-xs tracking-widest text-muted-foreground">Total Debit:</td>
                                <td className="px-4 py-3 text-right font-mono font-bold">₹{formatMoney(totalDebit)}</td>
                              </tr>
                              {/* BALANCE ROW */}
                              {totalCredit > totalDebit ? (
                                <tr>
                                  <td colSpan={2} className="px-4 py-3 text-right uppercase text-xs tracking-widest text-amber-600 font-bold">To Balance c/d:</td>
                                  <td className="px-4 py-3 text-right font-mono font-bold text-amber-600">₹{formatMoney(balanceDiff)}</td>
                                </tr>
                              ) : (
                                <tr><td colSpan={3} className="h-[45px]"></td></tr>
                              )}
                              {/* GRAND TOTAL */}
                              <tr className="border-t-2 border-rose-600/50 bg-rose-50/30">
                                <td colSpan={2} className="px-4 py-3 text-right uppercase text-sm tracking-widest font-bold text-rose-800">Grand Total:</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-base text-rose-700">₹{formatMoney(overallGrandTotal)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* 🔥 CONTENT: DAILY COMMISSIONS */}
      {!showForm && activeTab === "commissions" && (
        <>
          {commissionEntries.length === 0 && (
            <div className="bg-card rounded-xl border border-border py-14 text-center text-muted-foreground text-sm shadow-sm mt-4">
              No daily commission records found.
            </div>
          )}

          {commissionEntries.map(([sortKey, monthData]) => {
            // Sort dates descending for day-to-day layout
            const dayEntries = Object.entries(monthData.days).sort(([a], [b]) => b.localeCompare(a));
            const monthTotal = dayEntries.reduce((s, [_, amt]) => s + amt, 0);
            const count = dayEntries.length;

            return (
              <div key={sortKey} className="mb-6 mt-4 max-w-2xl">
                <button type="button" onClick={() => toggleMonth(sortKey)} className="flex items-center gap-2 mb-2 w-full text-left font-semibold text-primary">
                  {collapsedMonths[sortKey] ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <Percent className="w-4 h-4 text-primary" />
                  <span className="text-base tracking-wide uppercase">
                    {monthData.label} <span className="lowercase font-normal text-muted-foreground ml-1">({count} commissions)</span>
                  </span>
                </button>

                {!collapsedMonths[sortKey] && (
                  <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/30 border-b border-border text-muted-foreground">
                            <th className="text-left px-6 py-2.5 font-medium whitespace-nowrap uppercase tracking-wider text-xs">Date</th>
                            <th className="text-right px-6 py-2.5 font-medium whitespace-nowrap uppercase tracking-wider text-xs">Commission Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {dayEntries.map(([dateKey, amt]) => (
                            <tr key={dateKey} className="hover:bg-muted/40 transition-colors">
                              <td className="px-6 py-3 whitespace-nowrap font-mono">{formatDate(dateKey)}</td>
                              <td className="px-6 py-3 text-right font-mono font-medium whitespace-nowrap text-emerald-600">₹{formatMoney(amt)}</td>
                            </tr>
                          ))}
                          <tr className="bg-primary/5 font-bold border-t-2 border-primary/20">
                            <td className="px-6 py-3 text-right uppercase tracking-widest text-primary text-xs">Monthly Total</td>
                            <td className="px-6 py-3 text-right font-mono text-base text-primary whitespace-nowrap">₹{formatMoney(monthTotal)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}