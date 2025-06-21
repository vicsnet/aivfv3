import { NextResponse } from "next/server";
import db from "@/lib/db";
import { hash } from "bcrypt";
import { Role } from "@/lib/generated/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, email, password, role, clinicName } = body;

    // 1. Check for missing required fields
    if (!fullName || !email || !password || !role) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Role specific validation
    if (role === "CLINIC_ADMIN" && !clinicName) {
      return NextResponse.json(
        { message: "Clinic name is required for clinic accounts" },
        { status: 400 }
      );
    }

    // 2. Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password, 10);

    let newUser;

    if (role === Role.CLINIC_ADMIN) {
      // 3a. Create a new clinic and a clinic admin user in a transaction
      newUser = await db.user.create({
        data: {
          name: fullName,
          email,
          password: hashedPassword,
          role: Role.CLINIC_ADMIN,
          clinic: {
            create: {
              name: clinicName,
            },
          },
        },
        include: {
          clinic: true, // Include clinic information in the response
        },
      });
    } else {
      // 3b. Create a new patient user
      newUser = await db.user.create({
        data: {
          name: fullName,
          email,
          password: hashedPassword,
          role: Role.PATIENT,
        },
      });
    }

    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Something went wrong!" },
      { status: 500 }
    );
  }
} 