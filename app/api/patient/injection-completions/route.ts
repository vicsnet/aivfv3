import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

// GET handler to fetch completion records
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const completions = await db.injectionCompletion.findMany({
      where: {
        patientId: session.user.id,
      },
    });
    return NextResponse.json(completions);
  } catch (error) {
    console.error('Error fetching injection completions:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST handler to log a new completion
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { protocolId, injectionDate, injectionTime } = body;

    if (!protocolId || !injectionDate || !injectionTime) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const newCompletion = await db.injectionCompletion.create({
      data: {
        patientId: session.user.id,
        protocolId,
        injectionDate: new Date(injectionDate),
        injectionTime,
      },
    });

    return NextResponse.json(newCompletion, { status: 201 });
  } catch (error) {
    console.error('Error logging injection completion:', error);
    // Handle unique constraint violation
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2002') {
        return new NextResponse('This injection has already been marked as complete.', { status: 409 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// PUT handler to update a completion with mood info
export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { completionId, mood, medicationName } = await req.json();

        if (!completionId || !mood) {
            return new NextResponse('Missing completionId or mood', { status: 400 });
        }

        // Call AI analysis
        const aiResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/ai/analyze-mood`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mood, medicationName }),
        });
        
        if (!aiResponse.ok) {
            throw new Error('AI analysis failed');
        }
    
        const { analysis: moodAnalysis } = await aiResponse.json();

        // 2. Update completion
        const updatedCompletion = await db.injectionCompletion.update({
            where: {
                id: completionId,
                patientId: session.user.id,
            },
            data: {
                mood,
                moodAnalysis,
            }
        });

        return NextResponse.json(updatedCompletion, { status: 200 });

    } catch (error) {
        console.error('Error updating injection completion:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 