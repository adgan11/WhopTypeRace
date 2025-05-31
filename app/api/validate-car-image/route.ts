import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: NextRequest) {
  console.log('🔍 Car image validation API called');
  
  try {
    const { imageUrl } = await request.json();
    console.log('📸 Validating image URL:', imageUrl);

    if (!imageUrl) {
      console.error('❌ Missing image URL');
      return NextResponse.json(
        { error: 'Missing image URL' },
        { status: 400 }
      );
    }

    console.log('🤖 Calling OpenAI Vision API...');
    const apiStartTime = Date.now();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Does this image contain a car? Only reply with 'yes' or 'no'." },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 10,
    });

    const apiEndTime = Date.now();
    console.log(`✅ OpenAI Vision API completed in ${apiEndTime - apiStartTime}ms`);

    const answer = response.choices[0].message.content?.trim().toLowerCase();
    console.log('🎯 Vision API response:', answer);

    return NextResponse.json({
      success: true,
      containsCar: answer === 'yes',
    });

  } catch (error) {
    console.error('❌ Error validating car image:', error);
    
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
        statusCode = 504;
      } else if (error.message.includes('Invalid API key')) {
        errorMessage = 'AI service configuration error';
        statusCode = 500;
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'AI service is busy. Please try again in a moment.';
        statusCode = 429;
      } else {
        errorMessage = error.message;
      }
    }
    
    console.error(`🚨 Returning error: ${statusCode} - ${errorMessage}`);
    
    return NextResponse.json({ 
      error: errorMessage,
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substring(7)
    }, { status: statusCode });
  }
} 