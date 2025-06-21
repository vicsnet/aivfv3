import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { Buffer } from 'buffer';

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== 'CLINIC_ADMIN' || !session?.user?.clinicId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  
  const clinicId = session.user.clinicId;

  try {
    const { filename, patientId, fileData, fileType } = await req.json();

    if (!filename || !patientId || !fileData || !fileType) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    console.log(`Backend: Creating document '${filename}' for patient ${patientId}.`);

    const fileUrl = `data:${fileType};base64,${fileData}`;

    const newDocument = await db.document.create({
      data: {
        filename: filename,
        content: fileUrl,
        patientId: patientId,
        uploadedById: session.user.id,
        clinicId: clinicId,
      },
    });

    console.log("Backend: Successfully created document record in database.");

    return NextResponse.json(newDocument, { status: 201 });
  } catch (error) {
    console.error('Document upload error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 