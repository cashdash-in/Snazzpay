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
  width = 800, // Optimized size
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

      // 1. Draw Background Base
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, '#f8fafc');
      bgGradient.addColorStop(1, '#f1f5f9');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // 2. Load and Draw Product Image (Centered with padding)
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const padding = 80;
      const innerWidth = width - (padding * 2);
      const innerHeight = height * 0.6; // Take up 60% of height
      const scale = Math.min(innerWidth / img.width, innerHeight / img.height);
      const x = (width / 2) - (img.width * scale / 2);
      const y = (height * 0.4) - (img.height * scale / 2); // Center in top half area

      // Draw subtle shadow for product
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 20;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // 3. Draw Info Plate
      const uiHeight = height * 0.32;
      ctx.fillStyle = 'rgba(255, 255, 255, 1)';
      ctx.beginPath();
      ctx.roundRect(0, height - uiHeight, width, uiHeight, 0);
      ctx.fill();
      
      // Top border for plate
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height - uiHeight);
      ctx.lineTo(width, height - uiHeight);
      ctx.stroke();

      // 4. Draw Headline
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 32px Inter, sans-serif';
      ctx.fillText(headline.toUpperCase(), 40, height - uiHeight + 60);

      // 5. Draw Product Title
      ctx.fillStyle = '#64748b';
      ctx.font = '500 18px Inter, sans-serif';
      ctx.fillText(title, 40, height - uiHeight + 95);

      // 6. Draw Price Tag
      ctx.fillStyle = '#5a31f4';
      ctx.font = '900 48px Inter, sans-serif';
      ctx.fillText(`₹${price.toLocaleString()}`, 40, height - 60);

      // 7. Draw QR Code
      const qrSize = 130;
      const qrX = width - qrSize - 40;
      const qrY = height - qrSize - 40;

      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`;

      await new Promise((resolve) => {
        qrImg.onload = () => {
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 12);
          ctx.fill();
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 12px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('SCAN TO ORDER', qrX + qrSize/2, qrY - 20);
          ctx.textAlign = 'left';
          resolve(null);
        };
        qrImg.onerror = () => resolve(null);
      });

      // 8. Payment Badges
      const isSecureCod = (allowedPaymentMethods || []).includes('Secure COD');
      const isCod = (allowedPaymentMethods || []).includes('Cash on Delivery');

      if (isSecureCod || isCod) {
          const badgeText = isSecureCod ? 'SECURE COD AVAILABLE' : 'CASH ON DELIVERY';
          ctx.font = 'bold 12px Inter, sans-serif';
          const textWidth = ctx.measureText(badgeText).width;
          ctx.fillStyle = isSecureCod ? '#5a31f4' : '#64748b';
          ctx.beginPath();
          ctx.roundRect(40, height - uiHeight + 125, textWidth + 24, 26, 13);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.fillText(badgeText, 40 + (textWidth + 24)/2, height - uiHeight + 143);
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
                  ctx.roundRect(35, 35, logoSize + 20, logoSize + 20, 16);
                  ctx.fill();
                  ctx.drawImage(logoImg, 45, 45, logoSize, logoSize);
                  resolve(null);
              };
              logoImg.onerror = () => resolve(null);
          });
      }

      if (showBrandText && brandName) {
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 22px Inter, sans-serif';
          const textX = logoDataUri ? 135 : 40;
          const textY = logoDataUri ? 85 : 60;
          ctx.fillText(brandName.toUpperCase(), textX, textY);
      }

      if (onCanvasUpdate) {
        onCanvasUpdate(canvas.toDataURL('image/jpeg', 0.9));
      }
    };

    drawAd();
  }, [imageUrl, title, headline, price, qrUrl, brandName, logoDataUri, showBrandText, allowedPaymentMethods, width, height, onCanvasUpdate]);

  return <canvas ref={canvasRef} width={width} height={height} className="rounded-2xl shadow-xl max-w-full h-auto border bg-slate-50" />;
}
