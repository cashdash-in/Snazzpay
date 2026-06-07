'use client';

import React, { useRef, useEffect } from 'react';

interface MagazineCoverProps {
  imageUrl: string;
  title: string;
  url?: string;
  showQrCode?: boolean;
  vendorTitle?: string;
  width?: number;
  height?: number;
  onCanvasUpdate?: (dataUrl: string) => void;
}

export function MagazineCover({
  imageUrl,
  title,
  url,
  showQrCode = true,
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

    const drawCover = async () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Load Background Image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Draw background image
      ctx.drawImage(img, 0, 0, width, height);

      // 2. Draw Gradient Overlay
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, 'rgba(0,0,0,0.85)');
      gradient.addColorStop(0.4, 'rgba(0,0,0,0.3)');
      gradient.addColorStop(0.7, 'rgba(0,0,0,0)');
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

      // 3. Set Title styles and Draw
      ctx.fillStyle = 'white';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      const titleFont = '800 48px sans-serif';
      const titleLines = wrapText(title, width - 64, titleFont);
      ctx.font = titleFont;
      
      // Calculate Y position for title
      let currentY = height - 50;
      if (showQrCode && url) {
          currentY = height - 120; // Move up to make space for QR
      }

      titleLines.forEach((line, index) => {
        const lineY = currentY - ((titleLines.length - 1 - index) * 52);
        ctx.fillText(line, 32, lineY);
      });
      
      // Draw vendor title
      if (vendorTitle) {
        ctx.font = 'bold 14px sans-serif';
        ctx.globalAlpha = 0.8;
        const vendorY = currentY - (titleLines.length * 52) - 10;
        ctx.fillText(vendorTitle.toUpperCase(), 32, vendorY);
        ctx.globalAlpha = 1.0;
      }

      // Reset shadows
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // 4. Draw Badge
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      const roundedRect = (x:number, y:number, w:number, h:number, r:number) => {
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

      ctx.fillStyle = '#5a31f4';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NEW COLLECTION', width - 68, 33);
      ctx.textAlign = 'left';

      // 5. Draw QR Code if enabled
      if (showQrCode && url) {
          const qrSize = 80;
          const qrX = width - qrSize - 20;
          const qrY = height - qrSize - 20;

          // Draw white background for QR
          ctx.fillStyle = 'white';
          roundedRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 8);

          const qrImg = new Image();
          qrImg.crossOrigin = 'anonymous';
          qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;

          await new Promise((resolve) => {
              qrImg.onload = () => {
                  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
                  
                  // Add "Scan to Shop" label
                  ctx.fillStyle = 'white';
                  ctx.font = 'bold 10px sans-serif';
                  ctx.textAlign = 'right';
                  ctx.fillText('SCAN TO SHOP', width - 20, height - qrSize - 30);
                  
                  // Draw truncated URL text
                  const shortUrl = url.replace(/^https?:\/\//, '').split('?')[0];
                  ctx.font = '500 10px sans-serif';
                  ctx.globalAlpha = 0.7;
                  ctx.fillText(shortUrl, width - 20, height - 10);
                  ctx.globalAlpha = 1.0;
                  
                  resolve(null);
              };
              qrImg.onerror = () => resolve(null); // Continue even if QR fails
          });
      }
      
      if (onCanvasUpdate) {
          onCanvasUpdate(canvas.toDataURL('image/jpeg', 0.9));
      }
    };

    drawCover();
  }, [imageUrl, title, url, showQrCode, vendorTitle, width, height, onCanvasUpdate]);

  return <canvas ref={canvasRef} width={width} height={height} className="rounded-lg shadow-md max-w-full h-auto" />;
}