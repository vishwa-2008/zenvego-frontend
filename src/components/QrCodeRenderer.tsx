import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QrCodeRendererProps {
  text: string;
  size?: number;
  className?: string;
  darkColor?: string;
  lightColor?: string;
}

export default function QrCodeRenderer({
  text,
  size = 180,
  className = "",
  darkColor = "#271810",
  lightColor = "#ffffff"
}: QrCodeRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        text,
        {
          width: size,
          margin: 1.5,
          color: {
            dark: darkColor,
            light: lightColor
          }
        },
        (error) => {
          if (error) {
            console.error('Error generating offline QR code:', error);
          }
        }
      );
    }
  }, [text, size, darkColor, lightColor]);

  return (
    <div className={`inline-flex items-center justify-center bg-white p-2.5 rounded-2xl border border-gray-100 shadow-inner ${className}`}>
      <canvas ref={canvasRef} style={{ width: size, height: size }} className="rounded-lg" />
    </div>
  );
}
