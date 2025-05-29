import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Readable } from 'stream';
import sharp from 'sharp';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Helper function to convert Buffer to File
function bufferToFile(buffer: Buffer, filename: string): File {
  return new File([buffer], filename, { type: 'image/png' });
}

// Helper function to load image from buffer and get dimensions
async function loadImageFromBuffer(buffer: Buffer) {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 1024,
    height: metadata.height || 1024
  };
}

// Helper function to calculate the closest valid size for OpenAI API
function calculateSize(width: number, height: number): "1024x1024" | "1536x1024" | "1024x1536" | "auto" {
  // If dimensions are close to square (within 10% difference)
  const aspectRatio = width / height;
  if (aspectRatio >= 0.9 && aspectRatio <= 1.1) {
    return "1024x1024";
  }
  
  // For landscape images
  if (width > height) {
    return "1536x1024";
  }
  
  // For portrait images
  if (height > width) {
    return "1024x1536";
  }
  
  // Default to auto if unsure
  return "auto";
}

export async function POST(request: NextRequest) {
  try {
    const { originalImage, maskImage, prompt } = await request.json();

    if (!originalImage || !maskImage || !prompt) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Convert base64 to buffers
    const originalBuffer = Buffer.from(originalImage.split(',')[1], 'base64');
    const maskBuffer = Buffer.from(maskImage.split(',')[1], 'base64');

    // Load the original image to get dimensions
    const img = await loadImageFromBuffer(originalBuffer);
    const size = calculateSize(img.width, img.height);

    // Convert buffers to Files for OpenAI API
    const originalFile = bufferToFile(originalBuffer, 'original.png');
    const maskFile = bufferToFile(maskBuffer, 'mask.png');

    // Call OpenAI API
    const result = await openai.images.edit({
      model: "gpt-image-1",
      image: originalFile,
      prompt: prompt,
      n: 1,
      size: size,
    });

    // The API will return base64 JSON for gpt-image-1
    if (!result.data?.[0]?.b64_json) {
      throw new Error('No image generated');
    }

    return NextResponse.json({
      success: true,
      modifiedImage: result.data[0].b64_json,
    });

  } catch (error) {
    console.error('Error modifying car image:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 