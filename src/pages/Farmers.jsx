import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import FormModal from "../components/FormModal";

const fields = [
  { key: "name", label: "Farmer Name", required: true },
  { key: "village", label: "Village", required: true },
  { key: "phone", label: "Phone Number" },
  { key: "bank_account", label: "Bank Account Number" },
  { key: "ifsc_code", label: "IFSC Code" },
];

const columns = [
  { key: "name", label: "Name", cellClassName: "font-semibold" },
  { key: "village", label: "Village" },
  { key: "phone", label: "Phone" },
  { key: "bank_account", label: "Bank Account" },
  { key: "ifsc_code", label: "IFSC" },
  { key: "actions", label: "" },
];

export default function Farmers() {
  const [farmers, setFarmers] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const data = await base44.entities.Farmer.list("-created_date", 200);
    setFarmers(data);
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (data) => {
    setLoading(true);
    if (editItem) {
      await base44.entities.Farmer.update(editItem.id, data);
    } else {
      await base44.entities.Farmer.create(data);
    }
    setLoading(false);
    setModalOpen(false);
    setEditItem(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this farmer record? This action cannot be undone.")) return;
    await base44.entities.Farmer.delete(id);
    load();
  };

  const filtered = farmers.filter(f =>
    !search || [f.name, f.village, f.phone].some(v => v?.toLowerCase().includes(search.toLowerCase()))
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
      <PageHeader title="Farmers" subtitle="Manage farmer records and contact details">
        <Button onClick={() => { setEditItem(null); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Farmer
        </Button>
      </PageHeader>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search farmers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <DataTable columns={tableColumns} data={filtered} onRowClick={(row) => { setEditItem(row); setModalOpen(true); }} />

      <FormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editItem ? "Edit Farmer" : "Add Farmer"}
        fields={fields}
        onSubmit={handleSubmit}
        initialData={editItem}
        loading={loading}
      />
    </div>
  );
}