import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { question } = await request.json();
    if (!question || typeof question !== 'string') {
      return new NextResponse('Missing or invalid question', { status: 400 });
    }

    const prompt = `You are an expert AI assistant for a fertility clinic. Answer the following question as it relates to IVF (in vitro fertilization), fertility, and patient support. Be empathetic, clear, and helpful. If the question is not related to IVF, politely redirect the user to ask about IVF or fertility.\n\nQuestion: ${question}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an IVF and fertility expert AI assistant.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const answer = response.choices[0].message.content || '';
    return NextResponse.json({ answer });
  } catch (error) {
    console.error('[IVF_CHAT_API]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 