'use client';

import { useState } from 'react';
import { CldUploadWidget, CldImage } from 'next-cloudinary';
import { Camera, CheckCircle2, Loader2, RefreshCw, Sparkles, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ZuccalandPhotoClient() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<string>('Canvas-27');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSuccess = (result: any) => {
    setImageUrl(result.info.secure_url);
    setPublicId(result.info.public_id);
  };

  const handleSubmit = async () => {
    if (!publicId) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/zuccaland/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId, frameName: selectedFrame }),
      });

      if (response.ok) {
        setIsSuccess(true);
      } else {
        alert('Si è verificato un errore durante l\'invio. Riprova.');
      }
    } catch (error) {
      console.error(error);
      alert('Si è verificato un errore di rete.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] overflow-hidden text-white flex flex-col font-sans selection:bg-orange-500/30">
      
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-orange-600/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-md mx-auto w-full px-6 py-12 flex flex-col min-h-screen">
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center space-x-2 bg-orange-500/10 border border-orange-500/30 px-4 py-1.5 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-semibold text-orange-300 uppercase tracking-widest">Magic Cam</span>
          </div>
          <h1 className="text-5xl font-extrabold font-zuccaland bg-gradient-to-br from-orange-400 to-orange-600 text-transparent bg-clip-text tracking-wider drop-shadow-sm">
            Zuccaland
          </h1>
          <p className="text-gray-400 mt-3 text-sm font-medium">Scatta, incornicia e condividi la magia!</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center mt-10"
            >
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 ring-4 ring-green-500/30 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                <CheckCircle2 className="w-12 h-12 text-green-400" />
              </div>
              <h2 className="text-3xl font-bold mb-3 text-white">Foto Inviata!</h2>
              <p className="text-gray-400 mb-10 max-w-[280px] leading-relaxed">
                Perfetto! La tua foto è stata inviata e sarà presto visibile nel grande album magico.
              </p>
              <button 
                onClick={() => {
                  setImageUrl(null);
                  setPublicId(null);
                  setIsSuccess(false);
                }}
                className="group relative px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-white transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-purple-600 opacity-0 group-hover:opacity-20 transition-opacity" />
                <span className="relative flex items-center gap-2">
                  <Camera className="w-5 h-5" /> Scattane un'altra
                </span>
              </button>
            </motion.div>
          ) : !imageUrl ? (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col items-center justify-center mb-20"
            >
              <CldUploadWidget 
                uploadPreset="ml_default" // <-- ASSICURATI DI AVERE QUESTO PRESET SU CLOUDINARY
                onSuccess={handleSuccess}
                options={{
                  sources: ['local', 'camera'],
                  multiple: false,
                  cropping: true,
                  croppingAspectRatio: 1, 
                  clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
                  maxFiles: 1,
                  styles: {
                    palette: {
                      window: "#000000",
                      windowBorder: "#EA580C",
                      tabIcon: "#EA580C",
                      menuIcons: "#FFFFFF",
                      textDark: "#000000",
                      textLight: "#FFFFFF",
                      link: "#EA580C",
                      action: "#EA580C",
                      inactiveTabIcon: "#9CA3AF",
                      error: "#EF4444",
                      inProgress: "#EA580C",
                      complete: "#22C55E",
                      sourceBg: "#0A0A0A"
                    }
                  }
                }}
              >
                {({ open }) => (
                  <button 
                    onClick={() => open()}
                    className="group relative w-full aspect-[4/5] max-h-[500px] rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 flex flex-col items-center justify-center p-8 transition-all hover:border-orange-500/50 hover:shadow-[0_0_50px_rgba(234,88,12,0.15)] overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 ease-out">
                      <Camera className="w-10 h-10 text-orange-400" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-2">Tocca per iniziare</h3>
                    <p className="text-gray-400 text-sm text-center max-w-[200px]">
                      Usa la fotocamera o scegli dalla tua galleria
                    </p>
                  </button>
                )}
              </CldUploadWidget>
            </motion.div>
          ) : (
            <motion.div 
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col"
            >
              {/* Image Preview Area */}
              <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10 mb-8">
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                   <Loader2 className="w-8 h-8 animate-spin opacity-50" />
                </div>
                <div className="relative z-10 w-full h-full animate-fade-in">
                  <CldImage
                    src={publicId!}
                    width="1000"
                    height="1000"
                    crop="fill"
                    alt="La tua foto"
                    sizes="(max-width: 768px) 100vw, 800px"
                    className="w-full h-full object-cover"
                    overlays={[{
                      publicId: selectedFrame,
                      flags: ['relative'],
                      width: '1.0',
                      height: '1.0',
                    }]}
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                <div className="mb-6">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 pl-1">Scegli la Cornice</p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setSelectedFrame('Canvas-27')}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${selectedFrame === 'Canvas-27' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                    >
                      <ImageIcon className="w-4 h-4" /> Tipo 1
                    </button>
                    <button 
                      onClick={() => setSelectedFrame('Canvas-28')}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${selectedFrame === 'Canvas-28' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                    >
                      <ImageIcon className="w-4 h-4" /> Tipo 2
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2 border-t border-white/10">
                  <button 
                    onClick={() => {
                      setImageUrl(null);
                      setPublicId(null);
                    }}
                    className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
                    aria-label="Scatta di nuovo"
                  >
                    <RefreshCw className="w-6 h-6" />
                  </button>
                  
                  <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:opacity-50 text-white font-bold rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg shadow-orange-500/20"
                  >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Pubblica la Foto'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
