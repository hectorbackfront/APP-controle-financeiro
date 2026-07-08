import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { name, type, balance, color } = await req.json();

  if (!name || !type) {
    return NextResponse.json({ error: "Nome e tipo são obrigatórios." }, { status: 400 });
  }

  const account = await prisma.account.create({
    data: {
      name,
      type,
      balance: balance ?? 0,
      color: color ?? "#6366f1",
      userId: session.user.id,
    },
  });

  return NextResponse.json(account, { status: 201 });
}
