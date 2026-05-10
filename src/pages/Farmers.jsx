import { API_BASE_URL } from "../api/config";
import { useState, useEffect } from "react";
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
    try {
      const res = await fetch(`${API_BASE_URL}/farmers`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Sort newest first (assuming MongoDB _id or a date field, sorting backwards)
        setFarmers(data.reverse()); 
      }
    } catch (err) {
      console.error("Failed to load farmers", err);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      if (editItem) {
        // 🔥 UPDATE
        const updateId = editItem._id || editItem.id;
        await fetch(`${API_BASE_URL}/farmers/${updateId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        // 🔥 CREATE
        await fetch(`${API_BASE_URL}/farmers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }
    } catch (err) {
      console.error("Save failed", err);
      alert("Failed to save farmer.");
    }
    
    setLoading(false);
    setModalOpen(false);
    setEditItem(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this farmer record? This action cannot be undone.")) return;
    try {
      // 🔥 DELETE
      await fetch(`${API_BASE_URL}/farmers/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const filtered = farmers.filter(f =>
    !search || [f.name, f.village, f.phone].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const tableColumns = columns.map(col => {
    if (col.key === "actions") {
      return { 
        ...col, 
        render: (row) => (
          // Safely target MongoDB _id
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(row._id || row.id); }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )
      };
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

      <DataTable 
        columns={tableColumns} 
        data={filtered} 
        onRowClick={(row) => { setEditItem(row); setModalOpen(true); }} 
      />

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