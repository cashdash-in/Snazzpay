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
  showBrandText = true,
  allowedPaymentMethods = [],
  width = 1080, // Instagram Square Default
  height = 1080,
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

      // 1. Load Background Image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Draw background image (Cover aspect)
      const scale = Math.max(width / img.width, height / img.height);
      const x = (width / 2) - (img.width / 2) * scale;
      const y = (height / 2) - (img.height / 2) * scale;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      // 2. Draw Vignette Gradient for depth
      const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.7, 'rgba(0,0,0,0.3)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // 3. Draw Bottom UI Plate (Order section)
      const uiHeight = height * 0.28;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
      ctx.beginPath();
      ctx.roundRect(40, height - uiHeight - 40, width - 80, uiHeight, 40);
      ctx.fill();

      // 4. Draw Headline
      ctx.fillStyle = '#0f172a';
      ctx.font = '800 36px Inter, sans-serif';
      ctx.fillText(headline.toUpperCase(), 80, height - uiHeight + 40);

      // 5. Draw Product Title
      ctx.fillStyle = '#64748b';
      ctx.font = '600 20px Inter, sans-serif';
      ctx.fillText(title, 80, height - uiHeight + 80);

      // 6. Draw Price Tag
      ctx.fillStyle = '#5a31f4';
      ctx.font = '900 58px Inter, sans-serif';
      ctx.fillText(`₹${price.toLocaleString()}`, 80, height - 100);

      // 7. Draw QR Code (Bottom Right)
      const qrSize = 180;
      const qrX = width - qrSize - 80;
      const qrY = height - qrSize - 80;

      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}`;

      await new Promise((resolve) => {
        qrImg.onload = () => {
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 15);
          ctx.fill();
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 16px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('SCAN TO ORDER', qrX + qrSize/2, qrY - 25);
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
          ctx.font = 'bold 16px Inter, sans-serif';
          const textWidth = ctx.measureText(badgeText).width;
          ctx.fillStyle = isSecureCod ? '#5a31f4' : '#64748b';
          ctx.beginPath();
          ctx.roundRect(80, height - uiHeight + 110, textWidth + 30, 30, 15);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.fillText(badgeText, 80 + (textWidth + 30)/2, height - uiHeight + 131);
          ctx.textAlign = 'left';
      }

      // 9. BRANDING: Logo and Brand Name
      // We prioritize the logo in the top left
      if (logoDataUri) {
          const logoImg = new Image();
          logoImg.src = logoDataUri;
          await new Promise((resolve) => {
              logoImg.onload = () => {
                  const logoSize = 100;
                  // Draw white background plate for logo
                  ctx.fillStyle = 'white';
                  ctx.beginPath();
                  ctx.roundRect(60, 60, logoSize + 40, logoSize + 40, 25);
                  ctx.fill();
                  ctx.drawImage(logoImg, 80, 80, logoSize, logoSize);
                  resolve(null);
              };
              logoImg.onerror = () => resolve(null);
          });
      }

      // Draw Brand Text only if enabled
      if (showBrandText && brandName) {
          ctx.fillStyle = 'white';
          ctx.font = 'bold 30px Inter, sans-serif';
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 10;
          
          // If logo exists, draw text next to it, else draw in original top-left
          const textX = logoDataUri ? 220 : 80;
          const textY = logoDataUri ? 135 : 100;
          
          ctx.fillText(brandName.toUpperCase(), textX, textY);
          ctx.shadowBlur = 0;
      }

      if (onCanvasUpdate) {
        onCanvasUpdate(canvas.toDataURL('image/jpeg', 0.9));
      }
    };

    drawAd();
  }, [imageUrl, title, headline, price, qrUrl, brandName, logoDataUri, showBrandText, allowedPaymentMethods, width, height, onCanvasUpdate]);

  return <canvas ref={canvasRef} width={width} height={height} className="rounded-2xl shadow-2xl max-w-full h-auto border" />;
}
