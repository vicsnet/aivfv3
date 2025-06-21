import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { mood, medicationName } = await req.json();

    if (!mood || typeof mood !== 'string') {
      return new NextResponse('Invalid request body', { status: 400 });
    }

    const prompt = `The user is a patient undergoing an IVF (In Vitro Fertilization) cycle. They have just taken an injection of "${medicationName || 'their fertility medication'}" and are logging their mood and side effects. Their input is: "${mood}".

As an expert AI assistant specializing in IVF patient support for a fertility clinic, please analyze this input in the context of the specific medication taken. Common side effects for medications like Gonal-F, Menopur, etc., include bloating, mild pelvic discomfort, headaches, and mood swings.

Your response must:
1. Adopt a reassuring and empathetic tone.
2. Reference that they are on an IVF journey.
3. Clearly state whether their described symptoms are commonly associated with "${medicationName || 'their medication'}" during an IVF treatment, if they warrant closer monitoring, or if they should contact our clinic's team immediately for guidance.
4. Provide a brief, clear explanation for your assessment in simple, non-medical terms.
5. NEVER give medical advice. Instead, empower the patient by strongly recommending they contact us with any and all concerns, as our team is their best resource.
6. Keep the entire response to a maximum of 3-4 sentences.

Example for mild symptoms after Gonal-F: "Thank you for logging your symptoms. It's very common to experience things like mild bloating and moodiness during an IVF cycle, especially with medications like Gonal-F. We recommend you continue to monitor how you feel, but please don't hesitate to contact our team if your symptoms worsen or if you have any questions at all."

Example for concerning symptoms: "Thank you for sharing this with us. While some of these symptoms can occur during IVF, the severity you've described warrants attention. Please contact us at the clinic at your earliest convenience to discuss this with a nurse."

Your analysis of the patient's input ("${mood}") after taking "${medicationName || 'their fertility medication'}" is:`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ "role": "user", "content": prompt }],
    });

    return NextResponse.json({ analysis: response.choices[0].message.content });
  } catch (error) {
    console.error('[AI_ANALYZE_MOOD]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 