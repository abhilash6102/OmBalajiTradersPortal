import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import FormModal from "../components/FormModal";
import StatCard from "../components/StatCard";
import { BarChart3, ArrowDownLeft, ArrowUpRight } from "lucide-react";

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

const columns = [
  { key: "date", label: "Date" },
  { key: "type", label: "Type", render: (r) => (
    <Badge variant="outline" className={r.type === "jama" ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}>
      {r.type === "jama" ? "Jama (Cr)" : "Karchu (Dr)"}
    </Badge>
  )},
  { key: "party_name", label: "Party" },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount", cellClassName: "font-mono font-semibold", render: (r) => `₹${(r.amount || 0).toFixed(2)}` },
  { key: "commission", label: "Commission", render: (r) => r.commission ? `₹${r.commission.toFixed(2)}` : "–" },
  { key: "actions", label: "" },
];

export default function JamaKarchu() {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const data = await base44.entities.JamaKarchuEntry.list("-created_date", 200);
    setEntries(data);
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (data) => {
    setLoading(true);
    if (editItem) {
      await base44.entities.JamaKarchuEntry.update(editItem.id, data);
    } else {
      await base44.entities.JamaKarchuEntry.create(data);
    }
    setLoading(false);
    setModalOpen(false);
    setEditItem(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry? This action cannot be undone.")) return;
    await base44.entities.JamaKarchuEntry.delete(id);
    load();
  };

  const filtered = entries.filter(e =>
    !search || [e.party_name, e.description].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const totalJama = filtered.filter(e => e.type === "jama").reduce((s, e) => s + (e.amount || 0), 0);
  const totalKarchu = filtered.filter(e => e.type === "karchu").reduce((s, e) => s + (e.amount || 0), 0);
  const totalCommission = filtered.reduce((s, e) => s + (e.commission || 0), 0);

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
    <div>
      <PageHeader title="Jama–Karchu" subtitle="Final financial statement — summarized records for taxation and reporting">
        <Button onClick={() => { setEditItem(null); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Entry
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Jama (Credit)" value={`₹${totalJama.toFixed(2)}`} icon={ArrowDownLeft} />
        <StatCard title="Karchu (Debit)" value={`₹${totalKarchu.toFixed(2)}`} icon={ArrowUpRight} />
        <StatCard title="Total Commission" value={`₹${totalCommission.toFixed(2)}`} icon={BarChart3} />
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <DataTable columns={tableColumns} data={filtered} onRowClick={(row) => { setEditItem(row); setModalOpen(true); }} />

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