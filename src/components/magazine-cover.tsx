'use client';

import React, { useRef, useEffect } from 'react';

interface MagazineCoverProps {
  imageUrl: string;
  title: string;
  vendorTitle?: string;
  width?: number;
  height?: number;
  onCanvasUpdate?: (dataUrl: string) => void;
}

export function MagazineCover({
  imageUrl,
  title,
  vendorTitle,
  width = 400,
  height = 500,
  onCanvasUpdate,
}: MagazineCoverProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw background image
      ctx.drawImage(img, 0, 0, width, height);

      // Draw gradient
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, 'rgba(0,0,0,0.8)');
      gradient.addColorStop(0.5, 'rgba(0,0,0,0.2)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Text wrapping function
      const wrapText = (text: string, maxWidth: number, font: string): string[] => {
        ctx.font = font;
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = words[0] || '';

        for (let i = 1; i < words.length; i++) {
          const word = words[i];
          const testLine = currentLine + ' ' + word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine);
        return lines;
      };

      // Set text styles
      ctx.fillStyle = 'white';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Draw title
      const titleFont = '800 48px sans-serif';
      const titleLines = wrapText(title, width - 64, titleFont);
      ctx.font = titleFont;
      titleLines.forEach((line, index) => {
        ctx.fillText(line, 32, height - 32 - ((titleLines.length - 1 - index) * 52));
      });
      
      // Draw vendor title
      if (vendorTitle) {
        ctx.font = 'bold 14px sans-serif';
        ctx.globalAlpha = 0.8;
        const vendorY = height - 32 - (titleLines.length * 52) - 10;
        ctx.fillText(vendorTitle.toUpperCase(), 32, vendorY);
        ctx.globalAlpha = 1.0;
      }

      // Reset shadows
      ctx.shadowColor = 'transparent';
      
      // Draw badge
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      const roundedRect = (x:number, y:number, w:number, h:number, r:number) => {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x+r, y);
        ctx.arcTo(x+w, y,   x+w, y+h, r);
        ctx.arcTo(x+w, y+h, x,   y+h, r);
        ctx.arcTo(x,   y+h, x,   y,   r);
        ctx.arcTo(x,   y,   x+w, y,   r);
        ctx.closePath();
        ctx.fill();
      }
      roundedRect(width - 120, 16, 104, 24, 4);

      ctx.fillStyle = '#5a31f4'; // Hardcoded primary color
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NEW COLLECTION', width - 68, 33);
      ctx.textAlign = 'left'; // Reset alignment
      
      if (onCanvasUpdate) {
          const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9); // 90% quality
          onCanvasUpdate(jpegDataUrl);
      }
    };

    img.onerror = () => {
      ctx.fillStyle = '#ccc';
      ctx.fillRect(0,0,width,height);
      ctx.fillStyle = 'black';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Image failed to load', width/2, height/2);
    }
  }, [imageUrl, title, vendorTitle, width, height, onCanvasUpdate]);

  return <canvas ref={canvasRef} width={width} height={height} className="rounded-lg shadow-md" />;
}
