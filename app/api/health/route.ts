import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    // A simple query to check if the database is reachable and responsive.
    await db.$queryRaw`SELECT 1`;
    
    console.log("Database connection successful.");
    return NextResponse.json({ status: 'ok', message: 'Database connection successful.' });
  } catch (error) {
    console.error("---DATABASE CONNECTION FAILED---");
    console.error(error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json(
      { status: 'error', message: 'Database connection failed.', error: errorMessage },
      { status: 500 }
    );
  }
} 