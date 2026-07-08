"use client";

import { useState, useEffect, useCallback } from "react";
import { FileDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";

type Transaction = {
  id: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  description: string;
  date: string;
  category?: { name: string } | null;
  account: { name: string };
};

const MONTH_NAMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export default function RelatoriosPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/transacoes?month=${month}&year=${year}`);
    const data = await res.json();
    setTransactions(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const income = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
  const expense = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;

  const byCategory = transactions
    .filter((t) => t.type === "EXPENSE" && t.category)
    .reduce<Record<string, number>>((acc, t) => {
      const key = t.category!.name;
      acc[key] = (acc[key] || 0) + Number(t.amount);
      return acc;
    }, {});

  async function exportPDF() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const monthName = MONTH_NAMES[Number(month) - 1];
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    const addLine = (text: string, size = 10, bold = false, color = "#111111") => {
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(color);
      doc.text(text, 14, y);
      y += size * 0.5 + 2;
    };

    const addDivider = (color = "#e5e7eb") => {
      doc.setDrawColor(color);
      doc.line(14, y, pageWidth - 14, y);
      y += 5;
    };

    const checkPage = () => {
      if (y > 270) { doc.addPage(); y = 20; }
    };

    // Cabeçalho
    doc.setFillColor("#1e40af");
    doc.rect(0, 0, pageWidth, 14, "F");
    doc.setTextColor("#ffffff");
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO FINANCEIRO", 14, 9);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${monthName.toUpperCase()} ${year}`, pageWidth - 14, 9, { align: "right" });
    y = 25;

    // Resumo
    addLine("RESUMO DO MÊS", 12, true);
    y += 2;
    addLine(`Total de Entradas:   ${formatCurrency(income)}`, 10, false, "#16a34a");
    addLine(`Total de Saídas:     ${formatCurrency(expense)}`, 10, false, "#dc2626");
    addLine(`Saldo do Período:    ${formatCurrency(balance)}`, 10, true, balance >= 0 ? "#1d4ed8" : "#dc2626");
    y += 3;
    addDivider();

    // Gastos por categoria
    if (Object.keys(byCategory).length > 0) {
      addLine("GASTOS POR CATEGORIA", 12, true);
      y += 2;
      Object.entries(byCategory).sort(([, a], [, b]) => b - a).forEach(([cat, val]) => {
        checkPage();
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor("#374151");
        doc.text(cat, 14, y);
        doc.text(formatCurrency(val), pageWidth - 14, y, { align: "right" });
        y += 6;
      });
      y += 3;
      addDivider();
    }

    // Transações
    addLine(`TRANSAÇÕES (${transactions.length} lançamentos)`, 12, true);
    y += 2;

    transactions.forEach((t) => {
      checkPage();
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor("#374151");
      doc.text(formatDate(t.date), 14, y);
      doc.text(t.description, 38, y);
      const color = t.type === "INCOME" ? "#16a34a" : t.type === "EXPENSE" ? "#dc2626" : "#2563eb";
      const prefix = t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "-" : "";
      doc.setTextColor(color);
      doc.text(`${prefix}${formatCurrency(Number(t.amount))}`, pageWidth - 14, y, { align: "right" });
      y += 6;
    });

    // Rodapé
    y += 5;
    addDivider("#d1d5db");
    doc.setFontSize(8);
    doc.setTextColor("#9ca3af");
    doc.setFont("helvetica", "normal");
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, y);

    doc.save(`relatorio-${monthName.toLowerCase()}-${year}.pdf`);
  }

  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - 2 + i));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-500 mt-1 text-sm">Analise e exporte os dados financeiros por período</p>
        </div>
        <Button onClick={exportPDF} disabled={transactions.length === 0} className="sm:shrink-0">
          <FileDown className="h-4 w-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-gray-400 shrink-0" />
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-sm text-green-700 font-medium">Total de Entradas</p>
            <p className="text-xl sm:text-2xl font-bold text-green-700 mt-1">{formatCurrency(income)}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-700 font-medium">Total de Saídas</p>
            <p className="text-xl sm:text-2xl font-bold text-red-700 mt-1">{formatCurrency(expense)}</p>
          </CardContent>
        </Card>
        <Card className={balance >= 0 ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"}>
          <CardContent className="pt-6">
            <p className={`text-sm font-medium ${balance >= 0 ? "text-blue-700" : "text-red-700"}`}>Saldo do Período</p>
            <p className={`text-xl sm:text-2xl font-bold mt-1 ${balance >= 0 ? "text-blue-700" : "text-red-700"}`}>{formatCurrency(balance)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(byCategory).length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhum gasto com categoria neste período.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(byCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, val]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 mr-4">
                        <span className="text-sm text-gray-700 w-32 shrink-0">{cat}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-red-400 h-2 rounded-full"
                            style={{ width: `${Math.min(100, (val / expense) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-28 text-right">{formatCurrency(val)}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Todas as Transações — {MONTH_NAMES[Number(month) - 1]} {year}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-400 text-sm text-center py-4">Carregando...</p>
            ) : transactions.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Nenhuma transação neste período.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {transactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm text-gray-800">{t.description}</p>
                      <p className="text-xs text-gray-400">{formatDate(t.date)}{t.category ? ` · ${t.category.name}` : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${t.type === "INCOME" ? "text-green-600" : t.type === "EXPENSE" ? "text-red-600" : "text-blue-600"}`}>
                        {t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "-" : ""}{formatCurrency(Number(t.amount))}
                      </p>
                      <Badge variant={t.type === "INCOME" ? "income" : t.type === "EXPENSE" ? "expense" : "transfer"} className="text-xs">
                        {t.type === "INCOME" ? "Entrada" : t.type === "EXPENSE" ? "Saída" : "Transf."}
                      </Badge>
                    </div>
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
