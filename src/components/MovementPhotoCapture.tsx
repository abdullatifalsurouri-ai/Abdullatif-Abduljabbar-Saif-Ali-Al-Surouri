import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Trash2, Upload, Video, AlertCircle } from 'lucide-react';

interface MovementPhotoCaptureProps {
  photo: string;
  onChange: (photoBase64: string) => void;
}

export default function MovementPhotoCapture({ photo, onChange }: MovementPhotoCaptureProps) {
  const [isActive, setIsActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start the video stream
  const startCamera = async () => {
    setCameraError(null);
    setIsActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      setCameraError('تعذر الوصول إلى الكاميرا. يرجى التحقق من الأذونات أو رفع ملف.');
      setIsActive(false);
    }
  };

  // Stop the video stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
  };

  // Capture frame from video stream
  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Get base64 string
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        onChange(base64);
        stopCamera();
      }
    }
  };

  // Handle local image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onChange(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="space-y-3" dir="rtl">
      {photo ? (
        /* Image Preview State */
        <div className="relative border-2 border-slate-100 rounded-2xl overflow-hidden aspect-video bg-slate-100 group">
          <img src={photo} alt="Item piece" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
            <button
              type="button"
              onClick={() => onChange('')}
              className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer hover:scale-105 active:scale-95 shadow-lg"
            >
              <Trash2 size={16} />
              <span>إزالة الصورة</span>
            </button>
          </div>
        </div>
      ) : isActive ? (
        /* Camera Active Streaming State */
        <div className="relative border-2 border-blue-500 rounded-2xl overflow-hidden aspect-video bg-black flex flex-col justify-end">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Controls overlay */}
          <div className="relative z-10 p-3 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={capturePhoto}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Camera size={16} />
              <span>التقاط الصورة الآن</span>
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        /* Default State - Choice to use Camera or Upload */
        <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-center gap-3 bg-slate-50/50 hover:bg-blue-50/20 transition-all text-center">
          <button
            type="button"
            onClick={startCamera}
            className="flex-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs w-full sm:w-auto"
          >
            <div className="bg-blue-100 text-blue-600 p-2.5 rounded-full">
              <Camera size={18} className="stroke-[2.5]" />
            </div>
            <span className="text-xs font-black">التقاط من الكاميرا</span>
            <span className="text-[10px] text-slate-400">التقاط فوري لصورة القطعة</span>
          </button>

          <label className="flex-1 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-slate-700 hover:text-purple-700 p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs w-full sm:w-auto">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="bg-purple-100 text-purple-600 p-2.5 rounded-full">
              <Upload size={18} className="stroke-[2.5]" />
            </div>
            <span className="text-xs font-black">رفع ملف صورة</span>
            <span className="text-[10px] text-slate-400">اختر صورة مخزنة مسبقاً</span>
          </label>
        </div>
      )}

      {cameraError && (
        <div className="text-[11px] text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-100 flex items-center gap-1.5">
          <AlertCircle size={14} className="shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}
    </div>
  );
}
