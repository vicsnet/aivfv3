import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'PATIENT') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const documents = await db.document.findMany({
      where: {
        patientId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const documentsWithDataUrl = documents.map(doc => ({
      ...doc,
      fileUrl: doc.content,
    }));

    return NextResponse.json(documentsWithDataUrl);
  } catch (error) {
    console.error('[API/PATIENT/DOCUMENTS] Error fetching documents:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 