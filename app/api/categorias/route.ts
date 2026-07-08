import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    include: { children: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { name, type, color, icon, parentId } = await req.json();

  if (!name || !type) {
    return NextResponse.json({ error: "Nome e tipo são obrigatórios." }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: {
      name,
      type,
      color: color ?? "#6366f1",
      icon: icon ?? "tag",
      parentId: parentId ?? null,
      userId: session.user.id,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
