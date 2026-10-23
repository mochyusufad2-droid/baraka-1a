import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  X, 
  MapPin, 
  Search, 
  CheckCircle2, 
  Navigation, 
  Sparkles, 
  Compass, 
  Target,
  Crosshair,
  Layers
} from 'lucide-react';
import { Checkpoint } from '../../types';

interface MapLocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (coords: { lat: number; lng: number; locationName?: string }) => void;
  initialCoords?: { lat: number; lng: number };
  initialLocationName?: string;
  existingCheckpoints?: Checkpoint[];
  onShowToast: (msg: string) => void;
}

const PRESET_LOCATIONS = [
  { name: 'Taman Kencana, Bogor', lat: -6.5892, lng: 106.7972 },
  { name: 'Kebun Raya Bogor', lat: -6.5976, lng: 106.7996 },
  { name: 'Lembah Pinus, Gunung Pancar', lat: -6.6388, lng: 106.8864 },
  { name: 'Pos 2 Sektor Barat', lat: -6.6392, lng: 106.8872 },
  { name: 'Kawasan Telaga Warna, Puncak', lat: -6.7020, lng: 106.9985 },
  { name: 'Lapangan Utama Hutan Kota', lat: -6.6350, lng: 106.8820 },
  { name: 'Monumen Nasional, Jakarta', lat: -6.1754, lng: 106.8272 },
  { name: 'Dago Pakar, Bandung', lat: -6.8622, lng: 107.6255 }
];

