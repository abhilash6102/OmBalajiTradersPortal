import { API_BASE_URL } from "@/api/config";
import { useState, useEffect } from "react";
import { Plus, Trash2, Search, BarChart3, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import FormModal from "../components/FormModal";
import StatCard from "../components/StatCard";

const fields = [
  { key: "date", label: "Date", type: "date", required: true },
  { key: "type", label: "Entry Type", type: "select", required: true, options: [
    { value: "jama", label: "Jama (Credit - Trader)" },
    { value: "karchu", label: "Karchu (Debit - Farmer Payment)" },
  ]},
  { key: "party_name", label: "Party Name", required: true },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount (₹)", type: "number", required: true },
  { key: "commission", label: "Commission (₹)", type: "number" },
];

// 🔥 BULLETPROOF 2-DECIMAL HELPER (Consistent with your other modules)
const formatMoney = (num) => {
  const parsed = Math.round(Number(num || 0));
  if (isNaN(parsed)) return "0.00";
  return parsed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const columns = [
  { key: "date", label: "Date" },
  { key: "type", label: "Type", render: (r) => (
    <Badge variant="outline" className={r.type === "jama" ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}>
      {r.type === "jama" ? "Jama (Cr)" : "Karchu (Dr)"}
    </Badge>
  )},
  { key: "party_name", label: "Party" },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount", cellClassName: "font-mono font-semibold", render: (r) => `₹${formatMoney(r.amount)}` },
  { key: "commission", label: "Commission", render: (r) => r.commission ? `₹${formatMoney(r.commission)}` : "–" },
  { key: "actions", label: "" },
];

export default function JamaKarchu() {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/jamakarchu`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Sort newest first (descending)
        setEntries(data.reverse()); 
      }
    } catch (err) {
      console.error("Failed to load Jama-Karchu entries", err);
    }
  };
  
  useEffect(() => { load(); }, []);

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      if (editItem) {
        // 🔥 UPDATE
        const updateId = editItem._id || editItem.id;
        await fetch(`${API_BASE_URL}/jamakarchu/${updateId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        // 🔥 CREATE
        await fetch(`${API_BASE_URL}/jamakarchu`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }
    } catch (err) {
      console.error("Save failed", err);
      alert("Failed to save entry.");
    }
    
    setLoading(false);
    setModalOpen(false);
    setEditItem(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry? This action cannot be undone.")) return;
    try {
      // 🔥 DELETE
      await fetch(`${API_BASE_URL}/jamakarchu/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const filtered = entries.filter(e =>
    !search || [e.party_name, e.description].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const totalJama = filtered.filter(e => e.type === "jama").reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalKarchu = filtered.filter(e => e.type === "karchu").reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalCommission = filtered.reduce((s, e) => s + (Number(e.commission) || 0), 0);

  const tableColumns = columns.map(col => {
    if (col.key === "actions") {
      return { 
        ...col, 
        render: (row) => (
          // 🔥 Safely target MongoDB _id
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(row._id || row.id); }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )
      };
    }
    return col;
  });

  return (
    <div className="pb-20">
      <PageHeader title="Jama–Karchu" subtitle="Final financial statement — summarized records for taxation and reporting">
        <Button onClick={() => { setEditItem(null); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Entry
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Jama (Credit)" value={`₹${formatMoney(totalJama)}`} icon={ArrowDownLeft} className="border-green-200 bg-green-50/30 text-green-800" />
        <StatCard title="Karchu (Debit)" value={`₹${formatMoney(totalKarchu)}`} icon={ArrowUpRight} className="border-red-200 bg-red-50/30 text-red-800" />
        <StatCard title="Total Commission" value={`₹${formatMoney(totalCommission)}`} icon={BarChart3} />
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search party or description..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <DataTable columns={tableColumns} data={filtered} onRowClick={(row) => { setEditItem(row); setModalOpen(true); }} />
      </div>

      <FormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editItem ? "Edit Entry" : "New Entry"}
        fields={fields}
        onSubmit={handleSubmit}
        initialData={editItem}
        loading={loading}
      />
    </div>
  );
}