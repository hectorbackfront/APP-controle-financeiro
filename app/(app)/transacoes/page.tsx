"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Filter, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";

type Transaction = {
  id: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  description: string;
  notes?: string;
  date: string;
  category?: { id: string; name: string; color: string } | null;
  account: { id: string; name: string; color: string };
};

type Account = { id: string; name: string; type: string; color: string };
type Category = { id: string; name: string; type: string; parentId?: string | null };

const TYPE_LABELS: Record<string, string> = {
  INCOME: "Entrada",
  EXPENSE: "Saída",
  TRANSFER: "Transferência",
};

const MONTH_NAMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export default function TransacoesPage() {
  const now = new Date();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [filterType, setFilterType] = useState("ALL");

  const [form, setForm] = useState({
    type: "EXPENSE",
    amount: "",
    description: "",
    notes: "",
    date: new Date().toISOString().slice(0, 10),
    accountId: "",
    categoryId: "",
    toAccountId: "",
  });

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ month: filterMonth, year: filterYear });
    if (filterType !== "ALL") params.set("type", filterType);
    const res = await fetch(`/api/transacoes?${params}`);
    const data = await res.json();
    setTransactions(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filterMonth, filterYear, filterType]);

  useEffect(() => {
    Promise.all([
      fetch("/api/contas").then((r) => r.json()),
      fetch("/api/categorias").then((r) => r.json()),
    ]).then(([accs, cats]) => {
      setAccounts(Array.isArray(accs) ? accs : []);
      setCategories(Array.isArray(cats) ? cats : []);
    });
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/transacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setOpen(false);
      setForm({ type: "EXPENSE", amount: "", description: "", notes: "", date: new Date().toISOString().slice(0, 10), accountId: "", categoryId: "", toAccountId: "" });
      fetchTransactions();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta transação?")) return;
    await fetch(`/api/transacoes/${id}`, { method: "DELETE" });
    fetchTransactions();
  }

  const filteredCategories = categories.filter(
    (c) => c.type === form.type || form.type === "TRANSFER"
  );

  const totalIncome = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);

  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - 2 + i));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Transações</h1>
          <p className="text-gray-500 mt-1 text-sm">{MONTH_NAMES[Number(filterMonth) - 1]} {filterYear}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Nova Transação</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Transação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, categoryId: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOME">Entrada</SelectItem>
                    <SelectItem value="EXPENSE">Saída</SelectItem>
                    <SelectItem value="TRANSFER">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input placeholder="Ex: Salário, Aluguel..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>

              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" min="0.01" placeholder="0,00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>

              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>

              <div className="space-y-1.5">
                <Label>{form.type === "TRANSFER" ? "Conta de Origem" : "Conta"}</Label>
                <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar conta..." /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {form.type === "TRANSFER" && (
                <div className="space-y-1.5">
                  <Label>Conta de Destino</Label>
                  <Select value={form.toAccountId} onValueChange={(v) => setForm({ ...form, toAccountId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar conta..." /></SelectTrigger>
                    <SelectContent>
                      {accounts.filter((a) => a.id !== form.accountId).map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.type !== "TRANSFER" && (
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar categoria..." /></SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.parentId ? "  " : ""}{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Observações (opcional)</Label>
                <Textarea placeholder="Detalhes adicionais..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap overflow-x-auto pb-1">
        <Filter className="h-4 w-4 text-gray-400 shrink-0" />
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-32 sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-20 sm:w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32 sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os tipos</SelectItem>
            <SelectItem value="INCOME">Entradas</SelectItem>
            <SelectItem value="EXPENSE">Saídas</SelectItem>
            <SelectItem value="TRANSFER">Transferências</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Entradas</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Saídas</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Saldo</p>
            <p className={`text-xl font-bold ${totalIncome - totalExpense >= 0 ? "text-gray-900" : "text-red-600"}`}>
              {formatCurrency(totalIncome - totalExpense)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{transactions.length} transação(ões)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-400 text-sm text-center py-8">Carregando...</p>
          ) : transactions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Nenhuma transação neste período.</p>
          ) : (
            <div className="space-y-1">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-1 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: t.type === "INCOME" ? "#16a34a" : t.type === "EXPENSE" ? "#dc2626" : "#2563eb" }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{t.description}</p>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-400">{formatDate(t.date)}</span>
                        {t.category && <span className="text-xs text-gray-400">· {t.category.name}</span>}
                        <span className="text-xs text-gray-400 hidden sm:inline">· {t.account.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${t.type === "INCOME" ? "text-green-600" : t.type === "EXPENSE" ? "text-red-600" : "text-blue-600"}`}>
                        {t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "-" : ""}
                        {formatCurrency(Number(t.amount))}
                      </p>
                      <Badge
                        variant={t.type === "INCOME" ? "income" : t.type === "EXPENSE" ? "expense" : "transfer"}
                        className="text-xs hidden sm:inline-flex"
                      >
                        {TYPE_LABELS[t.type]}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
