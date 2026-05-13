import { API_BASE_URL } from "../api/config";
import React, { useState, useEffect } from "react";
import { Plus, Trash2, X, Save, Search, ArrowDownLeft, ArrowUpRight, CreditCard, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

const EMPTY_FORM = {
  book_no: "", sl_no: "", date: "", type: "credit", party_name: "", village: "", crop_type: "", 
  amount: "", commission: "", hamali: "", dharvay: "", chata: ""
};

const formatMoney = (num) => {
  const parsed = Math.round(Number(num || 0));
  if (isNaN(parsed)) return "0.00";
  return parsed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const roundToInt = (num) => Math.round(Number(num || 0));

function toNum(v) {
  if (v === "" || v === null || v === undefined) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function groupByDate(entries) {
  const groups = {};
  entries.forEach(e => {
    const d = e.date || "No Date";
    if (!groups[d]) groups[d] = [];
    groups[d].push(e);
  });
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, rows]) => [
      dateKey,
      [...rows].sort((a, b) => {
        if (a.book_no !== b.book_no) return (a.book_no || 1) - (b.book_no || 1);
        return (a.sl_no || 0) - (b.sl_no || 0);
      })
    ]);
}

export default function Padam() {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState({});

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/padam`);
      const data = await res.json();
      if (Array.isArray(data)) {
        data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setEntries(data);
      }
    } catch (err) { console.error("Failed to load Padam entries", err); }
  };
  
  useEffect(() => { load(); }, []);

  const toggleDate = (key) => setCollapsedDates(prev => ({ ...prev, [key]: !prev[key] }));

  const getNextSlNo = async (type) => {
    try {
      const res = await fetch(`${API_BASE_URL}/padam`);
      const data = await res.json();
      const filteredData = data.filter(item => item.type === type);
      const maxSl = filteredData.reduce((max, item) => Math.max(max, Number(item.sl_no || 0)), 0);
      return maxSl + 1;
    } catch (err) { return 1; }
  };

  const handleAddNew = async () => {
    const nextSl = await getNextSlNo("credit");
    setEditId(null);
    setForm({ ...EMPTY_FORM, sl_no: nextSl, date: new Date().toISOString().split("T")[0] });
    setShowForm(true);
  };

  const setField = async (key, value) => {
    if (key === "type" && !editId) {
      const nextSl = await getNextSlNo(value);
      setForm(prev => ({ ...prev, [key]: value, sl_no: nextSl }));
    } else {
      setForm(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const amount = roundToInt(toNum(form.amount));
      const commission = roundToInt(toNum(form.commission));
      const hamali = roundToInt(toNum(form.hamali));
      const dharvay = roundToInt(toNum(form.dharvay));
      const chata = roundToInt(toNum(form.chata));
      
      const net_amount = form.type === "credit" 
        ? roundToInt(amount - (commission + hamali + dharvay + chata)) 
        : amount;

      const data = {
        ...form, amount, commission, hamali, dharvay, chata, net_amount
      };

      if (editId) {
        await fetch(`${API_BASE_URL}/padam/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      } else {
        await fetch(`${API_BASE_URL}/padam`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      }

      setLoading(false);
      setForm(EMPTY_FORM);
      setEditId(null);
      setShowForm(false);
      load();
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Save failed");
    }
  };

  const handleEdit = (row) => {
    setForm({
      book_no: row.book_no ?? 1, sl_no: row.sl_no ?? "", date: row.date ?? "", type: row.type ?? "credit",
      party_name: row.party_name ?? "", village: row.village ?? "", crop_type: row.crop_type ?? "",
      amount: row.amount ?? "", commission: row.commission ?? "", hamali: row.hamali ?? "",
      dharvay: row.dharvay ?? "", chata: row.chata ?? "",
    });
    setEditId(row._id || row.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try { await fetch(`${API_BASE_URL}/padam/${id}`, { method: "DELETE" }); load(); } catch (err) { console.error("Delete failed", err); }
  };

  const filtered = entries.filter(e =>
    !search || [e.party_name, e.village, e.crop_type].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const grouped = groupByDate(filtered);

  const globalCreditEntries = filtered.filter(e => e.type === "credit");
  const globalDebitEntries = filtered.filter(e => e.type === "debit");

  const totalCreditNet = globalCreditEntries.reduce((s, e) => s + (e.net_amount || 0), 0);
  const totalCreditComm = globalCreditEntries.reduce((s, e) => s + (e.commission || 0), 0);
  const totalCreditHamali = globalCreditEntries.reduce((s, e) => s + (e.hamali || 0), 0);
  const totalCreditDharvay = globalCreditEntries.reduce((s, e) => s + (e.dharvay || 0), 0);
  const totalCreditChata = globalCreditEntries.reduce((s, e) => s + (e.chata || 0), 0);

  const totalCreditGross = totalCreditNet + totalCreditComm + totalCreditHamali + totalCreditDharvay + totalCreditChata;
  const totalDebitNet = globalDebitEntries.reduce((s, e) => s + (e.net_amount || e.amount || 0), 0);
  const currentBalance = Math.abs(totalCreditGross - totalDebitNet);

  return (
    <div className="pb-20">
      <PageHeader title="Padam Ledger" subtitle="Credit–Debit Day Book — track daily financial balance between farmers and traders">
        {!showForm && <Button onClick={handleAddNew}><Plus className="w-4 h-4 mr-2" /> New Entry</Button>}
      </PageHeader>

      {!showForm && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard title="Overall Credit (Jama)" value={`₹${formatMoney(totalCreditGross)}`} icon={ArrowDownLeft} className="border-green-200 bg-green-50/30 text-green-800" />
            <StatCard title="Overall Debit (Udhar)" value={`₹${formatMoney(totalDebitNet)}`} icon={ArrowUpRight} className="border-red-200 bg-red-50/30 text-red-800" />
            <StatCard title="Overall Difference" value={`₹${formatMoney(currentBalance)}`} icon={CreditCard} />
          </div>

          <div className="mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search Name, Village, Crop..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">{editId ? "Edit Entry" : "New Entry"}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Entry Type</Label>
              <Select value={form.type} onValueChange={(v) => setField("type", v)}>
                <SelectTrigger className={form.type === "credit" ? "border-green-500 bg-green-50 text-green-700 font-bold" : "border-red-500 bg-red-50 text-red-700 font-bold"}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit" className="text-green-700 font-bold">Credit (Paid to Farmer)</SelectItem>
                  <SelectItem value="debit" className="text-red-700 font-bold">Debit (From Trader)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Book No.</Label><Input type="number" value={form.book_no} onChange={(e) => setField("book_no", e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Sl. No. / Bill No.</Label><Input type="number" value={form.sl_no} onChange={(e) => setField("sl_no", e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Date <span className="text-destructive">*</span></Label><Input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} required /></div>
            <div className="space-y-1.5"><Label className="text-xs">{form.type === "credit" ? "Farmer Name" : "Trader Name"} <span className="text-destructive">*</span></Label><Input placeholder="Name..." value={form.party_name} onChange={(e) => setField("party_name", e.target.value)} required /></div>

            {form.type === "credit" ? (
              <div className="space-y-1.5"><Label className="text-xs">Village</Label><Input placeholder="Village" value={form.village} onChange={(e) => setField("village", e.target.value)} /></div>
            ) : (
              <div className="space-y-1.5"><Label className="text-xs">Crop Type</Label><Input placeholder="Crop" value={form.crop_type} onChange={(e) => setField("crop_type", e.target.value)} /></div>
            )}

            <div className="space-y-1.5"><Label className="text-xs">{form.type === "credit" ? "Gross Amount (₹)" : "Total Amount (₹)"} <span className="text-destructive">*</span></Label><Input type="number" step="any" value={form.amount} onChange={(e) => setField("amount", e.target.value)} required /></div>

            {form.type === "credit" && (
              <>
                <div className="space-y-1.5"><Label className="text-xs">Commission (₹)</Label><Input type="number" step="any" value={form.commission} onChange={(e) => setField("commission", e.target.value)} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Hamali (₹)</Label><Input type="number" step="any" value={form.hamali} onChange={(e) => setField("hamali", e.target.value)} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Dharvay (₹)</Label><Input type="number" step="any" value={form.dharvay} onChange={(e) => setField("dharvay", e.target.value)} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Chata (₹)</Label><Input type="number" step="any" value={form.chata} onChange={(e) => setField("chata", e.target.value)} /></div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}><Save className="w-4 h-4 mr-2" />{loading ? "Saving..." : "Save Entry"}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {!showForm && grouped.map(([dateKey, rows]) => {
          const dailyCreditEntries = rows.filter(e => e.type === "credit");
          const dailyDebitEntries = rows.filter(e => e.type === "debit");

          const dTotalCreditNet = dailyCreditEntries.reduce((s, e) => s + (e.net_amount || 0), 0);
          const dTotalCreditComm = dailyCreditEntries.reduce((s, e) => s + (e.commission || 0), 0);
          const dTotalCreditHamali = dailyCreditEntries.reduce((s, e) => s + (e.hamali || 0), 0);
          const dTotalCreditDharvay = dailyCreditEntries.reduce((s, e) => s + (e.dharvay || 0), 0);
          const dTotalCreditChata = dailyCreditEntries.reduce((s, e) => s + (e.chata || 0), 0);

          const dTotalCreditGross = dTotalCreditNet + dTotalCreditComm + dTotalCreditHamali + dTotalCreditDharvay + dTotalCreditChata;
          const dTotalDebitNet = dailyDebitEntries.reduce((s, e) => s + (e.net_amount || e.amount || 0), 0);

          const dGrandTotal = Math.max(dTotalCreditGross, dTotalDebitNet);
          const dCreditShortfall = dGrandTotal > dTotalCreditGross ? dGrandTotal - dTotalCreditGross : 0;
          const dDebitShortfall = dGrandTotal > dTotalDebitNet ? dGrandTotal - dTotalDebitNet : 0;

          return (
            <div key={dateKey} className="mb-8">
              <button type="button" onClick={() => toggleDate(dateKey)} className="flex items-center gap-2 mb-2 w-full text-left">
                {collapsedDates[dateKey] ? <ChevronRight className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />}
                <span className="font-semibold text-primary text-sm">{formatDate(dateKey)}</span>
                <Badge variant="secondary" className="text-xs">{rows.length} entries</Badge>
              </button>

              {!collapsedDates[dateKey] && (
                <div className="flex flex-col md:flex-row border border-border rounded-xl overflow-hidden bg-card shadow-sm text-sm">
                  <div className="flex-1 border-b md:border-b-0 md:border-r border-border flex flex-col">
                    <div className="bg-green-50 text-green-800 font-bold p-3 border-b text-center tracking-wider">CREDIT — Farmers</div>
                    <div className="flex-1 overflow-x-auto min-h-[150px]">
                      <table className="w-full">
                        <thead className="bg-muted/50 border-b">
                          <tr>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Book-Sl.No</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Farmer</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Village</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Net Amount</th>
                            <th className="px-4 py-2.5"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyCreditEntries.map(row => (
                            <tr key={row._id || row.id} onClick={() => handleEdit(row)} className="border-b hover:bg-muted/20 cursor-pointer">
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                <span className="text-green-700 font-medium">{row.book_no || 1} </span>- {row.sl_no ?? "—"} 
                              </td>
                              <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{row.party_name}</td>
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{row.village || "—"}</td>
                              <td className="px-4 py-3 text-right font-mono font-semibold text-green-700 whitespace-nowrap">₹{formatMoney(row.net_amount || row.amount)}</td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(row._id || row.id); }}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-muted/30 p-4 border-t font-mono space-y-2 mt-auto">
                      <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                        <span className="font-medium text-sm whitespace-nowrap">Total Net Credit:</span> 
                        <span className="font-semibold text-sm whitespace-nowrap">₹{formatMoney(dTotalCreditNet)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                        <span className="font-medium text-sm whitespace-nowrap">Total Commission:</span> 
                        <span className="font-semibold text-sm whitespace-nowrap">₹{formatMoney(dTotalCreditComm)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                        <span className="font-medium text-sm whitespace-nowrap">Total Hamali:</span> 
                        <span className="font-semibold text-sm whitespace-nowrap">₹{formatMoney(dTotalCreditHamali)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                        <span className="font-medium text-sm whitespace-nowrap">Total Dharvay:</span> 
                        <span className="font-semibold text-sm whitespace-nowrap">₹{formatMoney(dTotalCreditDharvay)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                        <span className="font-medium text-sm whitespace-nowrap">Total Chata:</span> 
                        <span className="font-semibold text-sm whitespace-nowrap">₹{formatMoney(dTotalCreditChata)}</span>
                      </div>

                      {dCreditShortfall > 0 && <div className="flex justify-between font-bold text-amber-600 pt-1 border-t border-dashed border-amber-300 whitespace-nowrap"><span>By Balance c/d:</span> <span>₹{formatMoney(dCreditShortfall)}</span></div>}
                      <div className="flex justify-between font-bold text-sm text-green-800 pt-1 border-t-2 border-green-800 whitespace-nowrap"><span>Grand Total:</span> <span>₹{formatMoney(dGrandTotal)}</span></div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col">
                    <div className="bg-red-50 text-red-800 font-bold p-3 border-b text-center tracking-wider">DEBIT — Traders</div>
                    <div className="flex-1 overflow-x-auto min-h-[150px]">
                      <table className="w-full">
                        <thead className="bg-muted/50 border-b">
                          <tr>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Book-Bill.No</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Trader</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Crop</th>
                            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap text-right">Total Amount</th>
                            <th className="px-4 py-2.5"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyDebitEntries.map(row => (
                            <tr key={row._id || row.id} onClick={() => handleEdit(row)} className="border-b hover:bg-muted/20 cursor-pointer">
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap"><span className="text-red-700 font-medium">{row.book_no || 1}</span> - {row.sl_no ?? "—"}</td>
                              <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{row.party_name}</td>
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{row.crop_type || "—"}</td>
                              <td className="px-4 py-3 text-right font-mono font-semibold text-red-700 whitespace-nowrap">₹{formatMoney(row.net_amount || row.amount)}</td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(row._id || row.id); }}><Trash2 className="w-4 h-4" /></Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-muted/30 p-4 border-t font-mono space-y-2 mt-auto">
                      <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                        <span className="font-medium text-sm whitespace-nowrap">Total Debit:</span> 
                        <span className="font-semibold text-sm whitespace-nowrap">₹{formatMoney(dTotalDebitNet)}</span>
                      </div>
                      {dDebitShortfall > 0 && <div className="flex justify-between font-bold text-amber-600 pt-1 border-t border-dashed border-amber-300 whitespace-nowrap"><span>To Balance c/d:</span> <span>₹{formatMoney(dDebitShortfall)}</span></div>}
                      <div className="flex justify-between font-bold text-sm text-red-800 pt-1 border-t-2 border-red-800 mt-6 whitespace-nowrap"><span>Grand Total:</span> <span>₹{formatMoney(dGrandTotal)}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
      })}
    </div>
  );
}