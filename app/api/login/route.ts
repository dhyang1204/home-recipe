import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "@/lib/session";

export const runtime = "nodejs";

function passwordsMatch(input: string, expected: string) {
  const inputBuf = Buffer.from(input);
  const expectedBuf = Buffer.from(expected);
  if (inputBuf.length !== expectedBuf.length) {
    // Compare against a same-length dummy buffer so failure timing doesn't
    // reveal the correct password's length.
    timingSafeEqual(inputBuf, inputBuf);
    return false;
  }
  return timingSafeEqual(inputBuf, expectedBuf);
}

export async function POST(request: Request) {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) {
    return NextResponse.json(
      { error: "서버에 APP_PASSWORD가 설정되어 있지 않습니다." },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!passwordsMatch(password, appPassword)) {
    return NextResponse.json(
      { error: "비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
  return response;
}
