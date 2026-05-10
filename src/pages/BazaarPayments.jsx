import React, { useState, useEffect } from "react";
import { CheckCircle2, Clock, CheckCheck, Trash2, Search, IndianRupee, AlertCircle, Wallet, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

const BANK_LABELS = { sbi: "SBI", icici: "ICICI", union: "Union Bank", canara: "Canara Bank", other: "Other" };
const BANK_COLORS = {
  sbi: "bg-blue-100 text-blue-700 border-blue-200",
  icici: "bg-orange-100 text-orange-700 border-orange-200",
  union: "bg-purple-100 text-purple-700 border-purple-200",
  canara: "bg-green-100 text-green-700 border-green-200",
  other: "bg-gray-100 text-gray-700 border-gray-200"
};

// 🔥 STRICT 2-DECIMAL HELPER
const format2 = (num) => {
  const parsed = Math.round(Number(num || 0));
  if (isNaN(parsed)) return "0.00";
  return parsed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function isOverdue(expectedDate) {
  if (!expectedDate) return false;
  return new Date(expectedDate) < new Date();
}

// 🔥 GROUPS BY DATE IN DESCENDING ORDER, RECORDS IN ASCENDING ORDER
function groupByDate(entries) {
  const groups = {};
  entries.forEach(e => {
    const d = e.crop_date || "No Date";
    if (!groups[d]) groups[d] = [];
    groups[d].push(e);
  });
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a)) // 🔥 Descending Order for Dates
    .map(([dateKey, rows]) => [
      dateKey,
      [...rows].sort((a, b) => {
        if (a.book_no !== b.book_no) return (a.book_no || 1) - (b.book_no || 1);
        return (a.sl_no || 0) - (b.sl_no || 0); // 🔥 Ascending Order for Records
      })
    ]);
}

