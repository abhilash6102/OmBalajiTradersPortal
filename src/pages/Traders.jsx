import { API_BASE_URL } from "@/api/config";
import { useState, useEffect } from "react";
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
    try {
      const res = await fetch(`${API_BASE_URL}/traders`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Sort newest first
        setTraders(data.reverse()); 
      }
    } catch (err) {
      console.error("Failed to load traders", err);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      if (editItem) {
        // 🔥 UPDATE
        const updateId = editItem._id || editItem.id;
        await fetch(`${API_BASE_URL}/traders/${updateId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        // 🔥 CREATE
        await fetch(`${API_BASE_URL}/traders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }
    } catch (err) {
      console.error("Save failed", err);
      alert("Failed to save trader.");
    }
    
    setLoading(false);
    setModalOpen(false);
    setEditItem(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this trader record? This action cannot be undone.")) return;
    try {
      // 🔥 DELETE
      await fetch(`${API_BASE_URL}/traders/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const filtered = traders.filter(t =>
    !search || [t.name, t.bazaar, t.phone].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

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

      <DataTable 
        columns={tableColumns} 
        data={filtered} 
        onRowClick={(row) => { setEditItem(row); setModalOpen(true); }} 
      />

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