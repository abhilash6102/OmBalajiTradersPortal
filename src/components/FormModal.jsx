import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";

export default function FormModal({ open, onOpenChange, title, fields, onSubmit, initialData, loading }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (open) {
      setFormData(initialData || {});
    }
  }, [open, initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const updateField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs font-medium">{field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}</Label>
              {field.type === "select" ? (
                <Select value={formData[field.key] || ""} onValueChange={(v) => updateField(field.key, v)}>
                  <SelectTrigger><SelectValue placeholder={`Select ${field.label}`} /></SelectTrigger>
                  <SelectContent>
                    {field.options.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={field.type || "text"}
                  step={field.type === "number" ? "any" : undefined}
                  placeholder={field.placeholder || field.label}
                  value={formData[field.key] || ""}
                  onChange={(e) => updateField(field.key, field.type === "number" ? parseFloat(e.target.value) || "" : e.target.value)}
                  required={field.required}
                />
              )}
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}