export default function BazaarPayments() {
  const [payments, setPayments] = useState([]);
  const [searchTrader, setSearchTrader] = useState("");
  const [searchAmount, setSearchAmount] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bankFilter, setBankFilter] = useState("all");
  const [confirmModal, setConfirmModal] = useState(null);
  const [confirmForm, setConfirmForm] = useState({ bank: "", credited_date: "" });
  const [loading, setLoading] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState({});

  const load = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/bazaarpayments");
      const data = await res.json();
      if (Array.isArray(data)) {
        data.sort((a, b) => {
          const dateA = a.crop_date ? new Date(a.crop_date).getTime() : 0;
          const dateB = b.crop_date ? new Date(b.crop_date).getTime() : 0;
          return dateB - dateA;
        });
        setPayments(data);
      }
    } catch (err) { console.error("Failed to load Bazaar Payments", err); }
  };
  
  useEffect(() => { load(); }, []);

  const toggleDate = (key) => setCollapsedDates(prev => ({ ...prev, [key]: !prev[key] }));

  const openConfirm = (payment) => {
    setConfirmModal(payment);
    setConfirmForm({
      bank: payment.bank || "",
      credited_date: payment.credited_date || new Date().toISOString().split("T")[0]
    });
  };

  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updateId = confirmModal._id || confirmModal.id;
      await fetch(`http://localhost:5000/api/bazaarpayments/${updateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...confirmForm, is_credited: true }),
      });
      setLoading(false);
      setConfirmModal(null);
      load();
    } catch (err) {
      console.error("Confirm failed", err);
      setLoading(false);
    }
  };

  const handleUnmark = async (payment) => {
    if (!window.confirm("Unmark this payment as credited?")) return;
    try {
      const updateId = payment._id || payment.id;
      await fetch(`http://localhost:5000/api/bazaarpayments/${updateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_credited: false, credited_date: null, bank: null }),
      });
      load();
    } catch (err) { console.error("Unmark failed", err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this payment record?")) return;
    try {
      await fetch(`http://localhost:5000/api/bazaarpayments/${id}`, { method: "DELETE" });
      load();
    } catch (err) { console.error("Delete failed", err); }
  };

  const filtered = payments.filter((p) => {
    const matchTrader = !searchTrader || p.trader_name?.toLowerCase().includes(searchTrader.toLowerCase());
    const matchAmount = !searchAmount || String(Math.round(p.amount || 0)).includes(searchAmount);
    const matchDate = !dateFilter || p.crop_date === dateFilter;
    const matchStatus = statusFilter === "all" || (statusFilter === "credited" ? p.is_credited : !p.is_credited);
    const matchBank = bankFilter === "all" || p.bank === bankFilter;
    return matchTrader && matchAmount && matchDate && matchStatus && matchBank;
  });

  const grouped = groupByDate(filtered);

  const totalPending = filtered.filter((p) => !p.is_credited).reduce((s, p) => s + (p.amount || 0), 0);
  const totalCredited = filtered.filter((p) => p.is_credited).reduce((s, p) => s + (p.amount || 0), 0);
  const overdueCount = filtered.filter((p) => !p.is_credited && isOverdue(p.expected_payment_date)).length;

  return (
    <div className="pb-20">
      <PageHeader title="Bazaar Payments" subtitle="Track trader payments — confirm when amounts are credited to your bank account" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Pending" value={`₹${format2(totalPending)}`} icon={Clock} className="border-amber-200 bg-amber-50/30" />
        <StatCard title="Total Credited" value={`₹${format2(totalCredited)}`} icon={Wallet} className="border-green-200 bg-green-50/30" />
        <StatCard title="Overdue Payments" value={overdueCount} icon={AlertCircle} className={overdueCount > 0 ? "border-destructive/50 bg-destructive/5" : ""} />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Trader name..." value={searchTrader} onChange={(e) => setSearchTrader(e.target.value)} className="pl-9 w-44" />
        </div>
        <Input placeholder="Amount..." type="number" step="any" value={searchAmount} onChange={(e) => setSearchAmount(e.target.value)} className="w-32 font-mono" />
        <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-44" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="credited">Credited</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bankFilter} onValueChange={setBankFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Banks" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Banks</SelectItem>
            {Object.entries(BANK_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {grouped.length === 0 ? (
        <div className="bg-card rounded-xl border border-border py-14 text-center text-muted-foreground text-sm">
          No payment records found.
        </div>
      ) : (
        grouped.map(([dateKey, rows]) => (
          <div key={dateKey} className="mb-6">
            <button type="button" onClick={() => toggleDate(dateKey)} className="flex items-center gap-2 mb-2 w-full text-left">
              {collapsedDates[dateKey] ? <ChevronRight className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />}
              <span className="font-semibold text-primary text-sm">{formatDate(dateKey)}</span>
              <Badge variant="secondary" className="text-xs">{rows.length} payments</Badge>
            </button>

            {!collapsedDates[dateKey] && (
              <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Book-Bill.No</th>
                        {["Trader", "Crop", "Expected By", "Amount (₹)", "Bank", "Status", "Credited On", ""].map((h) =>
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((payment) => {
                        const overdue = !payment.is_credited && isOverdue(payment.expected_payment_date);
                        return (
                          <tr key={payment._id || payment.id} className={`border-b border-border last:border-0 transition-colors ${overdue ? "bg-red-50/40" : "hover:bg-muted/20"}`}>
                            <td className="px-4 py-4 text-muted-foreground font-semibold whitespace-nowrap">
                              <span className="text-primary">{payment.book_no || 1}</span> - {payment.sl_no ?? "—"}
                            </td>
                            <td className="px-4 py-4 font-medium whitespace-nowrap">{payment.trader_name || "—"}</td>
                            <td className="px-4 py-4">{payment.crop_type || "—"}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={overdue ? "text-destructive font-semibold" : ""}>{formatDate(payment.expected_payment_date)}{overdue && " ⚠"}</span>
                            </td>
                            <td className="px-4 py-4 font-mono font-bold text-primary">₹{format2(payment.amount)}</td>
                            <td className="px-4 py-4">
                              {payment.bank ?
                                <Badge variant="outline" className={BANK_COLORS[payment.bank] || BANK_COLORS.other}>{BANK_LABELS[payment.bank] || payment.bank}</Badge> :
                                <span className="text-muted-foreground text-xs">—</span>}
                            </td>
                            <td className="px-4 py-4">
                              {payment.is_credited ?
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1 w-fit"><CheckCheck className="w-3 h-3" /> Credited</Badge> :
                                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> Pending</Badge>}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">{formatDate(payment.credited_date)}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-end gap-1">
                                {payment.is_credited ?
                                  <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => handleUnmark(payment)}>Unmark</Button> :
                                  <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => openConfirm(payment)}>
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Mark
                                  </Button>
                                }
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(payment._id || payment.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      <Dialog open={!!confirmModal} onOpenChange={() => setConfirmModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Confirm Payment Credited</DialogTitle></DialogHeader>
          {confirmModal &&
            <div className="mb-3 p-3 bg-muted/50 rounded-lg text-sm space-y-1">
              <p><span className="text-muted-foreground">Trader:</span> <strong>{confirmModal.trader_name}</strong></p>
              <p><span className="text-muted-foreground">Amount:</span> <strong className="text-primary">₹{format2(confirmModal.amount)}</strong></p>
              <p><span className="text-muted-foreground">Crop Date:</span> {formatDate(confirmModal.crop_date)}</p>
            </div>
          }
          <form onSubmit={handleConfirmSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Bank Received In <span className="text-destructive">*</span></Label>
              <Select value={confirmForm.bank} onValueChange={(v) => setConfirmForm((p) => ({ ...p, bank: v }))} required>
                <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BANK_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Credited Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={confirmForm.credited_date} onChange={(e) => setConfirmForm((p) => ({ ...p, credited_date: e.target.value }))} required />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setConfirmModal(null)}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={loading || !confirmForm.bank}>
                {loading ? "Saving..." : "Confirm Credited"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}