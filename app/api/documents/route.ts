import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user?.role !== "CLINIC_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.clinicId) {
      return NextResponse.json(
        { message: "User is not associated with a clinic" },
        { status: 400 }
      );
    }

    const documents = await db.document.findMany({
      where: {
        clinicId: session.user.clinicId,
      },
      include: {
        uploadedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(documents, { status: 200 });
  } catch (error) {
    console.error("Document fetch error:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
} 