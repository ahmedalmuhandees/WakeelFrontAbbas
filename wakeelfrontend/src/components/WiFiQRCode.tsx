import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface WiFiQRCodeProps {
  ssid: string;
  password: string;
  encryption: number;
  isHidden: boolean;
  size?: number;
  className?: string;
}

const WiFiQRCode: React.FC<WiFiQRCodeProps> = ({
  ssid,
  password,
  encryption,
  isHidden,
  size = 200,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateQRCode = async () => {
      if (!canvasRef.current) return;

      try {
        // إنشاء نص Wi‑Fi QR Code
        const wifiString = `WIFI:T:${encryption === 0 ? 'WPA' : encryption === 1 ? 'WEP' : 'nopass'};S:${ssid};P:${password};H:${isHidden ? 'true' : 'false'};;`;
        
        // توليد QR Code
        await QRCode.toCanvas(canvasRef.current, wifiString, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    generateQRCode();
  }, [ssid, password, encryption, isHidden, size]);

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      <canvas
        ref={canvasRef}
        className="border border-gray-300 dark:border-gray-600 rounded-lg"
      />
      <div className="text-center text-xs text-gray-600 dark:text-gray-400">
        <p className="font-medium">شبكة Wi‑Fi</p>
        <p className="truncate max-w-[200px]">{ssid}</p>
        {password && (
          <p className="text-gray-500">كلمة المرور: {password}</p>
        )}
      </div>
    </div>
  );
};

export default WiFiQRCode;
