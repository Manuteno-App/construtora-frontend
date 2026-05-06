import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({}, { status: 204 });
  res.cookies.delete("refresh_token");
  return res;
}
