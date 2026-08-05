'use client';

import React, { useRef, useEffect } from 'react';

interface MagazineCoverProps {
  imageUrl: string;
  title: string;
  url?: string;
  showQrCode?: boolean;
  vendorTitle?: string;
  logoDataUri?: string;
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
  logoDataUri,
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

      // Removed Gradient Overlay and Badge as requested ("remove watermark")

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

      // 3. Set Title styles and Draw (High contrast for no overlay)
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      
      const titleFont = '800 48px sans-serif';
      const titleLines = wrapText(title, width - 64, titleFont);
      ctx.font = titleFont;
      
      let currentY = height - 50;
      if (showQrCode && url) {
          currentY = height - 120;
      }

      titleLines.forEach((line, index) => {
        const lineY = currentY - ((titleLines.length - 1 - index) * 52);
        ctx.strokeText(line, 32, lineY);
        ctx.fillText(line, 32, lineY);
      });
      
      if (vendorTitle) {
        ctx.font = 'bold 14px sans-serif';
        ctx.lineWidth = 3;
        const vendorY = currentY - (titleLines.length * 52) - 10;
        ctx.strokeText(vendorTitle.toUpperCase(), 32, vendorY);
        ctx.fillText(vendorTitle.toUpperCase(), 32, vendorY);
      }
      
      // 4. Draw Logo if provided
      if (logoDataUri) {
          const logoImg = new Image();
          logoImg.src = logoDataUri;
          await new Promise((resolve) => {
              logoImg.onload = () => {
                  const logoSize = 60;
                  const logoX = 32;
                  const logoY = 32;
                  ctx.fillStyle = 'white';
                  ctx.beginPath();
                  ctx.roundRect(logoX - 5, logoY - 5, logoSize + 10, logoSize + 10, 8);
                  ctx.fill();
                  ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
                  resolve(null);
              };
              logoImg.onerror = () => resolve(null);
          });
      }

      // 6. Draw QR Code if enabled
      if (showQrCode && url) {
          const qrSize = 80;
          const qrX = width - qrSize - 20;
          const qrY = height - qrSize - 20;
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.roundRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 8);
          ctx.fill();

          const qrImg = new Image();
          qrImg.crossOrigin = 'anonymous';
          qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;

          await new Promise((resolve) => {
              qrImg.onload = () => {
                  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
                  ctx.fillStyle = 'black';
                  ctx.font = 'bold 10px sans-serif';
                  ctx.textAlign = 'right';
                  ctx.fillText('SCAN TO SHOP', width - 20, height - qrSize - 30);
                  resolve(null);
              };
              qrImg.onerror = () => resolve(null);
          });
      }
      
      if (onCanvasUpdate) {
          onCanvasUpdate(canvas.toDataURL('image/jpeg', 0.9));
      }
    };

    drawCover();
  }, [imageUrl, title, url, showQrCode, vendorTitle, logoDataUri, width, height, onCanvasUpdate]);

  return <canvas ref={canvasRef} width={width} height={height} className="rounded-lg shadow-md max-w-full h-auto" />;
}