import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!transaction) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.transaction.delete({ where: { id } });

    const amount = Number(transaction.amount);
    if (transaction.type === "INCOME") {
      await tx.account.update({
        where: { id: transaction.accountId },
        data: { balance: { decrement: amount } },
      });
    } else if (transaction.type === "EXPENSE") {
      await tx.account.update({
        where: { id: transaction.accountId },
        data: { balance: { increment: amount } },
      });
    } else if (transaction.type === "TRANSFER") {
      if (transaction.fromAccountId) {
        await tx.account.update({
          where: { id: transaction.fromAccountId },
          data: { balance: { increment: amount } },
        });
      }
      if (transaction.toAccountId) {
        await tx.account.update({
          where: { id: transaction.toAccountId },
          data: { balance: { decrement: amount } },
        });
      }
    }
  });

  return NextResponse.json({ success: true });
}
