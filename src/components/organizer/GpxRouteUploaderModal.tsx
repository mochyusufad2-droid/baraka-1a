import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileCode, 
  MapPin, 
  CheckCircle2, 
  Sparkles, 
  TrendingUp, 
  Navigation, 
  Layers, 
  Trash2,
  Compass,
  AlertTriangle
} from 'lucide-react';
import { GPXRouteData, parseGPXString, generateSampleGPXContent } from '../../utils/gpxParser';
import { Checkpoint } from '../../types';

interface GpxRouteUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGpxData?: GPXRouteData;
  onSaveGpxRoute: (gpxData: GPXRouteData | undefined) => void;
  onCreateCheckpointsFromWaypoints?: (waypoints: Array<{ name: string; lat: number; lng: number; desc?: string }>) => void;
  onShowToast: (msg: string) => void;
}

export const GpxRouteUploaderModal: React.FC<GpxRouteUploaderModalProps> = ({
  isOpen,
  onClose,
  currentGpxData,
  onSaveGpxRoute,
  onCreateCheckpointsFromWaypoints,
  onShowToast,
}) => {
  const [parsedGpx, setParsedGpx] = useState<GPXRouteData | undefined>(currentGpxData);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.gpx') && !file.name.toLowerCase().endsWith('.xml')) {
      setErrorMessage('Harap pilih berkas dengan ekstensi .gpx atau .xml');
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);

    try {
      const text = await file.text();
      const result = parseGPXString(text, file.name);
      setParsedGpx(result);
      onShowToast(`✅ Berkas GPX "${file.name}" berhasil dianalisis: ${result.trackpoints.length} titik jalur ditemukan!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menguraikan berkas GPX.');
      onShowToast(`❌ Gagal membaca GPX: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleLoadSampleGpx = () => {
    setIsParsing(true);
    setErrorMessage(null);
    try {
      const sampleXml = generateSampleGPXContent();
      const result = parseGPXString(sampleXml, 'demo_gunung_pancar_10k.gpx');
      setParsedGpx(result);
      onShowToast('📍 Contoh rute GPX Gunung Pancar 10K berhasil dimuat!');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveRoute = () => {
    onSaveGpxRoute(parsedGpx);
    if (parsedGpx) {
      onShowToast(`🗺️ Overlay rute GPX "${parsedGpx.routeName}" berhasil dipasang di peta event!`);
    } else {
      onShowToast('Overlay rute GPX telah dihapus dari peta.');
    }
    onClose();
  };

  const handleConvertWaypointsToCheckpoints = () => {
    if (!parsedGpx || parsedGpx.waypoints.length === 0) {
      onShowToast('Tidak ada waypoint terdeteksi dalam berkas GPX ini.');
      return;
    }

    if (onCreateCheckpointsFromWaypoints) {
      onCreateCheckpointsFromWaypoints(parsedGpx.waypoints);
      onShowToast(`🚩 ${parsedGpx.waypoints.length} Waypoint GPX berhasil dikonversi menjadi Pos Checkpoint!`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <Navigation className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                Unggah & Parser Rute GPX
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold uppercase">
                  GPX Map Overlay
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Impor rute trek GPS Garmin / Strava (.gpx) untuk ditampilkan di atas peta lokasi event
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 text-xs">
          {/* File Drop Zone / Upload Area */}
          <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-3xl text-center space-y-3 transition-colors group relative">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl mx-auto flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <FileCode className="w-6 h-6" />
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">
                Pilih atau Geser Berkas Rute GPX (.gpx)
              </h4>
              <p className="text-slate-500 text-[11px] mt-1">
                Mendukung berkas GPX dari Strava, Garmin, Wikiloc, Komoot, & AllTrails
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <label className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold rounded-xl shadow-md shadow-blue-600/20 cursor-pointer transition-all flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Pilih Berkas GPX</span>
                <input 
                  type="file" 
                  accept=".gpx,.xml" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>

              <button
                type="button"
                onClick={handleLoadSampleGpx}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Uji Contoh Demo GPX (10K)</span>
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">
                {errorMessage}
              </div>
            </div>
          )}

          {/* Parsed Result Metrics Card */}
          {parsedGpx && (
            <div className="bg-[#0b192c] text-white p-5 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">
                      {parsedGpx.routeName}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Berkas: {parsedGpx.fileName}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setParsedGpx(undefined)}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                  title="Hapus rute terpilih"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center font-mono">
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-0.5">
                    Jarak Rute
                  </span>
                  <span className="font-extrabold text-amber-400 text-lg">
                    {parsedGpx.distanceKm} km
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-0.5">
                    Elevasi Naik
                  </span>
                  <span className="font-extrabold text-emerald-400 text-lg">
                    +{parsedGpx.elevationGainMeters} m
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-0.5">
                    Titik Jalur (Trk)
                  </span>
                  <span className="font-extrabold text-blue-400 text-lg">
                    {parsedGpx.trackpoints.length}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-0.5">
                    Waypoints (Wpt)
                  </span>
                  <span className="font-extrabold text-purple-400 text-lg">
                    {parsedGpx.waypoints.length}
                  </span>
                </div>
              </div>

              {/* Waypoint auto-conversion option */}
              {parsedGpx.waypoints.length > 0 && onCreateCheckpointsFromWaypoints && (
                <div className="p-3 bg-purple-950/60 border border-purple-500/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-xs text-purple-200">
                      Ditemukan <strong>{parsedGpx.waypoints.length} Waypoint GPX</strong> dalam file.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleConvertWaypointsToCheckpoints}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-[11px] cursor-pointer shrink-0 transition-colors"
                  >
                    + Konversi Ke Checkpoint Pos
                  </button>
                </div>
              )}

              {/* Coordinates Bounding Box summary */}
              <div className="text-[10px] text-slate-400 font-mono bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/80 flex flex-wrap justify-between gap-2">
                <span>📍 Barat-Selatan: [{parsedGpx.bounds.minLat.toFixed(4)}, {parsedGpx.bounds.minLng.toFixed(4)}]</span>
                <span>📍 Timur-Utara: [{parsedGpx.bounds.maxLat.toFixed(4)}, {parsedGpx.bounds.maxLng.toFixed(4)}]</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <div>
              {currentGpxData && (
                <button
                  type="button"
                  onClick={() => {
                    setParsedGpx(undefined);
                    onSaveGpxRoute(undefined);
                    onShowToast('Overlay rute GPX telah dihapus.');
                    onClose();
                  }}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Hapus Overlay Rute
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveRoute}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-extrabold shadow-lg shadow-blue-600/30 cursor-pointer transition-all active:scale-95 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-300" />
                <span>Simpan Overlay ke Peta Lomba</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
