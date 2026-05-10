import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Search, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import StatCard from "../components/StatCard";
import { BookOpen, ArrowDownLeft, ArrowUpRight } from "lucide-react";

const CROP_OPTIONS = ["Maize", "Paddy", "Ground Nut", "Red Gram", "Black Gram", "Ragi", "Lobia", "Cotton"];

const EMPTY_FORM = {
  date: "", trader_name: "", type: "", crop_type: "", net_weight: "",
  price_per_unit: "", amount: "", bazaar_bill_ref: "", due_date: "", remarks: ""
};

function toNum(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

const columns = [
  { key: "date", label: "Date" },
  { key: "trader_name", label: "Trader" },
  { key: "type", label: "Type", render: (r) => (
    <Badge variant="outline" className={r.type === "credit" ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}>
      {r.type === "debit" ? "Debit" : "Credit"}
    </Badge>
  )},
  { key: "crop_type", label: "Crop" },
  { key: "net_weight", label: "Wt (Q)", cellClassName: "font-mono" },
  { key: "amount", label: "Amount", cellClassName: "font-mono font-semibold", render: (r) => `₹${(r.amount || 0).toFixed(2)}` },
  { key: "due_date", label: "Due Date" },
  { key: "bazaar_bill_ref", label: "Bill Ref" },
  { key: "actions", label: "" },
];

export default function KathaBook() {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const data = await base44.entities.KathaBookEntry.list("-created_date", 200);
    setEntries(data);
  };
  useEffect(() => { load(); }, []);

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const data = {
      ...form,
      net_weight: toNum(form.net_weight),
      price_per_unit: toNum(form.price_per_unit),
      amount: toNum(form.amount),
    };
    if (editId) {
      await base44.entities.KathaBookEntry.update(editId, data);
    } else {
      await base44.entities.KathaBookEntry.create(data);
    }
    setLoading(false);
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(false);
    load();
  };

  const handleEdit = (row) => {
    setForm({
      date: row.date ?? "",
      trader_name: row.trader_name ?? "",
      type: row.type ?? "",
      crop_type: row.crop_type ?? "",
      net_weight: row.net_weight ?? "",
      price_per_unit: row.price_per_unit ?? "",
      amount: row.amount ?? "",
      bazaar_bill_ref: row.bazaar_bill_ref ?? "",
      due_date: row.due_date ?? "",
      remarks: row.remarks ?? "",
    });
    setEditId(row.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry? This action cannot be undone.")) return;
    await base44.entities.KathaBookEntry.delete(id);
    load();
  };

  const filtered = entries.filter(e =>
    !search || [e.trader_name, e.crop_type, e.bazaar_bill_ref].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const totalDebit = filtered.filter(e => e.type === "debit").reduce((s, e) => s + (e.amount || 0), 0);
  const totalCredit = filtered.filter(e => e.type === "credit").reduce((s, e) => s + (e.amount || 0), 0);
  const outstanding = totalDebit - totalCredit;

  const tableColumns = columns.map(col => {
    if (col.key === "actions") {
      return { ...col, render: (row) => (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }}>
          <Trash2 className="w-4 h-4" />
        </Button>
      )};
    }
    return col;
  });

  return (
    <div className="pb-20">
      <PageHeader title="Katha Book" subtitle="Trader account ledger — individual trader statements for accounting & IT purposes">
        <Button onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(v => !v); }}>
          <Plus className="w-4 h-4 mr-2" /> New Entry
        </Button>
      </PageHeader>

      {/* Inline Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">{editId ? "Edit Entry" : "New Entry"}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Trader Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Trader name" value={form.trader_name} onChange={(e) => setField("trader_name", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Entry Type <span className="text-destructive">*</span></Label>
              <Select value={form.type} onValueChange={(v) => setField("type", v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Debit (Crop Purchase)</SelectItem>
                  <SelectItem value="credit">Credit (Payment Received)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Crop Type</Label>
              <Select value={form.crop_type} onValueChange={(v) => setField("crop_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
                <SelectContent>
                  {CROP_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Net Weight (Q)</Label>
              <Input type="number" step="any" placeholder="Quintals" value={form.net_weight} onChange={(e) => setField("net_weight", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Price per Unit (₹)</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.price_per_unit} onChange={(e) => setField("price_per_unit", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount (₹) <span className="text-destructive">*</span></Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setField("amount", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bazaar Bill Ref</Label>
              <Input placeholder="Reference" value={form.bazaar_bill_ref} onChange={(e) => setField("bazaar_bill_ref", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Due Date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setField("due_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Remarks</Label>
              <Input placeholder="Remarks" value={form.remarks} onChange={(e) => setField("remarks", e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              <Save className="w-4 h-4 mr-2" />{loading ? "Saving..." : "Save Entry"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {!showForm && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard title="Total Debit" value={`₹${totalDebit.toFixed(2)}`} icon={ArrowUpRight} />
            <StatCard title="Total Credit" value={`₹${totalCredit.toFixed(2)}`} icon={ArrowDownLeft} />
            <StatCard title="Outstanding" value={`₹${outstanding.toFixed(2)}`} icon={BookOpen} />
          </div>

          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          <DataTable columns={tableColumns} data={filtered} onRowClick={handleEdit} />
        </>
      )}
    </div>
  );
}