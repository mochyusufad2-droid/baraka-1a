import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, 
  MapPin, 
  Navigation, 
  RotateCw, 
  Layers, 
  Flag, 
  Eye, 
  Sparkles,
  Mountain,
  Crosshair,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Target,
  Route,
  CheckCircle2,
  Clock,
  Info,
  ChevronRight,
  Map as MapIcon
} from 'lucide-react';
import L from 'leaflet';
import { Checkpoint, Team } from '../../types';

interface InteractiveCompassMapProps {
  checkpoints: Checkpoint[];
  currentTeam: Team;
  onSelectCheckpoint: (cp: Checkpoint) => void;
  showDigitalMap?: boolean;
}

// Distance calculation using Haversine formula
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Bearing angle calculation (0 - 360 deg)
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const λ1 = (lon1 * Math.PI) / 180;
  const λ2 = (lon2 * Math.PI) / 180;

  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  const θ = Math.atan2(y, x);
  return Math.round(((θ * 180) / Math.PI + 360) % 360);
}

function getCompassDirectionName(deg: number) {
  if (deg >= 337.5 || deg < 22.5) return 'Utara (U)';
  if (deg >= 22.5 && deg < 67.5) return 'Timur Laut (TL)';
  if (deg >= 67.5 && deg < 112.5) return 'Timur (T)';
  if (deg >= 112.5 && deg < 157.5) return 'Tenggara (TG)';
  if (deg >= 157.5 && deg < 202.5) return 'Selatan (S)';
  if (deg >= 202.5 && deg < 247.5) return 'Barat Daya (BD)';
  if (deg >= 247.5 && deg < 292.5) return 'Barat (B)';
  return 'Barat Laut (BL)';
}

