import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

// interface PutParams {
//   completionId: string;
// }

// interface contextf {
//   params: PutParams;
// }

export async function PUT (
  req: Request,
  context: { params: { completionId: string } }
) {
  const { completionId } = context.params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'PATIENT') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { mood } = await req.json();

    if (!mood) {
      return new NextResponse('Missing mood description', { status: 400 });
    }

    // 1. Get AI Analysis
    const aiResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/ai/analyze-mood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood }),
    });

    if (!aiResponse.ok) {
        throw new Error('AI analysis failed');
    }

    const { analysis: moodAnalysis } = await aiResponse.json();

    // 2. Update the injection completion record
    const updatedCompletion = await db.injectionCompletion.update({
      where: {
        id: completionId,
        patientId: session.user.id, // Ensure patient can only update their own records
      },
      data: {
        mood,
        moodAnalysis,
      },
    });

    return NextResponse.json(updatedCompletion);
  } catch (error) {
    console.error(`[API/PATIENT/INJECTION-COMPLETIONS/ID]`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// export { test as PUT };