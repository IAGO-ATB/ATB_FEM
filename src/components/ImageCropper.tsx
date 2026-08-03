import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
  aspect?: number;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ 
  image, 
  onCropComplete, 
  onCancel,
  aspect = 1
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteInternal = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async () => {
    try {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.src = image;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const maxSize = Math.max(img.width, img.height);
      const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

      canvas.width = safeArea;
      canvas.height = safeArea;

      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, safeArea, safeArea);

      ctx.translate(safeArea / 2, safeArea / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-safeArea / 2, -safeArea / 2);

      ctx.drawImage(
        img,
        safeArea / 2 - img.width * 0.5,
        safeArea / 2 - img.height * 0.5
      );

      const data = ctx.getImageData(0, 0, safeArea, safeArea);

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      // Fill final canvas with white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.putImageData(
        data,
        Math.round(0 - safeArea / 2 + img.width * 0.5 - croppedAreaPixels.x),
        Math.round(0 - safeArea / 2 + img.height * 0.5 - croppedAreaPixels.y)
      );

      onCropComplete(canvas.toDataURL('image/jpeg', 0.9));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[80vh] md:h-auto md:max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <h3 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Ajustar Imagen</h3>
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative flex-1 bg-slate-100 min-h-[300px]">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteInternal}
            onZoomChange={onZoomChange}
            cropShape="round"
            showGrid={false}
          />
        </div>

        <div className="p-6 bg-white space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <ZoomOut className="w-4 h-4 text-slate-400" />
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <ZoomIn className="w-4 h-4 text-slate-400" />
            </div>

            <div className="flex items-center gap-4">
              <RotateCw className="w-4 h-4 text-slate-400" />
              <input
                type="range"
                value={rotation}
                min={0}
                max={360}
                step={1}
                aria-labelledby="Rotation"
                onChange={(e) => setRotation(Number(e.target.value))}
                className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <span className="text-[10px] font-bold text-slate-400 w-8">{rotation}°</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              CANCELAR
            </button>
            <button
              onClick={createCroppedImage}
              className="flex-1 py-3 px-4 bg-sky-500 text-white rounded-xl font-bold text-sm hover:bg-sky-600 transition-colors shadow-lg shadow-sky-100 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              CONFIRMAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
