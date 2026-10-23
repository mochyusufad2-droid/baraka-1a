import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface CheckpointQrThumbnailProps {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
  darkColor?: string;
  lightColor?: string;
}

export const CheckpointQrThumbnail: React.FC<CheckpointQrThumbnailProps> = ({
  value,
  size = 120,
  className = '',
  alt = 'QR Code Checkpoint',
  darkColor = '#0b192c',
  lightColor = '#ffffff',
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    if (!value) {
      setDataUrl('');
      setLoading(false);
      return;
    }

    setLoading(true);
    QRCode.toDataURL(
      value,
      {
        width: size * 2, // 2x for sharp retina rendering
        margin: 1,
        color: {
          dark: darkColor,
          light: lightColor,
        },
      },
      (err, url) => {
        if (isMounted) {
          if (!err && url) {
            setDataUrl(url);
          }
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
    };
  }, [value, size, darkColor, lightColor]);

  if (loading || !dataUrl) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className={`bg-slate-100 flex items-center justify-center rounded-lg border border-slate-200 animate-pulse text-[10px] text-slate-400 ${className}`}
      >
        <span>Memuat QR...</span>
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={alt}
      width={size}
      height={size}
      className={`object-contain rounded-lg border border-slate-200 bg-white ${className}`}
      loading="lazy"
    />
  );
};
