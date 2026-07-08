import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

async function getDashboardData(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [accounts, monthTransactions, recentTransactions] = await Promise.all([
    prisma.account.findMany({ where: { userId } }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 8,
      include: { category: true, account: true },
    }),
  ]);

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const monthIncome = monthTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const monthExpense = monthTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return { totalBalance, monthIncome, monthExpense, accounts, recentTransactions };
}

export default async function DashboardPage() {
  const session = await auth();
  const data = await getDashboardData(session!.user!.id!);
  const monthName = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1 capitalize text-sm">{monthName}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center justify-between">
              Saldo Total
              <Wallet className="h-4 w-4 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalBalance)}</p>
            <p className="text-xs text-gray-400 mt-1">{data.accounts.length} conta(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center justify-between">
              Entradas do Mês
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(data.monthIncome)}</p>
            <p className="text-xs text-gray-400 mt-1">mês atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center justify-between">
              Saídas do Mês
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(data.monthExpense)}</p>
            <p className="text-xs text-gray-400 mt-1">mês atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center justify-between">
              Resultado do Mês
              <ArrowLeftRight className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                data.monthIncome - data.monthExpense >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(data.monthIncome - data.monthExpense)}
            </p>
            <p className="text-xs text-gray-400 mt-1">entradas - saídas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Últimas Transações</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>Nenhuma transação ainda.</p>
                <Link href="/transacoes" className="text-blue-600 hover:underline text-sm mt-1 inline-block">
                  Adicionar primeira transação
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: t.type === "INCOME" ? "#16a34a" : t.type === "EXPENSE" ? "#dc2626" : "#2563eb" }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{t.description}</p>
                        <p className="text-xs text-gray-400">{t.category?.name ?? "Transferência"} · {formatDate(t.date)}</p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        t.type === "INCOME" ? "text-green-600" : t.type === "EXPENSE" ? "text-red-600" : "text-blue-600"
                      }`}
                    >
                      {t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "-" : ""}
                      {formatCurrency(Number(t.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contas</CardTitle>
          </CardHeader>
          <CardContent>
            {data.accounts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>Nenhuma conta cadastrada.</p>
                <Link href="/contas" className="text-blue-600 hover:underline text-sm mt-1 inline-block">
                  Adicionar conta
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: account.color }} />
                      <span className="text-sm text-gray-700">{account.name}</span>
                    </div>
                    <span className={`text-sm font-semibold ${Number(account.balance) >= 0 ? "text-gray-900" : "text-red-600"}`}>
                      {formatCurrency(Number(account.balance))}
                    </span>
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
