'use client';

import React, { useRef, useEffect } from 'react';

interface SocialAdCardProps {
  imageUrl: string;
  title: string;
  headline: string;
  price: number;
  qrUrl: string;
  brandName?: string;
  logoDataUri?: string;
  showBrandText?: boolean;
  allowedPaymentMethods?: string[];
  width?: number;
  height?: number;
  onCanvasUpdate?: (dataUrl: string) => void;
}

export function SocialAdCard({
  imageUrl,
  title,
  headline,
  price,
  qrUrl,
  brandName,
  logoDataUri,
  showBrandText = false,
  allowedPaymentMethods = [],
  width = 800,
  height = 800,
  onCanvasUpdate,
}: SocialAdCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawAd = async () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Clean White Background (Removed gradients to clear "watermark" feel)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // 2. Load and Draw Product Image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const padding = 60;
      const innerWidth = width - (padding * 2);
      const innerHeight = height * 0.55;
      const scale = Math.min(innerWidth / img.width, innerHeight / img.height);
      const x = (width / 2) - (img.width * scale / 2);
      const y = (height * 0.35) - (img.height * scale / 2);

      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      // 3. Draw Info Plate (Solid white for clean look)
      const uiHeight = height * 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, height - uiHeight, width, uiHeight);
      
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height - uiHeight);
      ctx.lineTo(width, height - uiHeight);
      ctx.stroke();

      // 4. Draw Headline
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 36px sans-serif';
      ctx.fillText(headline.toUpperCase(), 40, height - uiHeight + 70);

      // 5. Draw Product Title
      ctx.fillStyle = '#64748b';
      ctx.font = '500 20px sans-serif';
      ctx.fillText(title, 40, height - uiHeight + 110);

      // 6. Draw Price Tag
      ctx.fillStyle = '#5a31f4';
      ctx.font = '900 52px sans-serif';
      ctx.fillText(`₹${price.toLocaleString()}`, 40, height - 60);

      // 7. Draw QR Code
      const qrSize = 140;
      const qrX = width - qrSize - 40;
      const qrY = height - qrSize - 40;

      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`;

      await new Promise((resolve) => {
        qrImg.onload = () => {
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.roundRect(qrX - 15, qrY - 15, qrSize + 30, qrSize + 30, 16);
          ctx.fill();
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('ORDER LINK', qrX + qrSize/2, qrY - 25);
          ctx.textAlign = 'left';
          resolve(null);
        };
        qrImg.onerror = () => resolve(null);
      });

      // 8. Payment Badge
      const isSecureCod = (allowedPaymentMethods || []).includes('Secure COD');
      if (isSecureCod) {
          const badgeText = 'SECURE COD AVAILABLE';
          ctx.font = 'bold 14px sans-serif';
          const textWidth = ctx.measureText(badgeText).width;
          ctx.fillStyle = '#5a31f4';
          ctx.beginPath();
          ctx.roundRect(40, height - uiHeight + 140, textWidth + 24, 28, 14);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.fillText(badgeText, 40 + (textWidth + 24)/2, height - uiHeight + 159);
          ctx.textAlign = 'left';
      }

      // 9. Logo & Brand
      if (logoDataUri) {
          const logoImg = new Image();
          logoImg.src = logoDataUri;
          await new Promise((resolve) => {
              logoImg.onload = () => {
                  const logoSize = 64;
                  ctx.fillStyle = 'white';
                  ctx.beginPath();
                  ctx.roundRect(40, 40, logoSize + 20, logoSize + 20, 16);
                  ctx.fill();
                  ctx.drawImage(logoImg, 50, 50, logoSize, logoSize);
                  resolve(null);
              };
              logoImg.onerror = () => resolve(null);
          });
      }

      if (showBrandText && brandName) {
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 24px sans-serif';
          const textX = logoDataUri ? 140 : 40;
          const textY = logoDataUri ? 90 : 60;
          ctx.fillText(brandName.toUpperCase(), textX, textY);
      }

      if (onCanvasUpdate) {
        onCanvasUpdate(canvas.toDataURL('image/jpeg', 0.9));
      }
    };

    drawAd();
  }, [imageUrl, title, headline, price, qrUrl, brandName, logoDataUri, showBrandText, allowedPaymentMethods, width, height, onCanvasUpdate]);

  return <canvas ref={canvasRef} width={width} height={height} className="rounded-2xl shadow-xl max-w-full h-auto border bg-white" />;
}