import { NextRequest, NextResponse } from "next/server";

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: "Refresh token ausente" }, { status: 401 });
  }

  const backendRes = await fetch(`${BACKEND}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `refresh_token=${refreshToken}`,
    },
  });

  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
