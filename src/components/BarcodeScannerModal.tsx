import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertCircle, Sparkles, Check } from 'lucide-react';
import { Item } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  onScan: (itemId: string) => void;
  allowNewCode?: boolean;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  items,
  onScan,
  allowNewCode = false,
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // Start Camera
  useEffect(() => {
    if (!isOpen) return;

    setCameraError(null);
    setScanResult(null);
    setIsScanning(true);

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    })
      .then((mediaStream) => {
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      })
      .catch((err) => {
        console.error('Error accessing camera:', err);
        setCameraError(
          'لم نتمكن من تشغيل الكاميرا. يرجى التحقق من إعطاء الصلاحية للكاميرا، أو استخدم ميزة محاكاة القراءة السريعة بالأسفل.'
        );
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  // Handle native Barcode Detection if supported
  useEffect(() => {
    if (!isOpen || !stream || !videoRef.current || !isScanning) return;

    let active = true;
    const BarcodeDetectorClass = (window as any).BarcodeDetector;

    if (!BarcodeDetectorClass) {
      console.log('BarcodeDetector API not supported in this browser.');
      return;
    }

    const detector = new BarcodeDetectorClass({
      formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a'],
    });

    const scanInterval = setInterval(async () => {
      if (!active || !videoRef.current || !isScanning) return;

      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes && barcodes.length > 0) {
          const rawValue = barcodes[0].rawValue;
          // Look for matching item id (exact or partial)
          const matchedItem = items.find(
            (item) => item.id.toUpperCase() === rawValue.toUpperCase()
          );

          if (matchedItem) {
            clearInterval(scanInterval);
            handleSuccess(matchedItem.id);
          } else if (allowNewCode && rawValue) {
            clearInterval(scanInterval);
            handleSuccess(rawValue);
          }
        }
      } catch (err) {
        console.error('Barcode detection error:', err);
      }
    }, 400);

    return () => {
      active = false;
      clearInterval(scanInterval);
    };
  }, [isOpen, stream, isScanning, items]);

  const handleSuccess = (itemId: string) => {
    setScanResult(itemId);
    setIsScanning(false);
    // Play a lovely high pitch "beep" sound using Web Audio API
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // 1.2 kHz beep
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12); // Beep duration 120ms
    } catch (e) {
      console.log('Audio Context beep ignored', e);
    }

    // Success timeout then call onScan
    setTimeout(() => {
      onScan(itemId);
      onClose();
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col border border-slate-100">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-500/20 text-blue-400 p-2 rounded-xl">
              <Camera size={20} className="stroke-[2]" />
            </div>
            <div>
              <h3 className="font-bold text-sm">قارئ الرموز الشريطية (Barcode)</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">وجه الكاميرا نحو الرمز الشريطي للمنتج</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (stream) {
                stream.getTracks().forEach((track) => track.stop());
              }
              onClose();
            }}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video view and animation */}
        <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
          
          {cameraError ? (
            <div className="p-6 text-center text-slate-400 max-w-xs space-y-2">
              <AlertCircle size={32} className="mx-auto text-amber-500" />
              <p className="text-xs font-bold leading-relaxed">{cameraError}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {isScanning && (
                <>
                  {/* Neon laser animation */}
                  <div className="absolute inset-x-4 h-1 bg-blue-500 shadow-[0_0_15px_#3b82f6] animate-bounce top-1/4" />
                  
                  {/* Scanner overlay square */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-28 border-2 border-blue-500/60 rounded-xl relative">
                      {/* Bounding box corner elements */}
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-blue-500"></div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-blue-500"></div>
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-blue-500"></div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-blue-500"></div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Scanned Success Overlay */}
          {scanResult && (
            <div className="absolute inset-0 bg-blue-600/90 flex flex-col items-center justify-center text-white animate-fade-in">
              <div className="bg-white text-blue-600 p-4 rounded-full shadow-lg mb-2 scale-110 transition-transform animate-bounce">
                <Check size={28} className="stroke-[3]" />
              </div>
              <p className="text-sm font-black">تم التعرف على الصنف!</p>
              <p className="text-xs font-mono bg-blue-700/60 px-3 py-1 rounded-full mt-1.5 font-bold">{scanResult}</p>
            </div>
          )}
        </div>

        {/* Simulator Option - VERY ROBUST FOR PREVIEW/DEMO */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 text-right space-y-3">
          <div className="flex items-center gap-1.5 text-blue-600">
            <Sparkles size={14} className="stroke-[2.5]" />
            <span className="text-xs font-extrabold">
              {allowNewCode ? 'محاكي قراءة رمز شريطي جديد / عشوائي:' : 'محاكي المسح السريع للتجربة والمراجعة:'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            {allowNewCode 
              ? 'اضغط على أي كود بالأسفل لمحاكاة مسح رمز باركود جديد تماماً وتعبئته تلقائياً في النموذج:' 
              : 'اختر أي صنف من القائمة أدناه لمحاكاة قراءة الباركود فورياً وسرعة إدراجه في النموذج:'}
          </p>

          <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
            {allowNewCode ? (
              <>
                {[
                  { label: 'باركود سلعة 1', code: '6281047239102' },
                  { label: 'باركود سلعة 2', code: '6901234567892' },
                  { label: 'رمز صنف PRD-005', code: 'PRD-005' },
                  { label: 'كود تسلسلي SN-9988', code: 'SN-9988' },
                  { label: 'باركود عشوائي 1', code: 'EAN-889912' },
                  { label: 'باركود عشوائي 2', code: '628990123456' }
                ].map((mock, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuccess(mock.code)}
                    className="bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-[11px] font-bold p-2 rounded-xl transition-all text-right flex flex-col justify-between cursor-pointer shadow-2xs"
                  >
                    <span className="truncate block font-semibold">{mock.label}</span>
                    <span className="font-mono text-[9px] text-slate-400 block mt-0.5">{mock.code}</span>
                  </button>
                ))}
              </>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSuccess(item.id)}
                  className="bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-[11px] font-bold p-2 rounded-xl transition-all text-right flex flex-col justify-between cursor-pointer shadow-2xs"
                >
                  <span className="truncate block font-semibold">{item.name}</span>
                  <span className="font-mono text-[9px] text-slate-400 block mt-0.5">{item.id}</span>
                </button>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
