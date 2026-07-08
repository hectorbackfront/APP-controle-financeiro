import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const { name, type, color } = await req.json();

  const account = await prisma.account.updateMany({
    where: { id, userId: session.user.id },
    data: { name, type, color },
  });

  if (account.count === 0) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const account = await prisma.account.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!account) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // Deleta transações onde esta é a conta principal (campo obrigatório no schema)
    await tx.transaction.deleteMany({ where: { accountId: id } });
    // Limpa referências opcionais de transferências que usavam esta conta
    await tx.transaction.updateMany({ where: { fromAccountId: id }, data: { fromAccountId: null } });
    await tx.transaction.updateMany({ where: { toAccountId: id }, data: { toAccountId: null } });
    await tx.account.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
