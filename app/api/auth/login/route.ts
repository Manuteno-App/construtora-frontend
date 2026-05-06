import { NextRequest, NextResponse } from "next/server";

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function POST(request: NextRequest) {
  const body = await request.text();

  const backendRes = await fetch(`${BACKEND}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const data = await backendRes.json();
  const res = NextResponse.json(data, { status: backendRes.status });

  if (backendRes.ok) {
    const setCookie = backendRes.headers.get("set-cookie");
    if (setCookie) {
      const match = setCookie.match(/refresh_token=([^;]+)/);
      if (match) {
        res.cookies.set("refresh_token", match[1], {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });
      }
    }
  }

  return res;
}
