import { NextResponse } from "next/server";
import db from "@/lib/db";
import { hash } from "bcrypt";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { message: "Token and password are required" },
        { status: 400 }
      );
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const passwordResetToken = await db.passwordResetToken.findUnique({
      where: { token: hashedToken },
    });

    if (!passwordResetToken) {
      return NextResponse.json(
        { message: "Invalid token" },
        { status: 400 }
      );
    }

    if (new Date() > new Date(passwordResetToken.expiresAt)) {
      return NextResponse.json(
        { message: "Token has expired" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 10);

    await db.user.update({
      where: { id: passwordResetToken.userId },
      data: { password: hashedPassword },
    });

    // Delete the token so it can't be used again
    await db.passwordResetToken.delete({
      where: { id: passwordResetToken.id },
    });

    return NextResponse.json(
      { message: "Password updated successfully. You can now log in." },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Something went wrong!" },
      { status: 500 }
    );
  }
} 