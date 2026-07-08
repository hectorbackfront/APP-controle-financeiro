import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
    }

    const hashed = await hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    });

    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as Record<string, unknown>)?.code;
    console.error("CADASTRO_ERRO_COMPLETO:", msg, "CODE:", code);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
