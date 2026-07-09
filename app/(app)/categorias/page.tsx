"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Category = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  color: string;
  parentId: string | null;
  children: Category[];
};

const COLORS = ["#6366f1","#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#84cc16"];

const DEFAULT_INCOME = ["Salário","Freelance","Investimentos","Outros"];
const DEFAULT_EXPENSE = ["Moradia","Alimentação","Transporte","Saúde","Educação","Lazer","Vestuário","Outros"];

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "EXPENSE", color: "#6366f1", parentId: "" });

  async function fetchCategories() {
    const res = await fetch("/api/categorias");
    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
  }

  useEffect(() => { fetchCategories(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, parentId: form.parentId || null }),
    });
    if (res.ok) {
      setOpen(false);
      setForm({ name: "", type: "EXPENSE", color: "#6366f1", parentId: "" });
      fetchCategories();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta categoria?")) return;
    await fetch(`/api/categorias/${id}`, { method: "DELETE" });
    fetchCategories();
  }

  async function createDefaults() {
    const creates = [
      ...DEFAULT_INCOME.map((name) => fetch("/api/categorias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, type: "INCOME", color: "#10b981" }) })),
      ...DEFAULT_EXPENSE.map((name) => fetch("/api/categorias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, type: "EXPENSE", color: "#ef4444" }) })),
    ];
    await Promise.all(creates);
    fetchCategories();
  }

  const parentCategories = categories.filter((c) => !c.parentId && c.type === form.type);
  const incomeCategories = categories.filter((c) => c.type === "INCOME" && !c.parentId);
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE" && !c.parentId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
          <p className="text-gray-500 mt-1 text-sm">Organize suas transações por categoria</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.length === 0 && (
            <Button variant="outline" onClick={createDefaults} className="text-sm">
              Criar categorias padrão
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Nova Categoria</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, parentId: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCOME">Entrada</SelectItem>
                      <SelectItem value="EXPENSE">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input placeholder="Ex: Alimentação, Moradia..." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria pai (opcional)</Label>
                  <Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Nenhuma (categoria principal)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma (categoria principal)</SelectItem>
                      {parentCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Cor</Label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c) => (
                      <button key={c} type="button" className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? "border-gray-800 scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} onClick={() => setForm({ ...form, color: c })} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit">Criar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block shrink-0" />
              Categorias de Entrada ({incomeCategories.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incomeCategories.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhuma categoria de entrada.</p>
            ) : (
              <div className="space-y-1">
                {incomeCategories.map((cat) => (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm font-medium text-gray-800 truncate">{cat.name}</span>
                        <Badge variant="income" className="text-xs shrink-0">Entrada</Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 ml-1">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDelete(cat.id)}>
                            <Trash2 className="h-4 w-4" />Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {cat.children?.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between py-1.5 pl-5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                          <span className="text-sm text-gray-600 truncate">{sub.name}</span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 ml-1">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDelete(sub.id)}>
                              <Trash2 className="h-4 w-4" />Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block shrink-0" />
              Categorias de Saída ({expenseCategories.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseCategories.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhuma categoria de saída.</p>
            ) : (
              <div className="space-y-1">
                {expenseCategories.map((cat) => (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm font-medium text-gray-800 truncate">{cat.name}</span>
                        <Badge variant="expense" className="text-xs shrink-0">Saída</Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 ml-1">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDelete(cat.id)}>
                            <Trash2 className="h-4 w-4" />Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {cat.children?.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between py-1.5 pl-5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                          <span className="text-sm text-gray-600 truncate">{sub.name}</span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 ml-1">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDelete(sub.id)}>
                              <Trash2 className="h-4 w-4" />Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