export const MapLocationPickerModal: React.FC<MapLocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialCoords = { lat: -6.6388, lng: 106.8864 },
  initialLocationName = '',
  existingCheckpoints = [],
  onShowToast,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const selectedMarkerRef = useRef<L.Marker | null>(null);

  const [currentLat, setCurrentLat] = useState<number>(initialCoords.lat || -6.6388);
  const [currentLng, setCurrentLng] = useState<number>(initialCoords.lng || 106.8864);
  const [locationNameInput, setLocationNameInput] = useState<string>(initialLocationName || '');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (initialCoords) {
      setCurrentLat(initialCoords.lat);
      setCurrentLng(initialCoords.lng);
    }
    if (initialLocationName) {
      setLocationNameInput(initialLocationName);
    }
  }, [initialCoords, initialLocationName, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // Small delay for DOM layout render
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [currentLat, currentLng],
          zoom: 16,
          zoomControl: false
        });

        // OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Render existing checkpoints as background reference markers
        existingCheckpoints.forEach((cp) => {
          if (cp.coordinates && cp.coordinates.lat && cp.coordinates.lng) {
            const cpIcon = L.divIcon({
              className: 'custom-cp-bg-icon',
              html: `<div style="background-color: #0b192c; color: white; border: 2px solid #f97316; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">P${cp.number}</div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14]
            });

            const cpMarker = L.marker([cp.coordinates.lat, cp.coordinates.lng], { icon: cpIcon }).addTo(map);
            cpMarker.bindPopup(`
              <div style="font-family: sans-serif; padding: 2px;">
                <strong style="color: #0b192c;">${cp.name}</strong><br/>
                <span style="font-size: 11px; color: #64748b;">${cp.locationName || 'Checkin Pos'}</span><br/>
                <span style="font-size: 10px; color: #ea580c; font-weight: bold;">🌐 ${cp.coordinates.lat.toFixed(4)}, ${cp.coordinates.lng.toFixed(4)}</span>
              </div>
            `);
          }
        });

        // Draggable Selected Pin Marker
        const selectedPinIcon = L.divIcon({
          className: 'custom-picker-pin-icon',
          html: `<div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: 3px solid white; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 12px rgba(220,38,38,0.5); transform: translateY(-10px);">📍</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36]
        });

        const selectedMarker = L.marker([currentLat, currentLng], {
          icon: selectedPinIcon,
          draggable: true
        }).addTo(map);

        selectedMarkerRef.current = selectedMarker;

        selectedMarker.bindPopup(`
          <div style="font-family: sans-serif; text-align: center; padding: 2px;">
            <strong style="color: #dc2626;">📍 Titik Pos Baru yang Dipilih</strong><br/>
            <span style="font-size: 10px; color: #475569;">Geser pin ini ke lokasi manapun di peta</span>
          </div>
        `).openPopup();

        // On Marker Drag End
        selectedMarker.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          setCurrentLat(Number(newPos.lat.toFixed(6)));
          setCurrentLng(Number(newPos.lng.toFixed(6)));
          onShowToast(`📍 Koordinat baru dipilih dari geseran pin: ${newPos.lat.toFixed(5)}, ${newPos.lng.toFixed(5)}`);
        });

        // On Map Click
        map.on('click', (e: L.LeafletMouseEvent) => {
          const clickedLat = Number(e.latlng.lat.toFixed(6));
          const clickedLng = Number(e.latlng.lng.toFixed(6));
          setCurrentLat(clickedLat);
          setCurrentLng(clickedLng);
          selectedMarker.setLatLng([clickedLat, clickedLng]);
          map.panTo([clickedLat, clickedLng]);
          onShowToast(`📍 Titik pos ditempatkan di koordinat: ${clickedLat}, ${clickedLng}`);
        });

        mapInstanceRef.current = map;
      } else {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([currentLat, currentLng], 16);
        if (selectedMarkerRef.current) {
          selectedMarkerRef.current.setLatLng([currentLat, currentLng]);
        }
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Search Location Preset Handler
  const handleSelectPreset = (loc: typeof PRESET_LOCATIONS[0]) => {
    setCurrentLat(loc.lat);
    setCurrentLng(loc.lng);
    setLocationNameInput(loc.name);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([loc.lat, loc.lng], 16, { duration: 1.2 });
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.setLatLng([loc.lat, loc.lng]);
      }
    }
    onShowToast(`📍 Lokasi dipindahkan ke: ${loc.name}`);
  };

  // Submit Selected Coordinates
  const handleConfirmLocation = () => {
    onSelectLocation({
      lat: currentLat,
      lng: currentLng,
      locationName: locationNameInput.trim() || undefined,
    });
    onShowToast(`✅ Koordinat [${currentLat}, ${currentLng}] berhasil diterapkan pada pos!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full flex flex-col max-h-[92vh] shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#0b192c] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-slate-950 flex items-center justify-center font-extrabold shrink-0 shadow-md">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Penentu Lokasi Pos di Peta Interaktif</h3>
              <p className="text-xs text-slate-300">
                Klik titik mana saja di peta atau geser pin merah untuk menempatkan pos tanpa harus berada di lokasi fisik.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Main Map Container (Left/Top) */}
          <div className="relative flex-1 min-h-[350px] lg:min-h-[480px] bg-slate-100">
            <div ref={mapContainerRef} className="w-full h-full min-h-[350px] lg:min-h-[480px] z-10" />

            {/* Top Floating Helper Overlay */}
            <div className="absolute top-3 left-3 right-3 z-20 pointer-events-none flex items-center justify-center">
              <div className="bg-slate-900/90 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg border border-slate-700/80 backdrop-blur-md flex items-center gap-2 pointer-events-auto">
                <Target className="w-4 h-4 text-orange-400 animate-pulse" />
                <span>Klik peta atau drag pin merah ke lokasi pos pilihan Anda</span>
              </div>
            </div>
          </div>

          {/* Right Sidebar Location Controls (320px) */}
          <div className="w-full lg:w-80 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-4 space-y-4 overflow-y-auto shrink-0">
            {/* Coordinate Cards */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-rose-500" />
                  Koordinat GPS Dipilih:
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  REAL-TIME PIN
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-sans block">Latitude (Lintang):</span>
                  <input
                    type="number"
                    step="0.000001"
                    value={currentLat}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setCurrentLat(v);
                      if (mapInstanceRef.current && selectedMarkerRef.current) {
                        selectedMarkerRef.current.setLatLng([v, currentLng]);
                        mapInstanceRef.current.panTo([v, currentLng]);
                      }
                    }}
                    className="w-full bg-transparent font-extrabold text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-sans block">Longitude (Bujur):</span>
                  <input
                    type="number"
                    step="0.000001"
                    value={currentLng}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setCurrentLng(v);
                      if (mapInstanceRef.current && selectedMarkerRef.current) {
                        selectedMarkerRef.current.setLatLng([currentLat, v]);
                        mapInstanceRef.current.panTo([currentLat, v]);
                      }
                    }}
                    className="w-full bg-transparent font-extrabold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Location Name Field */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-bold text-slate-700">Nama Patokan / Area Pos:</label>
                <input
                  type="text"
                  placeholder="Contoh: Sektor Barat Gazebo, Taman Kencana..."
                  value={locationNameInput}
                  onChange={(e) => setLocationNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Quick Location Presets */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5 shadow-xs">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-orange-500" />
                Pilih Lokasi Cepat / Preset:
              </span>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {PRESET_LOCATIONS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-200 transition-colors text-xs flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-bold text-slate-800 truncate">{preset.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                      {preset.lat.toFixed(2)}, {preset.lng.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Confirm Actions */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleConfirmLocation}
                className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-slate-950 font-extrabold rounded-xl text-xs sm:text-sm shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
              >
                <CheckCircle2 className="w-4.5 h-4.5" />
                <span>Gunakan Koordinat Ini untuk Pos</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
