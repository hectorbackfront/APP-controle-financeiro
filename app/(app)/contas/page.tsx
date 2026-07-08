"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Wallet, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

type Account = {
  id: string;
  name: string;
  type: string;
  balance: number;
  color: string;
};

const ACCOUNT_TYPES: Record<string, string> = {
  CHECKING: "Conta Corrente",
  SAVINGS: "Poupança",
  CASH: "Dinheiro em Espécie",
  WALLET: "Carteira Digital",
  INVESTMENT: "Investimento",
  OTHER: "Outro",
};

const COLORS = ["#6366f1","#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#84cc16"];

export default function ContasPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "CHECKING", balance: "", color: "#6366f1" });

  async function fetchAccounts() {
    const res = await fetch("/api/contas");
    const data = await res.json();
    setAccounts(Array.isArray(data) ? data : []);
  }

  useEffect(() => { fetchAccounts(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/contas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, balance: parseFloat(form.balance) || 0 }),
    });
    if (res.ok) {
      setOpen(false);
      setForm({ name: "", type: "CHECKING", balance: "", color: "#6366f1" });
      fetchAccounts();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta conta? As transações vinculadas também serão removidas.")) return;
    await fetch(`/api/contas/${id}`, { method: "DELETE" });
    fetchAccounts();
  }

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Contas</h1>
          <p className="text-gray-500 mt-1 text-sm">Gerencie suas contas e carteiras</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Nova Conta</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm mx-4">
            <DialogHeader>
              <DialogTitle>Nova Conta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input placeholder="Ex: Nubank, Carteira..." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Saldo inicial (R$)</Label>
                <Input type="number" step="0.01" placeholder="0,00" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
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
                <Button type="submit">Criar conta</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Wallet className="h-8 w-8 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-gray-500">Saldo total em todas as contas</p>
              <p className={`text-2xl sm:text-3xl font-bold ${totalBalance >= 0 ? "text-gray-900" : "text-red-600"}`}>
                {formatCurrency(totalBalance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            Nenhuma conta cadastrada. Clique em &ldquo;Nova Conta&rdquo; para começar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: account.color }} />
                    <CardTitle className="text-base truncate">{account.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => handleDelete(account.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-xs text-gray-400">{ACCOUNT_TYPES[account.type]}</p>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${Number(account.balance) >= 0 ? "text-gray-900" : "text-red-600"}`}>
                  {formatCurrency(Number(account.balance))}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
