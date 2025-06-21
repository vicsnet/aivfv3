import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { medicationName, dosage } = await request.json();

    if (!medicationName || !dosage) {
      return new NextResponse('Missing medicationName or dosage', { status: 400 });
    }

    const prompt = `As a virtual fertility nurse, you are providing a step-by-step guide for a patient to self-administer an injection of ${dosage} of the medication "${medicationName}".

Your response must be in two parts, separated by "---":

Part 1: A concise, friendly, and reassuring summary of the process. Keep it to 2-3 sentences.

Part 2: A Mermaid graph definition for a top-down flowchart. The graph should illustrate the key steps of the injection process. Use short, clear labels for each step.

Example format for your entire response:
A friendly summary of the injection process goes here. It's calm and reassuring.
---
graph TD
    A["Wash Hands & Prepare Supplies"] --> B["Prepare Medication: ${medicationName}"];
    B --> C["Select & Clean Injection Site"];
    C --> D["Inject Medication"];
    D --> E["Dispose of Needle Safely"];
    E --> F["All Done!"];

Your guide for ${dosage} of ${medicationName} is:`;

    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ "role": "user", "content": prompt }],
    });
    
    const content = response.choices[0].message.content || "";
    const [explanation, diagram] = content.split('---').map(part => part.trim());

    // The image part can be enhanced in the future
    const images: string[] = [];

    return NextResponse.json({ explanation, images, diagram });

  } catch (error) {
    console.error('Error in AI dosage explanation:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 