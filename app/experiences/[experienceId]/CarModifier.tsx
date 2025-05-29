'use client';

import { useState, useRef, useEffect } from 'react';

interface CarModifierProps {
  experienceId: string;
}

export default function CarModifier({ experienceId }: CarModifierProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [maskImage, setMaskImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPostingToForum, setIsPostingToForum] = useState(false);
  const [forumSuccess, setForumSuccess] = useState<{ postId: string; forumLink: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current user ID on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await fetch('/api/current-user');
        if (response.ok) {
          const data = await response.json();
          setCurrentUserId(data.userId);
        }
      } catch (error) {
        console.error('Failed to get current user:', error);
      }
    };
    
    getCurrentUser();
  }, []);

  // Initialize canvases when image is uploaded
  useEffect(() => {
    if (uploadedImage) {
      initializeCanvases();
    }
  }, [uploadedImage]);

  const initializeCanvases = () => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas || !uploadedImage) return;

    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    if (!ctx || !maskCtx) return;

    const img = new Image();
    img.onload = () => {
      // Calculate dimensions maintaining aspect ratio
      const maxWidth = 800;
      const maxHeight = 600;
      let width = img.width;
      let height = img.height;
      
      // Scale down if image is too large
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      maskCanvas.width = width;
      maskCanvas.height = height;

      // Draw original image on main canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Initialize mask canvas with black background
      maskCtx.fillStyle = '#000000';
      maskCtx.fillRect(0, 0, width, height);
    };
    img.src = uploadedImage;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      setUploadedImage(imageUrl);
      setMaskImage(null); // Reset mask when new image is uploaded
      setForumSuccess(null); // Reset forum success
    };
    reader.readAsDataURL(file);
  };

  const getMouseCoordinates = (e: MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;
    
    // Calculate the scaling factors
    const scaleX = canvas.width / containerWidth;
    const scaleY = canvas.height / containerHeight;
    
    // Get mouse position relative to the container
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Scale the coordinates
    return {
      x: mouseX * scaleX,
      y: mouseY * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    const coords = getMouseCoordinates(e.nativeEvent, canvas);
    
    // Draw white circle on mask canvas
    maskCtx.fillStyle = '#FFFFFF';
    maskCtx.beginPath();
    maskCtx.arc(coords.x, coords.y, brushSize / 2, 0, 2 * Math.PI);
    maskCtx.fill();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearMask = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    // Reset to black background
    maskCtx.fillStyle = '#000000';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
  };

  // Helper function to convert data URL to File
  const dataURLToFile = (dataURL: string, filename: string): File => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // Function to upload image to Whop and get attachment ID
  const uploadImageToWhop = async (imageDataURL: string, filename: string): Promise<string> => {
    const file = dataURLToFile(imageDataURL, filename);
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    return data.attachmentId;
  };

  // Function to post to forum with before/after images
  const postToForum = async (beforeImageId: string, afterImageId: string, modificationPrompt: string) => {
    setIsPostingToForum(true);
    
    try {
      const response = await fetch('/api/forum/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `@${currentUserId} just modified this car, with the prompt:  
"${modificationPrompt}"

Try it yourself here:  
https://whop.com/apps/app_S42iB0COVVUVwO/install/

Before vs after ⬇️`,
          experienceId,
          attachments: [beforeImageId, afterImageId],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to post to forum');
      }

      const data = await response.json();
      setForumSuccess({
        postId: data.postId,
        forumLink: data.forumLink,
      });
      
    } catch (error) {
      console.error('Error posting to forum:', error);
      alert('Failed to post to forum, but your modification was successful!');
    } finally {
      setIsPostingToForum(false);
    }
  };

  const handleModifyCar = async () => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas || !prompt.trim() || !uploadedImage) {
      alert('Please upload an image, paint the area to modify, and enter a prompt');
      return;
    }

    setIsProcessing(true);
    setMaskImage(null);
    setForumSuccess(null);

    try {
      // Get the original image as PNG
      const originalDataUrl = canvas.toDataURL('image/png');

      // Create mask with alpha channel
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) return;

      // Get the current mask data
      const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      const pixelData = imageData.data;

      // Convert black to black with alpha and white to white with alpha
      for (let i = 0; i < pixelData.length; i += 4) {
        // If pixel is white (255, 255, 255)
        if (pixelData[i] === 255 && pixelData[i + 1] === 255 && pixelData[i + 2] === 255) {
          pixelData[i + 3] = 255; // Full alpha
        }
        // If pixel is black (0, 0, 0)
        else {
          pixelData[i + 3] = 255; // Full alpha
        }
      }

      // Put the modified image data back
      maskCtx.putImageData(imageData, 0, 0);

      // Get the mask as PNG with alpha channel
      const maskDataUrl = maskCanvas.toDataURL('image/png');
      setMaskImage(maskDataUrl);

      // Call our API endpoint
      const response = await fetch('/api/modify-car', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalImage: originalDataUrl,
          maskImage: maskDataUrl,
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to modify car');
      }

      const responseData = await response.json();
      
      // Display the modified image
      if (responseData.modifiedImage) {
        const modifiedImageDataUrl = `data:image/png;base64,${responseData.modifiedImage}`;
        setMaskImage(modifiedImageDataUrl);

        // Upload both images to Whop and post to forum
        try {
          console.log('📁 Uploading images to Whop for forum post...');
          
          // Upload original (before) image
          const beforeImageId = await uploadImageToWhop(originalDataUrl, `before-${Date.now()}.png`);
          
          // Upload modified (after) image
          const afterImageId = await uploadImageToWhop(modifiedImageDataUrl, `after-${Date.now()}.png`);
          
          // Post to forum with both images
          await postToForum(beforeImageId, afterImageId, prompt);
          
        } catch (forumError) {
          console.error('Forum posting failed:', forumError);
          // Don't throw here, as the modification was successful
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Failed to modify car');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center">
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-3 rounded-full mb-4">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-blue-800 font-semibold">AI cajdwjar Modification Studiooiio</span>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Transform your car with AI-powered modifications. Upload your car photo, paint the areas you want to change, and watch AI bring your vision to life.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Step 1: Upload */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
            <h3 className="text-lg font-semibold text-gray-800">Upload Your Car</h3>
          </div>
          
          <div className="space-y-4">
            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
              uploadedImage 
                ? 'border-blue-300 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
            }`}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="car-image-upload"
              />
              <label
                htmlFor="car-image-upload"
                className="cursor-pointer block"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="text-blue-600 font-medium mb-1">Click to upload</div>
                <div className="text-gray-500 text-sm">PNG, JPG up to 25MB</div>
              </label>
            </div>
            
            {uploadedImage && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium">Image uploaded successfully!</span>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Paint Areas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
              uploadedImage ? 'bg-blue-500' : 'bg-gray-300'
            }`}>2</div>
            <h3 className={`text-lg font-semibold ${uploadedImage ? 'text-gray-800' : 'text-gray-400'}`}>
              Paint Areas to Modify
            </h3>
          </div>

          {!uploadedImage ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">Upload an image first to start painting</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Brush Controls */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">Brush Size</label>
                  <span className="text-sm text-blue-600 font-medium">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((brushSize - 5) / 45) * 100}%, #e5e7eb ${((brushSize - 5) / 45) * 100}%, #e5e7eb 100%)`
                  }}
                />
              </div>

              {/* Canvas */}
              <div className="relative bg-gray-50 rounded-xl overflow-hidden border-2 border-gray-200" style={{ minHeight: '300px' }}>
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ objectFit: 'contain' }}
                />
                <canvas
                  ref={maskCanvasRef}
                  className="absolute top-0 left-0 w-full h-full cursor-crosshair opacity-40"
                  style={{ objectFit: 'contain' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
                {!uploadedImage && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-gray-400 text-sm">Your image will appear here</p>
                  </div>
                )}
              </div>

              <button
                onClick={clearMask}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear Painted Areas
              </button>
            </div>
          )}
        </div>

        {/* Step 3: Generate */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
              uploadedImage && prompt.trim() ? 'bg-blue-500' : 'bg-gray-300'
            }`}>3</div>
            <h3 className={`text-lg font-semibold ${
              uploadedImage && prompt.trim() ? 'text-gray-800' : 'text-gray-400'
            }`}>
              Describe & Generate
            </h3>
          </div>

          <div className="space-y-4">
            {/* Prompt Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What would you like to modify?
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'change the rim color to gold', 'add racing stripes', 'lower the car and add a spoiler'"
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 text-sm text-gray-900 placeholder-gray-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                rows={4}
                disabled={!uploadedImage}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-400">Be specific for better results</span>
                <span className="text-xs text-gray-400">{prompt.length}/1000</span>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleModifyCar}
              disabled={!uploadedImage || !prompt.trim() || isProcessing}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 group"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Transform My Car
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {(isProcessing || maskImage) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Your Modified Car</h3>
            <p className="text-gray-600">AI-generated modification based on your requirements</p>
          </div>

          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-500"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <p className="text-gray-600 mt-4 font-medium">
                {isPostingToForum ? 'Posting to forum...' : 'AI is working its magic...'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {isPostingToForum ? 'Sharing your transformation with the community' : 'This may take 10-30 seconds'}
              </p>
            </div>
          )}

          {maskImage && !isProcessing && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <img
                  src={maskImage}
                  alt="Modified car"
                  className="w-full max-w-2xl mx-auto rounded-lg shadow-md"
                />
              </div>
              
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-800 mb-2">Modification Complete!</h4>
                    <p className="text-blue-700 text-sm mb-3">
                      <strong>Your Request:</strong> "{prompt}"
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200">
                        Download Image
                      </button>
                      <button className="bg-white hover:bg-gray-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200">
                        Try Another Modification
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Forum posting status */}
              {isPostingToForum && (
                <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-100">
                  <div className="flex items-start gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-yellow-500 border-t-transparent flex-shrink-0 mt-1"></div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-yellow-800 mb-2">Sharing with Community...</h4>
                      <p className="text-yellow-700 text-sm">
                        Uploading your before & after images and posting to the forum!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Forum success */}
              {forumSuccess && (
                <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-800 mb-2">🎉 Posted to Forum!</h4>
                      <p className="text-green-700 text-sm mb-3">
                        Your amazing before & after transformation has been shared with the community!
                      </p>
                      <a
                        href={forumSuccess.forumLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View in Forum
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 