export const InteractiveCompassMap: React.FC<InteractiveCompassMapProps> = ({
  checkpoints,
  currentTeam,
  onSelectCheckpoint,
  showDigitalMap = true,
}) => {
  const [viewMode, setViewMode] = useState<'map' | 'compass'>('map');
  const [mapTileStyle, setMapTileStyle] = useState<'osm' | 'topo' | 'satellite'>('osm');
  const [showRouteLine, setShowRouteLine] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Selected Checkpoint
  const activeCheckpointIndex = Math.min(currentTeam.checkpointsCompleted, Math.max(0, checkpoints.length - 1));
  const currentTargetCp = checkpoints[activeCheckpointIndex] || checkpoints[0];
  const [selectedMapCp, setSelectedMapCp] = useState<Checkpoint>(currentTargetCp);

  // Simulated / Live User Location
  // Default near checkpoint 1 or current target
  const defaultUserLat = currentTargetCp?.coordinates?.lat 
    ? currentTargetCp.coordinates.lat - 0.0012 
    : -6.6345;
  const defaultUserLng = currentTargetCp?.coordinates?.lng 
    ? currentTargetCp.coordinates.lng - 0.0015 
    : 106.8815;

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: defaultUserLat,
    lng: defaultUserLng,
  });

  // Dynamic calculated distance and bearing
  const distanceToTarget = selectedMapCp?.coordinates 
    ? calculateDistanceMeters(userLocation.lat, userLocation.lng, selectedMapCp.coordinates.lat, selectedMapCp.coordinates.lng)
    : 320;

  const bearingToTarget = selectedMapCp?.coordinates
    ? calculateBearing(userLocation.lat, userLocation.lng, selectedMapCp.coordinates.lat, selectedMapCp.coordinates.lng)
    : 135;

  // Compass state
  const [compassHeading, setCompassHeading] = useState<number>(bearingToTarget);
  const [isLiveHeadingActive, setIsLiveHeadingActive] = useState<boolean>(false);
  const [deviceAlpha, setDeviceAlpha] = useState<number | null>(null);

  // DeviceOrientation API Handler
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      // webkitCompassHeading is available on iOS (Safari), alpha is available on Android/others
      let heading: number | null = null;
      // @ts-ignore
      if (typeof event.webkitCompassHeading === 'number' && !isNaN(event.webkitCompassHeading)) {
        // @ts-ignore
        heading = event.webkitCompassHeading;
      } else if (typeof event.alpha === 'number' && !isNaN(event.alpha)) {
        // On standard Android, alpha is 0-360 counter-clockwise or clockwise depending on device orientation
        heading = (360 - event.alpha) % 360;
      }

      if (heading !== null) {
        setDeviceAlpha(Math.round(heading));
        if (isLiveHeadingActive) {
          setCompassHeading(Math.round(heading));
        }
      }
    };

    if (isLiveHeadingActive) {
      // Request permission for iOS 13+ if needed
      // @ts-ignore
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        // @ts-ignore
        DeviceOrientationEvent.requestPermission()
          .then((response: string) => {
            if (response === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation, true);
            } else {
              setIsLiveHeadingActive(false);
            }
          })
          .catch(() => setIsLiveHeadingActive(false));
      } else {
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [isLiveHeadingActive]);

  const toggleLiveHeading = async () => {
    if (!isLiveHeadingActive) {
      // @ts-ignore
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          // @ts-ignore
          const res = await DeviceOrientationEvent.requestPermission();
          if (res === 'granted') {
            setIsLiveHeadingActive(true);
          } else {
            alert('Izin sensor orientasi perangkat ditolak.');
          }
        } catch {
          setIsLiveHeadingActive(true);
        }
      } else {
        setIsLiveHeadingActive(true);
      }
    } else {
      setIsLiveHeadingActive(false);
    }
  };

  // Leaflet map container & instance refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!showDigitalMap || !mapContainerRef.current) return;

    // Center coordinates
    const initialLat = currentTargetCp?.coordinates?.lat || -6.6341;
    const initialLng = currentTargetCp?.coordinates?.lng || 106.8821;

    // Create Leaflet instance if not created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 16,
        zoomControl: false, // Custom styled zoom controls
        attributionControl: false,
      });

      // Attribution small text at corner
      L.control.attribution({ position: 'bottomright', prefix: '© OpenStreetMap' }).addTo(map);

      mapInstanceRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);
    }

    const map = mapInstanceRef.current;

    // Tile Layer Setup
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let tileMaxZoom = 19;

    if (mapTileStyle === 'topo') {
      tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      tileMaxZoom = 17;
    } else if (mapTileStyle === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      tileMaxZoom = 18;
    }

    const newTileLayer = L.tileLayer(tileUrl, {
      maxZoom: tileMaxZoom,
      subdomains: mapTileStyle === 'topo' ? ['a', 'b', 'c'] : ['a', 'b', 'c'],
    }).addTo(map);

    tileLayerRef.current = newTileLayer;

    // Clear old markers
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
    }

    // Coordinates array for route polyline and map bounds
    const routeCoords: [number, number][] = [];
    const bounds = L.latLngBounds([]);

    // 1. Plot Checkpoint Markers
    checkpoints.forEach((cp, idx) => {
      const lat = cp.coordinates?.lat || initialLat + (idx * 0.002);
      const lng = cp.coordinates?.lng || initialLng + (idx * 0.0025);
      routeCoords.push([lat, lng]);
      bounds.extend([lat, lng]);

      const isCompleted = idx < currentTeam.checkpointsCompleted;
      const isCurrent = idx === currentTeam.checkpointsCompleted;
      const isSelected = selectedMapCp.id === cp.id;

      // Custom divIcon marker with rich styling
      const markerHtml = `
        <div class="relative group cursor-pointer transition-transform duration-200 ${isSelected ? 'scale-125 z-50' : 'z-20 hover:scale-110'}">
          ${isCurrent ? '<div class="absolute -inset-1.5 rounded-full bg-orange-500/40 animate-ping"></div>' : ''}
          <div class="w-8 h-8 rounded-2xl flex items-center justify-center font-extrabold text-xs shadow-lg border-2 ${
            isCompleted
              ? 'bg-emerald-600 text-white border-white ring-2 ring-emerald-400'
              : isCurrent
              ? 'bg-gradient-to-tr from-orange-600 to-amber-500 text-white border-white ring-4 ring-orange-400/60'
              : 'bg-slate-900 text-slate-200 border-slate-700'
          }">
            ${isCompleted ? '✓' : cp.number}
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-bold shadow-md ${
            isCurrent
              ? 'bg-orange-600 text-white'
              : 'bg-slate-900/90 text-slate-200 border border-slate-700'
          }">
            Pos ${cp.number}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-cp-marker',
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      marker.on('click', () => {
        setSelectedMapCp(cp);
        onSelectCheckpoint(cp);
        const newBearing = calculateBearing(userLocation.lat, userLocation.lng, lat, lng);
        setCompassHeading(newBearing);
      });

      markersLayerRef.current?.addLayer(marker);
    });

    // 2. Plot User's Simulated / Real Position Marker
    const userMarkerHtml = `
      <div class="relative flex items-center justify-center">
        <div class="w-8 h-8 rounded-full bg-blue-500/25 animate-ping absolute"></div>
        <div class="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-blue-400">
          📍
        </div>
        <div class="absolute -bottom-4.5 bg-blue-900/90 text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow whitespace-nowrap">
          Regu Anda
        </div>
      </div>
    `;

    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: userMarkerHtml,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
    }

    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(map);
    bounds.extend([userLocation.lat, userLocation.lng]);

    // 3. Plot Trail Polyline Route
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
    }

    if (showRouteLine && routeCoords.length > 1) {
      routeLayerRef.current = L.polyline(routeCoords, {
        color: '#f97316',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '6, 8',
      }).addTo(map);
    }

    // Auto fit bounds on initial mount
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    // Cleanup on unmount
    return () => {
      // Keep map reference for hot renders or cleanup
    };
  }, [showDigitalMap, checkpoints, currentTeam.checkpointsCompleted, selectedMapCp.id, mapTileStyle, showRouteLine, userLocation]);

  // IF DIGITAL MAP IS DISABLED BY ORGANIZER -> RENDER PRINTED PAPER MAP GUIDANCE VIEW
  if (!showDigitalMap) {
    return (
      <div className="space-y-4">
        {/* Banner Mode Peta Cetak Fisik */}
        <div className="bg-gradient-to-r from-[#0b192c] via-slate-900 to-amber-950 text-white p-4 sm:p-5 rounded-3xl border border-amber-500/40 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-md shrink-0">
                📄
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    Mode Peta Cetak Fisik Aktif
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/30 text-amber-300 border border-amber-500/40 uppercase">
                    Peta Kertas & Kompas
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Panitia telah menetapkan bahwa event ini menggunakan <strong>Peta Kertas Cetak & Kompas Fisik</strong>. Peta GPS digital di layar HP disembunyikan.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-2xl border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed flex items-start gap-2">
            <Compass className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <span>
              Gunakan lembaran <strong>Peta Fisik & Kompas Lapangan</strong> yang dibagikan oleh panitia saat registrasi/start untuk melakukan navigasi dan pembacaan sudut azimuth menuju pos-pos rute.
            </span>
          </div>
        </div>

        {/* Dynamic Digital Compass Sensor Tool for Printed Map Navigation */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-orange-600 animate-spin-slow" />
              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                Sensor Kompas Magnetik HP (Bantuan Peta Cetak)
              </h4>
            </div>
            <button
              type="button"
              onClick={toggleLiveHeading}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                isLiveHeadingActive
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLiveHeadingActive ? 'animate-spin' : ''}`} />
              <span>{isLiveHeadingActive ? 'Sensor Live ON' : 'Aktifkan Sensor HP'}</span>
            </button>
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sudut Arah Magnetik HP Anda</div>
              <div className="font-mono font-extrabold text-2xl text-orange-400">
                {compassHeading}° ({getCompassDirectionName(compassHeading)})
              </div>
              <p className="text-[11px] text-slate-400">
                Pegang HP secara mendatar searah dengan jarum kompas pada lembaran peta cetak fisik Anda.
              </p>
            </div>

            <div className="relative w-20 h-20 rounded-full border-2 border-orange-500/50 bg-slate-950 flex items-center justify-center shrink-0 shadow-inner">
              <div 
                className="w-1.5 h-12 bg-gradient-to-b from-red-500 via-white to-slate-600 rounded-full transition-transform duration-200"
                style={{ transform: `rotate(${compassHeading}deg)` }}
              />
              <div className="absolute top-1 text-[9px] font-black text-red-500">U</div>
            </div>
          </div>
        </div>

        {/* Checkpoint Clue & Landmark List for Printed Map */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500" />
              <span>Daftar Patokan & Clue Rute Pos ({checkpoints.length} Pos):</span>
            </h4>
            <span className="text-[10px] bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-extrabold border border-amber-300">
              Navigasi Peta Kertas
            </span>
          </div>

          <div className="space-y-3">
            {checkpoints.map((cp, idx) => {
              const isDone = idx < currentTeam.checkpointsCompleted;
              const isCurrent = idx === currentTeam.checkpointsCompleted;

              return (
                <div
                  key={`${cp.id}-${idx}`}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isDone 
                      ? 'bg-emerald-50/70 border-emerald-200' 
                      : isCurrent 
                      ? 'bg-white border-orange-400 shadow-md ring-2 ring-orange-400/20' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 ${
                        isDone ? 'bg-emerald-600 text-white' : isCurrent ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {cp.number}
                      </span>
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{cp.name}</span>
                          {isDone && <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-bold">Selesai</span>}
                          {isCurrent && <span className="text-[10px] text-orange-700 bg-orange-100 px-1.5 py-0.2 rounded font-bold">Pos Dituju</span>}
                        </div>
                        {cp.locationName && (
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-orange-500" />
                            <span>Patokan: {cp.locationName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <span className="font-mono text-xs font-bold text-orange-600 shrink-0">
                      +{cp.points} Pts
                    </span>
                  </div>

                  {/* Clue & Azimuth hint for paper map navigation */}
                  <div className="mt-2 pt-2 border-t border-slate-200/80 space-y-2 text-[11px]">
                    <div className="text-slate-700 italic bg-white/80 p-2 rounded-xl border border-slate-200">
                      {cp.clue ? `"${cp.clue}"` : <span className="text-slate-400 not-italic">(Gunakan patokan fisik pada peta cetak)</span>}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        📍 Area: {cp.locationName || 'Sektor Rute Lomba'}
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectCheckpoint(cp)}
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-slate-950 font-extrabold rounded-xl text-[10px] cursor-pointer transition-colors shadow-2xs"
                      >
                        Scan / Check-in Pos #{cp.number}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Rotate Compass
  const rotateCompass = (delta: number) => {
    setCompassHeading((prev) => (prev + delta + 360) % 360);
  };

  // Zoom handlers
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  // Center on User Location
  const handleCenterUser = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 17, { animate: true });
    }
  };

  // Fit all checkpoints in viewport
  const handleFitAll = () => {
    if (!mapInstanceRef.current || checkpoints.length === 0) return;
    const bounds = L.latLngBounds([]);
    checkpoints.forEach((cp) => {
      if (cp.coordinates) bounds.extend([cp.coordinates.lat, cp.coordinates.lng]);
    });
    bounds.extend([userLocation.lat, userLocation.lng]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [35, 35] });
  };

  // Move user closer to selected checkpoint (Simulasi pergerakan tim)
  const handleSimulateWalkCloser = () => {
    if (!selectedMapCp?.coordinates) return;
    const newLat = userLocation.lat + (selectedMapCp.coordinates.lat - userLocation.lat) * 0.45;
    const newLng = userLocation.lng + (selectedMapCp.coordinates.lng - userLocation.lng) * 0.45;
    setUserLocation({ lat: newLat, lng: newLng });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([newLat, newLng], 17, { animate: true });
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Top Mode Switcher Bar */}
      <div className="flex items-center justify-between bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs shadow-sm">
        <button
          type="button"
          onClick={() => setViewMode('map')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            viewMode === 'map' 
              ? 'bg-orange-500 text-slate-950 shadow-md font-extrabold' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MapIcon className="w-4 h-4" />
          <span>Peta Interaktif & Marker</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('compass')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            viewMode === 'compass' 
              ? 'bg-orange-500 text-slate-950 shadow-md font-extrabold' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Kompas & Azimuth ({bearingToTarget}°)</span>
        </button>
      </div>

      {/* ========================================================
          VIEW 1: PETA INTERAKTIF DENGAN MARKER POS & JALUR RUTE
          ======================================================== */}
      {viewMode === 'map' && (
        <div className="space-y-3">
          {/* Main Map Box */}
          <div className={`relative bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden shadow-xl transition-all ${
            isFullscreen ? 'fixed inset-4 z-50 max-w-none' : 'w-full'
          }`}>
            {/* Top Overlay Header over Map */}
            <div className="absolute top-3 left-3 right-3 z-[400] flex items-center justify-between pointer-events-none gap-2">
              <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-white flex items-center gap-2 pointer-events-auto shadow-md">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[11px] font-extrabold text-orange-400 font-mono">
                  {checkpoints.length} MARKER POS TERSEBAR
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">| GPS Live Sync</span>
              </div>

              {/* Layer Style Selector Buttons */}
              <div className="flex items-center gap-1 bg-slate-950/85 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 pointer-events-auto shadow-md">
                <button
                  type="button"
                  onClick={() => setMapTileStyle('osm')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                    mapTileStyle === 'osm' ? 'bg-orange-500 text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                  title="Peta Jalan Terbuka"
                >
                  Jalan
                </button>
                <button
                  type="button"
                  onClick={() => setMapTileStyle('topo')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                    mapTileStyle === 'topo' ? 'bg-orange-500 text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                  title="Peta Topografi & Kontur"
                >
                  Topografi
                </button>
                <button
                  type="button"
                  onClick={() => setMapTileStyle('satellite')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                    mapTileStyle === 'satellite' ? 'bg-orange-500 text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                  title="Peta Satelit"
                >
                  Satelit
                </button>
              </div>
            </div>

            {/* Leaflet Map Canvas Container */}
            <div 
              ref={mapContainerRef} 
              className={`w-full bg-[#0a192f] transition-all ${isFullscreen ? 'h-[calc(100vh-140px)]' : 'h-72 sm:h-80'}`}
              style={{ zIndex: 1 }}
            />

            {/* In-Map Floating Action Buttons (Right Bottom) */}
            <div className="absolute right-3 bottom-3 z-[400] flex flex-col gap-1.5 shadow-lg">
              <button
                type="button"
                onClick={handleZoomIn}
                className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                title="Perbesar Peta"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                title="Perkecil Peta"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCenterUser}
                className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                title="Pusatkan ke Posisi Tim Saya"
              >
                <Target className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleFitAll}
                className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-orange-400 border border-slate-700 flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                title="Tampilkan Seluruh Pos di Layar"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Overlay Compass Component utilizing DeviceOrientation API */}
            <div className="absolute top-14 left-3 z-[400] bg-slate-950/90 backdrop-blur-md p-2 rounded-2xl border border-slate-700/80 shadow-xl flex items-center gap-2.5 pointer-events-auto">
              <div 
                className="w-10 h-10 rounded-full bg-slate-900 border-2 border-orange-500/80 flex items-center justify-center relative shadow-inner cursor-pointer"
                onClick={toggleLiveHeading}
                title="Klik untuk Toggle Sensor Kompas Perangkat (DeviceOrientation)"
                style={{ transform: `rotate(${-compassHeading}deg)`, transition: 'transform 0.2s ease-out' }}
              >
                <span className="absolute top-0.5 text-[10px] font-black text-red-500">N</span>
                <div className="w-0.5 h-6 bg-red-500 absolute"></div>
                <div className="w-2 h-2 rounded-full bg-white z-10"></div>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-white">Kompas Sensor</span>
                  <button
                    type="button"
                    onClick={toggleLiveHeading}
                    className={`text-[8px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                      isLiveHeadingActive ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {isLiveHeadingActive ? 'LIVE ON' : 'OFF'}
                  </button>
                </div>
                <div className="text-[11px] font-mono font-extrabold text-orange-400">
                  {compassHeading}° ({getCompassDirectionName(compassHeading).split(' ')[0]})
                </div>
              </div>
            </div>

            {/* In-Map Floating Legend Bar (Left Bottom) */}
            <div className="absolute left-3 bottom-3 z-[400] bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-700 text-[10px] text-white flex items-center gap-2.5 shadow-md">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Tuntas</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></span>
                <span>Pos Aktif</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
                <span>Terkunci</span>
              </span>
              <button
                type="button"
                onClick={() => setShowRouteLine(!showRouteLine)}
                className={`text-[9px] px-1.5 py-0.5 rounded font-bold border transition-colors cursor-pointer ${
                  showRouteLine ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {showRouteLine ? 'Jalur: On' : 'Jalur: Off'}
              </button>
            </div>
          </div>

          {/* Selected Checkpoint Detail Card with Distance & Bearing Navigation */}
          {selectedMapCp && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-extrabold text-sm shrink-0">
                    #{selectedMapCp.number}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        {selectedMapCp.name}
                      </h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-100 text-orange-800">
                        +{selectedMapCp.points} Pts
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                      <span>{selectedMapCp.locationName || 'Area Terbuka'}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectCheckpoint(selectedMapCp)}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-slate-950 font-extrabold rounded-xl text-xs shrink-0 cursor-pointer shadow-xs transition-colors"
                >
                  Pilih Pos Ini
                </button>
              </div>

              {/* Navigation Telemetry Cards: Distance, Bearing & Clue */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {/* Distance Card */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Jarak dari Regu
                  </span>
                  <div className="font-mono font-extrabold text-sm text-slate-900 flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    <span>~{distanceToTarget} Meter</span>
                  </div>
                </div>

                {/* Bearing Direction Card */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Arah Azimuth Kompas
                  </span>
                  <div className="font-mono font-extrabold text-sm text-orange-600 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-orange-500" />
                    <span>{bearingToTarget}° {getCompassDirectionName(bearingToTarget).split(' ')[0]}</span>
                  </div>
                </div>

                {/* Walking Estimate Card */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Estimasi Jalan Kaki
                  </span>
                  <div className="font-mono font-extrabold text-sm text-emerald-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>~{Math.max(1, Math.round(distanceToTarget / 80))} Menit</span>
                  </div>
                </div>
              </div>

              {/* Clue Prompt */}
              {selectedMapCp.clue && (
                <div className="p-2.5 bg-orange-50/70 border border-orange-200 rounded-xl text-[11px] text-slate-700 italic">
                  <strong>Clue Pos #{selectedMapCp.number}:</strong> "{selectedMapCp.clue}"
                </div>
              )}

              {/* Quick Walk Closer Simulator (Demo Assistant) */}
              <div className="pt-1 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={handleSimulateWalkCloser}
                  className="text-orange-600 hover:text-orange-700 font-bold underline cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  <span>Simulasi Berjalan Mendekati Pos Ini (-45% jarak)</span>
                </button>
                <span className="text-slate-400 font-mono text-[10px]">
                  Koordinat: {selectedMapCp.coordinates?.lat?.toFixed(4)}, {selectedMapCp.coordinates?.lng?.toFixed(4)}
                </span>
              </div>
            </div>
          )}

          {/* Quick Marker Selector Chips */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Pusatkan Marker Pos di Peta:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {checkpoints.map((cp, idx) => {
                const isCompleted = idx < currentTeam.checkpointsCompleted;
                const isSelected = selectedMapCp.id === cp.id;
                return (
                  <button
                    key={`${cp.id}-${idx}`}
                    type="button"
                    onClick={() => {
                      setSelectedMapCp(cp);
                      onSelectCheckpoint(cp);
                      if (mapInstanceRef.current && cp.coordinates) {
                        mapInstanceRef.current.setView([cp.coordinates.lat, cp.coordinates.lng], 17, { animate: true });
                      }
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-orange-500 text-slate-950 border-orange-500 shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Pos #{cp.number}</span>
                    {isCompleted && <span>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW 2: KOMPAS INTERAKTIF & AZIMUTH BEARING
          ======================================================== */}
      {viewMode === 'compass' && (
        <div className="bg-slate-950 rounded-3xl p-5 border border-slate-800 text-white space-y-4 text-center shadow-xl">
          <div>
            <div className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">
              Kompas Orientasi Lapangan & Azimuth
            </div>
            <h4 className="text-2xl font-extrabold text-white mt-0.5 font-mono">
              {compassHeading}° • {getCompassDirectionName(compassHeading)}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Bidikan sudut langsung menuju <strong>{selectedMapCp.name}</strong> ({distanceToTarget}m)
            </p>
          </div>

          {/* Rotatable Graphic Compass Rose */}
          <div className="relative w-52 h-52 mx-auto flex items-center justify-center my-3">
            {/* Outer Dial that rotates according to heading */}
            <div 
              className="w-full h-full rounded-full border-4 border-slate-700 bg-gradient-to-tr from-slate-900 to-[#0b192c] shadow-2xl relative transition-transform duration-300 flex items-center justify-center"
              style={{ transform: `rotate(${-compassHeading}deg)` }}
            >
              {/* Cardinal Markers */}
              <span className="absolute top-2 font-black text-sm text-red-500">U</span>
              <span className="absolute right-2.5 font-black text-xs text-slate-400">T</span>
              <span className="absolute bottom-2 font-black text-xs text-slate-400">S</span>
              <span className="absolute left-2.5 font-black text-xs text-slate-400">B</span>

              {/* Dial tick marks */}
              <div className="w-40 h-40 rounded-full border border-dashed border-slate-700/80"></div>
              <div className="w-24 h-24 rounded-full border border-slate-800"></div>
            </div>

            {/* Static Target Heading Needle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3 h-40 flex flex-col justify-between items-center">
                {/* Red North Needle Tip */}
                <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[48px] border-b-red-600 drop-shadow-md"></div>
                {/* Center Pivot Point */}
                <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-slate-900 z-10 shadow-lg flex items-center justify-center text-[8px] font-bold text-slate-900">
                  RP
                </div>
                {/* White South Needle Tip */}
                <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[48px] border-t-slate-300 drop-shadow-md"></div>
              </div>
            </div>
          </div>

          {/* Compass Rotate Interactive Controls */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => rotateCompass(-15)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition-colors"
            >
              ↺ -15° Putar Kiri
            </button>
            <button
              type="button"
              onClick={() => setCompassHeading(bearingToTarget)}
              className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 text-xs font-extrabold cursor-pointer transition-colors shadow-sm"
            >
              Kunci Bidikan Pos ({bearingToTarget}°)
            </button>
            <button
              type="button"
              onClick={() => rotateCompass(15)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition-colors"
            >
              +15° Putar Kanan ↻
            </button>
          </div>

          <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 text-xs text-left text-slate-300 space-y-1">
            <div className="font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-orange-400" />
                <span>Pos Bidikan: {selectedMapCp.name}</span>
              </span>
              <span className="text-[11px] font-mono text-orange-400 font-extrabold">
                {distanceToTarget} Meter
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Arahkan garis bidik kompas ke derajat <strong>{bearingToTarget}° {getCompassDirectionName(bearingToTarget)}</strong> untuk menuju patokan {selectedMapCp.locationName || 'pos'}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
