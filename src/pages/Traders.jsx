import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import FormModal from "../components/FormModal";

const fields = [
  { key: "name", label: "Trader Name", required: true },
  { key: "bazaar", label: "Bazaar (Market Location)", required: true },
  { key: "phone", label: "Phone Number" },
  { key: "address", label: "Address" },
];

const columns = [
  { key: "name", label: "Name", cellClassName: "font-semibold" },
  { key: "bazaar", label: "Bazaar" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "actions", label: "" },
];

export default function Traders() {
  const [traders, setTraders] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const data = await base44.entities.Trader.list("-created_date", 200);
    setTraders(data);
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (data) => {
    setLoading(true);
    if (editItem) {
      await base44.entities.Trader.update(editItem.id, data);
    } else {
      await base44.entities.Trader.create(data);
    }
    setLoading(false);
    setModalOpen(false);
    setEditItem(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this trader record? This action cannot be undone.")) return;
    await base44.entities.Trader.delete(id);
    load();
  };

  const filtered = traders.filter(t =>
    !search || [t.name, t.bazaar, t.phone].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

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
      <PageHeader title="Traders" subtitle="Manage trader records and market information">
        <Button onClick={() => { setEditItem(null); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Trader
        </Button>
      </PageHeader>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search traders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <DataTable columns={tableColumns} data={filtered} onRowClick={(row) => { setEditItem(row); setModalOpen(true); }} />

      <FormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editItem ? "Edit Trader" : "Add Trader"}
        fields={fields}
        onSubmit={handleSubmit}
        initialData={editItem}
        loading={loading}
      />
    </div>
  );
}