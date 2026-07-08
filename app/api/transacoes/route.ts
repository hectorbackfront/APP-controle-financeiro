import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const type = searchParams.get("type");
  const categoryId = searchParams.get("categoryId");
  const accountId = searchParams.get("accountId");

  const where: Record<string, unknown> = { userId: session.user.id };

  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
    where.date = { gte: start, lte: end };
  }

  if (type) where.type = type;
  if (categoryId) where.categoryId = categoryId;
  if (accountId) where.accountId = accountId;

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true, account: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { type, amount, description, notes, date, accountId, categoryId, toAccountId } =
    await req.json();

  if (!type || !amount || !description || !date || !accountId) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes." }, { status: 400 });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: "Valor inválido." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        type,
        amount: parsedAmount,
        description,
        notes: notes ?? null,
        date: new Date(date),
        userId: session.user!.id!,
        accountId,
        categoryId: categoryId ?? null,
        fromAccountId: type === "TRANSFER" ? accountId : null,
        toAccountId: type === "TRANSFER" ? toAccountId : null,
      },
    });

    if (type === "INCOME") {
      await tx.account.update({
        where: { id: accountId },
        data: { balance: { increment: parsedAmount } },
      });
    } else if (type === "EXPENSE") {
      await tx.account.update({
        where: { id: accountId },
        data: { balance: { decrement: parsedAmount } },
      });
    } else if (type === "TRANSFER" && toAccountId) {
      await tx.account.update({
        where: { id: accountId },
        data: { balance: { decrement: parsedAmount } },
      });
      await tx.account.update({
        where: { id: toAccountId },
        data: { balance: { increment: parsedAmount } },
      });
    }

    return transaction;
  });

  return NextResponse.json(result, { status: 201 });
}
