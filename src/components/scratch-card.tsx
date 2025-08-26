
'use client';

import React, { useRef, useEffect, useState } from 'react';
import Image from 'next/image';

interface ScratchCardProps {
  width: number;
  height: number;
  scratchImageSrc: string;
  children: React.ReactNode;
  'data-ai-hint'?: string;
}

export function ScratchCard({ width, height, scratchImageSrc, children, 'data-ai-hint': dataAiHint }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratched, setIsScratched] = useState(false);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const image = new window.Image();
    image.crossOrigin = 'anonymous'; // Required for picsum photos
    image.src = scratchImageSrc;

    image.onload = () => {
      context.drawImage(image, 0, 0, width, height);
      context.globalCompositeOperation = 'destination-out';
      context.lineWidth = 40;
      context.lineCap = 'round';
      context.lineJoin = 'round';
    };

    image.onerror = () => {
        // Fallback drawing if image fails to load
        context.fillStyle = '#8B5CF6';
        context.fillRect(0, 0, width, height);
        context.fillStyle = 'white';
        context.font = 'bold 24px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('Snazzify Coin', width / 2, height / 2);

        context.globalCompositeOperation = 'destination-out';
        context.lineWidth = 40;
        context.lineCap = 'round';
        context.lineJoin = 'round';
    }

  }, [scratchImageSrc, width, height]);

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in event) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    }
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startScratching = (event: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const { x, y } = getCoordinates(event);
    const context = canvasRef.current?.getContext('2d');
    if (context) {
      context.beginPath();
      context.moveTo(x, y);
    }
  };

  const scratch = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const { x, y } = getCoordinates(event);
    const context = canvasRef.current?.getContext('2d');
    if (context) {
      context.lineTo(x, y);
      context.stroke();
    }
  };

  const stopScratching = () => {
    isDrawing.current = false;
    checkScratchCompletion();
  };

  const checkScratchCompletion = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const imageData = context.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    let transparentPixels = 0;

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) {
        transparentPixels++;
      }
    }

    const totalPixels = width * height;
    const scratchPercentage = (transparentPixels / totalPixels) * 100;

    if (scratchPercentage > 70) {
      setIsScratched(true);
    }
  };

  return (
    <div
      className="relative inline-block cursor-grab active:cursor-grabbing rounded-lg overflow-hidden"
      style={{ width, height }}
    >
        <div style={{ width, height, position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
            {children}
        </div>
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onMouseDown={startScratching}
            onMouseMove={scratch}
            onMouseUp={stopScratching}
            onMouseLeave={stopScratching}
            onTouchStart={startScratching}
            onTouchMove={scratch}
            onTouchEnd={stopScratching}
            className={`absolute top-0 left-0 z-10 transition-opacity duration-700 ${isScratched ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        />
    </div>
  );
}
