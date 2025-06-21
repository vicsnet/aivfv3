import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { hash } from "bcrypt";
import crypto from "crypto";

export async function GET(req: Request) {
    try {
      const session = await getServerSession(authOptions);
  
      if (session?.user?.role !== "CLINIC_ADMIN") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
  
      if (!session.user.clinicId) {
          return NextResponse.json({ message: "User is not associated with a clinic" }, { status: 400 });
      }

      const patients = await db.user.findMany({
        where: {
            clinicId: session.user.clinicId,
            role: "PATIENT"
        },
        orderBy: {
            name: 'asc'
        },
        select: {
            id: true,
            name: true,
            email: true,
            dateOfBirth: true
        }
      });

      return NextResponse.json(patients, { status: 200 });

    } catch (error) {
        console.error("Patient fetch error:", error);
        return NextResponse.json(
          { message: "Something went wrong" },
          { status: 500 }
        );
    }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user?.role !== "CLINIC_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.clinicId) {
        return NextResponse.json({ message: "User is not associated with a clinic" }, { status: 400 });
    }

    const body = await req.json();
    const { fullName, email } = body;

    if (!fullName || !email) {
      return NextResponse.json(
        { message: "Name and email are required" },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }
    
    // Don't set a password, user will set it via token link
    const newUser = await db.user.create({
      data: {
        name: fullName,
        email: email,
        role: "PATIENT",
        clinicId: session.user.clinicId,
      },
    });

    // Generate a password reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const passwordResetToken = await db.passwordResetToken.create({
      data: {
        userId: newUser.id,
        token: crypto.createHash("sha256").update(resetToken).digest("hex"),
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      },
    });

    // In a real app, you would email this link to the user.
    // For this app, we will return the token to the clinic to share.
    if (!process.env.NEXTAUTH_URL) {
      return NextResponse.json(
        { 
          message: "Patient created, but NEXTAUTH_URL environment variable is not set. Cannot generate setup link.",
          patient: newUser
        },
        { status: 201 }
      );
    }

    const setupLink = `${process.env.NEXTAUTH_URL}/auth/set-password?token=${resetToken}`;

    return NextResponse.json(
      {
        message: "Patient created successfully. Please share this setup link with them.",
        setupLink: setupLink,
        patient: newUser
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Patient creation error:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
} 