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
  console.log('🚗 Car modification API called');
  
  try {
    const startTime = Date.now();
    console.log('📨 Parsing request body...');
    
    const { originalImage, maskImage, prompt } = await request.json();
    console.log('✅ Request parsed successfully');
    console.log('📝 Prompt:', prompt);
    console.log('📸 Original image size:', originalImage?.length || 0, 'characters');
    console.log('🎭 Mask image size:', maskImage?.length || 0, 'characters');

    if (!originalImage || !maskImage || !prompt) {
      console.error('❌ Missing required parameters:', {
        hasOriginalImage: !!originalImage,
        hasMaskImage: !!maskImage,
        hasPrompt: !!prompt
      });
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('🔄 Converting base64 to buffers...');
    // Convert base64 to buffers
    const originalBuffer = Buffer.from(originalImage.split(',')[1], 'base64');
    const maskBuffer = Buffer.from(maskImage.split(',')[1], 'base64');
    console.log('✅ Buffers created:', {
      originalSize: originalBuffer.length,
      maskSize: maskBuffer.length
    });

    console.log('📏 Analyzing image dimensions...');
    // Load the original image to get dimensions
    const img = await loadImageFromBuffer(originalBuffer);
    const size = calculateSize(img.width, img.height);
    console.log('📐 Image dimensions:', {
      width: img.width,
      height: img.height,
      calculatedSize: size
    });

    console.log('📁 Converting to File objects...');
    // Convert buffers to Files for OpenAI API
    const originalFile = bufferToFile(originalBuffer, 'original.png');
    const maskFile = bufferToFile(maskBuffer, 'mask.png');

    console.log('🤖 Calling OpenAI API...');
    const apiStartTime = Date.now();
    
    // Call OpenAI API with timeout handling
    const result = await Promise.race([
      openai.images.edit({
        model: "gpt-image-1",
        image: originalFile,
        mask: maskFile,
        prompt: prompt,
        n: 1,
        size: size,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI API timeout after 90 seconds')), 90000)
      )
    ]) as any;

    const apiEndTime = Date.now();
    console.log(`✅ OpenAI API completed in ${apiEndTime - apiStartTime}ms`);

    // The API will return base64 JSON for gpt-image-1
    if (!result.data?.[0]?.b64_json) {
      console.error('❌ No image generated from OpenAI:', result);
      throw new Error('No image generated');
    }

    const endTime = Date.now();
    console.log(`🎉 Car modification completed successfully in ${endTime - startTime}ms`);
    console.log('📤 Returning response...');

    return NextResponse.json({
      success: true,
      modifiedImage: result.data[0].b64_json,
    });

  } catch (error) {
    console.error('❌ Error modifying car image:', error);
    console.error('📊 Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. The AI processing is taking too long. Please try with a smaller image or simpler prompt.';
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