import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  Plus, 
  CheckCircle2, 
  Target, 
  Sparkles, 
  Compass, 
  Trash2, 
  Pencil, 
  QrCode, 
  Award,
  Crosshair,
  Layers,
  Search,
  Navigation,
  Upload,
  FileCode,
  RotateCcw,
  Radio,
  Users,
  Wifi,
  Eye,
  EyeOff
} from 'lucide-react';
import { Checkpoint, Team } from '../../types';
import { parseGPXString, generateSampleGPXContent, GPXRouteData } from '../../utils/gpxParser';
import { useRace } from '../../context/RaceContext';

interface InteractiveCheckpointMapProps {
  checkpoints: Checkpoint[];
  gpxRouteData?: GPXRouteData;
  createCheckpoint: (checkpointData: Partial<Checkpoint>) => Checkpoint;
  updateCheckpoint: (checkpointId: string, updatedData: Partial<Checkpoint>) => Checkpoint | undefined;
  deleteCheckpoint: (checkpointId: string) => void;
  onShowToast: (msg: string) => void;
  onEditCheckpointRequest?: (checkpoint: Checkpoint) => void;
}

const PRESET_LOCATIONS = [
  { name: 'Taman Kencana, Bogor', lat: -6.5892, lng: 106.7972 },
  { name: 'Kebun Raya Bogor', lat: -6.5976, lng: 106.7996 },
  { name: 'Lembah Pinus, Gunung Pancar', lat: -6.6388, lng: 106.8864 },
  { name: 'Kawasan Telaga Warna, Puncak', lat: -6.7020, lng: 106.9985 },
  { name: 'Lapangan Utama Hutan Kota', lat: -6.6350, lng: 106.8820 },
  { name: 'Monumen Nasional, Jakarta', lat: -6.1754, lng: 106.8272 },
  { name: 'Dago Pakar, Bandung', lat: -6.8622, lng: 107.6255 }
];

export const InteractiveCheckpointMap: React.FC<InteractiveCheckpointMapProps> = ({
  checkpoints,
  gpxRouteData,
  createCheckpoint,
  updateCheckpoint,
  deleteCheckpoint,
  onShowToast,
  onEditCheckpointRequest,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const gpxLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const teamsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const pendingMarkerRef = useRef<L.Marker | null>(null);

  // Layer toggles
  const [showCheckpointsLayer, setShowCheckpointsLayer] = useState<boolean>(true);
  const [showTeamsRadarLayer, setShowTeamsRadarLayer] = useState<boolean>(true);
  const [showGpxLayer, setShowGpxLayer] = useState<boolean>(true);

  // Form State for creating checkpoint from map click
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [newPosName, setNewPosName] = useState<string>(`Pos ${checkpoints.length + 1}: `);
  const [newLocationName, setNewLocationName] = useState<string>('');
  const [newPoints, setNewPoints] = useState<number>(150);
  const [newChallengeType, setNewChallengeType] = useState<Checkpoint['challengeType']>('photo');
  const [isMandatory, setIsMandatory] = useState<boolean>(true);

  const { selectedEventId, updateEvent, teams, setActiveTeamId } = useRace();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingOverMap, setIsDraggingOverMap] = useState<boolean>(false);

  // Handle GPX string parsing & updating RaceContext event
  const handleProcessGpxContent = (content: string, fileName: string) => {
    try {
      const parsedGpx = parseGPXString(content, fileName);
      if (selectedEventId && updateEvent) {
        updateEvent(selectedEventId, { gpxRouteData: parsedGpx });
      }
      onShowToast(`✅ Berkas GPX "${parsedGpx.routeName}" berhasil diunggah & ditampilkan di peta! (${parsedGpx.distanceKm} km)`);
    } catch (err: any) {
      onShowToast(`❌ Gagal membaca file GPX: ${err.message || 'Format XML bermasalah'}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleProcessGpxContent(text, file.name);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadSampleGpx = () => {
    const sampleText = generateSampleGPXContent();
    handleProcessGpxContent(sampleText, 'demo_gunung_pancar_10k.gpx');
  };

  const handleClearGpx = () => {
    if (selectedEventId && updateEvent) {
      updateEvent(selectedEventId, { gpxRouteData: undefined });
      onShowToast('🗑️ Overlay rute GPX berhasil dihapus dari peta.');
    }
  };

  const handleImportWaypointsAsCheckpoints = () => {
    if (!gpxRouteData || !gpxRouteData.waypoints || gpxRouteData.waypoints.length === 0) {
      onShowToast('Tidak ada data waypoint di dalam berkas GPX ini.');
      return;
    }

    let count = 0;
    gpxRouteData.waypoints.forEach((wpt) => {
      createCheckpoint({
        name: wpt.name || `Pos Waypoint ${count + 1}`,
        locationName: wpt.desc || 'Waypoint Rute GPX',
        coordinates: { lat: wpt.lat, lng: wpt.lng },
        points: 150,
        challengeType: 'qr_only',
        challengeDescription: 'Pos waypoint dari impor file GPX. Scan barcode di lokasi.',
        isMandatory: true,
      });
      count++;
    });

    onShowToast(`🚀 Berhasil mengimpor ${count} waypoint GPX menjadi pos checkpoint resmi!`);
  };

  // Update pos name counter when checkpoints change
  useEffect(() => {
    setNewPosName(`Pos ${checkpoints.length + 1}: `);
  }, [checkpoints.length]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = checkpoints[0]?.coordinates?.lat || -6.6388;
      const initialLng = checkpoints[0]?.coordinates?.lng || 106.8864;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 15,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;

      const gpxGroup = L.layerGroup().addTo(map);
      gpxLayerGroupRef.current = gpxGroup;

      const teamsGroup = L.layerGroup().addTo(map);
      teamsLayerGroupRef.current = teamsGroup;

      // Handle map click to set new manual coordinate
      map.on('click', (e: L.LeafletMouseEvent) => {
        const clickedLat = Number(e.latlng.lat.toFixed(6));
        const clickedLng = Number(e.latlng.lng.toFixed(6));

        setSelectedLat(clickedLat);
        setSelectedLng(clickedLng);

        // Render or update pending marker
        if (pendingMarkerRef.current) {
          pendingMarkerRef.current.setLatLng([clickedLat, clickedLng]);
        } else {
          const pendingIcon = L.divIcon({
            className: 'custom-pending-pin-icon',
            html: `<div style="background: linear-gradient(135deg, #f97316, #ea580c); color: white; border: 3px solid white; border-radius: 50%; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 14px rgba(234,88,12,0.6); transform: translateY(-10px); animation: bounce 1s infinite alternate;">📍</div>`,
            iconSize: [38, 38],
            iconAnchor: [19, 38],
          });

          const pMarker = L.marker([clickedLat, clickedLng], { icon: pendingIcon }).addTo(map);
          pendingMarkerRef.current = pMarker;
        }

        onShowToast(`📍 Titik koordinat dipilih [${clickedLat}, ${clickedLng}]. Lengkapi form di samping untuk menyimpan pos ke RaceContext!`);
      });

      mapInstanceRef.current = map;
    }

    return () => {
      // Keep map instance alive during view switching if needed
    };
  }, []);

  // Sync Checkpoint Markers on Map whenever checkpoints list or context updates
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    const layerGroup = markersGroupRef.current;
    layerGroup.clearLayers();

    checkpoints.forEach((cp) => {
      if (cp.coordinates && cp.coordinates.lat && cp.coordinates.lng) {
        const isStart = cp.number === 1 || cp.name.toLowerCase().includes('start');
        const isFinish = (checkpoints.length > 1 && cp.number === checkpoints.length) || cp.name.toLowerCase().includes('finish');

        let defaultIconForType = '🎯';
        let defaultColorForType = '#0b192c';

        if (isStart) {
          defaultIconForType = '🏁';
          defaultColorForType = '#16a34a'; // Hijau untuk Start
        } else if (isFinish) {
          defaultIconForType = '🏁';
          defaultColorForType = '#dc2626'; // Merah untuk Finish
        } else if (cp.challengeType === 'photo') {
          defaultIconForType = '📸';
          defaultColorForType = '#0284c7'; // Biru untuk Misi Foto
        } else if (cp.challengeType === 'riddle') {
          defaultIconForType = '🧩';
          defaultColorForType = '#9333ea'; // Ungu untuk Teka-teki / Puzzle
        } else if (cp.challengeType === 'physical_game') {
          defaultIconForType = '🎯';
          defaultColorForType = '#ea580c'; // Oranye untuk Tantangan Fisik / Target
        }

        const mColor = cp.markerColor || defaultColorForType;
        const mIcon = cp.markerIcon || defaultIconForType;
        const mCustomImg = cp.markerCustomImage;
        const mShape = cp.markerShape || (isStart || isFinish ? 'shield' : 'circle');

        let innerContent = `<span style="font-weight: 800; font-size: 11px;">P${cp.number}</span>`;
        if (mCustomImg) {
          innerContent = `<img src="${mCustomImg}" style="width:24px; height:24px; border-radius:50%; object-fit:cover;"/>`;
        } else if (mIcon) {
          innerContent = `<span style="font-size: 14px; margin-right: 1px;">${mIcon}</span><span style="font-size: 9px; font-weight: 900;">P${cp.number}</span>`;
        }

        let borderRadius = '50%';
        if (mShape === 'square') borderRadius = '10px';
        if (mShape === 'shield') borderRadius = '16px 16px 6px 6px';
        if (mShape === 'pin') borderRadius = '50% 50% 50% 0';

        const transformStyle = mShape === 'pin' ? 'transform: rotate(-45deg);' : '';
        const innerTransform = mShape === 'pin' ? 'transform: rotate(45deg); display: flex; align-items: center;' : 'display: flex; align-items: center; justify-content: center;';

        const cpIcon = L.divIcon({
          className: 'custom-cp-map-icon',
          html: `<div style="background-color: ${mColor}; color: white; border: 3px solid #ffffff; border-radius: ${borderRadius}; width: 38px; height: 38px; ${transformStyle} display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px ${mColor}aa;"><div style="${innerTransform}">${innerContent}</div></div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        const marker = L.marker([cp.coordinates.lat, cp.coordinates.lng], {
          icon: cpIcon,
          draggable: true,
        }).addTo(layerGroup);

        marker.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px; min-width: 170px;">
            <div style="font-weight: 800; color: #0b192c; font-size: 13px;">${cp.name}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">📍 ${cp.locationName || 'Lokasi Terbuka'}</div>
            <div style="font-size: 11px; color: #ea580c; font-weight: bold; margin-top: 2px;">🏆 +${cp.points} Poin</div>
            <div style="font-size: 10px; color: #475569; font-family: monospace; margin-top: 4px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">
              🌐 ${cp.coordinates.lat.toFixed(5)}, ${cp.coordinates.lng.toFixed(5)}
            </div>
            <div style="margin-top: 8px; font-size: 10px; color: #94a3b8; italic;">💡 Drag marker ini di peta untuk memperbarui posisi pos di RaceContext.</div>
          </div>
        `);

        // Drag marker to update coordinates in RaceContext
        marker.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          const newLat = Number(newPos.lat.toFixed(6));
          const newLng = Number(newPos.lng.toFixed(6));

          updateCheckpoint(cp.id, {
            coordinates: { lat: newLat, lng: newLng },
          });

          onShowToast(`📍 Koordinat "${cp.name}" diperbarui ke [${newLat}, ${newLng}] di RaceContext!`);
        });
      }
    });
  }, [checkpoints, updateCheckpoint, onShowToast]);

  // Sync GPX Polyline Route Track Overlay & Waypoint Pins
  useEffect(() => {
    if (!mapInstanceRef.current || !gpxLayerGroupRef.current) return;

    const layerGroup = gpxLayerGroupRef.current;
    layerGroup.clearLayers();

    if (gpxRouteData && gpxRouteData.trackpoints && gpxRouteData.trackpoints.length > 0) {
      const latLngs = gpxRouteData.trackpoints.map((pt) => [pt.lat, pt.lng] as [number, number]);

      // Outer Glow Line
      L.polyline(latLngs, {
        color: '#f97316',
        weight: 7,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layerGroup);

      // Core Polyline
      L.polyline(latLngs, {
        color: '#0284c7',
        weight: 4,
        opacity: 0.9,
        dashArray: '8, 6',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layerGroup);

      // Start Marker (First trackpoint)
      const startPt = gpxRouteData.trackpoints[0];
      if (startPt) {
        const startIcon = L.divIcon({
          className: 'custom-start-gpx-pin',
          html: `<div style="background: #10b981; color: white; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; box-shadow: 0 4px 10px rgba(16,185,129,0.5);">🏁</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([startPt.lat, startPt.lng], { icon: startIcon })
          .bindPopup(`<b>🏁 Start GPX: ${gpxRouteData.routeName}</b>`)
          .addTo(layerGroup);
      }

      // Finish Marker (Last trackpoint)
      const finishPt = gpxRouteData.trackpoints[gpxRouteData.trackpoints.length - 1];
      if (finishPt && gpxRouteData.trackpoints.length > 1) {
        const finishIcon = L.divIcon({
          className: 'custom-finish-gpx-pin',
          html: `<div style="background: #ef4444; color: white; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; box-shadow: 0 4px 10px rgba(239,68,68,0.5);">🎯</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([finishPt.lat, finishPt.lng], { icon: finishIcon })
          .bindPopup(`<b>🎯 Finis GPX</b><br/>Panjang: ${gpxRouteData.distanceKm} km | Elevasi: +${gpxRouteData.elevationGainMeters}m`)
          .addTo(layerGroup);
      }

      // Waypoint Markers
      if (gpxRouteData.waypoints && gpxRouteData.waypoints.length > 0) {
        gpxRouteData.waypoints.forEach((wpt) => {
          const wptIcon = L.divIcon({
            className: 'custom-wpt-gpx-pin',
            html: `<div style="background: #8b5cf6; color: white; border: 2px solid white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; box-shadow: 0 4px 10px rgba(139,92,246,0.5);">📍</div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });
          L.marker([wpt.lat, wpt.lng], { icon: wptIcon })
            .bindPopup(`<b>📍 Waypoint: ${wpt.name}</b><br/>${wpt.desc || ''}`)
            .addTo(layerGroup);
        });
      }

      // Auto-fit bounds
      if (gpxRouteData.bounds) {
        mapInstanceRef.current.fitBounds([
          [gpxRouteData.bounds.minLat, gpxRouteData.bounds.minLng],
          [gpxRouteData.bounds.maxLat, gpxRouteData.bounds.maxLng],
        ], { padding: [40, 40] });
      }
    }
  }, [gpxRouteData]);

  // Sync Checkpoint Layer Visibility
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;
    if (showCheckpointsLayer) {
      if (!mapInstanceRef.current.hasLayer(markersGroupRef.current)) {
        markersGroupRef.current.addTo(mapInstanceRef.current);
      }
    } else {
      if (mapInstanceRef.current.hasLayer(markersGroupRef.current)) {
        mapInstanceRef.current.removeLayer(markersGroupRef.current);
      }
    }
  }, [showCheckpointsLayer]);

  // Sync GPX Layer Visibility
  useEffect(() => {
    if (!mapInstanceRef.current || !gpxLayerGroupRef.current) return;
    if (showGpxLayer) {
      if (!mapInstanceRef.current.hasLayer(gpxLayerGroupRef.current)) {
        gpxLayerGroupRef.current.addTo(mapInstanceRef.current);
      }
    } else {
      if (mapInstanceRef.current.hasLayer(gpxLayerGroupRef.current)) {
        mapInstanceRef.current.removeLayer(gpxLayerGroupRef.current);
      }
    }
  }, [showGpxLayer]);

  // Sync Real-Time Participant & Team Radar Markers on Map with Staleness Indicators
  useEffect(() => {
    if (!mapInstanceRef.current || !teamsLayerGroupRef.current) return;
    const layerGroup = teamsLayerGroupRef.current;
    layerGroup.clearLayers();

    if (!showTeamsRadarLayer) return;

    const now = Date.now();

    teams.forEach((team) => {
      let coords = team.currentCoordinates;
      if (!coords || !coords.lat || !coords.lng) {
        const visitedCp = checkpoints.find(c => c.id === team.currentCheckpointId) || checkpoints[0];
        if (visitedCp?.coordinates) {
          coords = visitedCp.coordinates;
        }
      }

      if (!coords || !coords.lat || !coords.lng) return;

      const ageSec = team.lastLocationTimestamp ? (now - team.lastLocationTimestamp) / 1000 : 3600;
      
      // Staleness determination per Directive D
      let statusColor = '#10b981'; // Green: Fresh (< 2 min)
      let statusText = 'Aktif (<2m)';
      let animationClass = 'animate-ping';

      if (ageSec > 300) {
        statusColor = '#94a3b8'; // Stale (> 5 min)
        statusText = 'Kedaluwarsa (>5m)';
        animationClass = '';
      } else if (ageSec > 120) {
        statusColor = '#f59e0b'; // Warning (2-5 min)
        statusText = 'Siaga (2-5m)';
        animationClass = '';
      }

      const teamColor = team.color?.includes('red') ? '#ef4444' :
                        team.color?.includes('blue') ? '#3b82f6' :
                        team.color?.includes('emerald') ? '#10b981' :
                        team.color?.includes('purple') ? '#8b5cf6' :
                        team.color?.includes('amber') ? '#f59e0b' : '#0284c7';

      const teamIcon = L.divIcon({
        className: 'custom-team-radar-pin',
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
            ${animationClass ? `<div style="position: absolute; inset: 0; border-radius: 50%; background-color: ${statusColor}44; transform: scale(1.3); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
            <div style="position: relative; width: 34px; height: 34px; border-radius: 50%; background-color: #0f172a; border: 2.5px solid ${statusColor}; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
              <span style="font-size: 8px; font-weight: 900; color: #f8fafc; line-height: 1;">${team.bibNumber}</span>
              <span style="width: 6px; height: 6px; border-radius: 50%; background-color: ${statusColor}; margin-top: 2px;"></span>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: teamIcon }).addTo(layerGroup);

      const timeAgoString = team.lastLocationTimestamp 
        ? `${Math.round(ageSec)} dtk lalu (${new Date(team.lastLocationTimestamp).toLocaleTimeString('id-ID')})`
        : team.lastUpdated || 'Belum ada data GPS';

      const accuracyBadge = team.lastLocationAccuracy 
        ? `<span style="background: #e2e8f0; color: #1e293b; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">±${Math.round(team.lastLocationAccuracy)}m</span>`
        : '<span style="background: #f1f5f9; color: #64748b; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Estimasi</span>';

      marker.bindPopup(`
        <div style="font-family: sans-serif; padding: 6px; min-width: 200px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
            <div>
              <span style="background: ${teamColor}; color: white; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 800;">${team.bibNumber}</span>
              <strong style="color: #0f172a; font-size: 13px; margin-left: 6px;">${team.name}</strong>
            </div>
            <span style="font-size: 10px; font-weight: 800; color: ${statusColor}; border: 1px solid ${statusColor}; padding: 1px 6px; border-radius: 999px;">
              ${statusText}
            </span>
          </div>

          <div style="font-size: 11px; color: #475569; display: flex; flex-direction: column; gap: 4px;">
            <div>🏆 <b>Total Skor:</b> <span style="color: #ea580c; font-weight: 800;">${team.totalScore} Poin</span> (${team.checkpointsCompleted}/${checkpoints.length} Pos)</div>
            <div>📍 <b>Posisi:</b> ${team.lastPosName || 'Jalur Terbuka'}</div>
            <div>📡 <b>Pembaruan GPS:</b> ${timeAgoString}</div>
            <div>🎯 <b>Akurasi Satelit:</b> ${accuracyBadge}</div>
            <div style="font-size: 9px; color: #94a3b8; font-family: monospace; margin-top: 2px;">
              🌐 ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}
            </div>
          </div>
        </div>
      `);
    });
  }, [teams, checkpoints, showTeamsRadarLayer]);

  // Quick preset fly to location
  const handleFlyToPreset = (preset: typeof PRESET_LOCATIONS[0]) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([preset.lat, preset.lng], 16, { duration: 1.2 });
      onShowToast(`📍 Peta dipindahkan ke area: ${preset.name}`);
    }
  };

  // Submit new checkpoint to RaceContext from map click
  const handleSaveCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLat === null || selectedLng === null) {
      onShowToast('Harap klik pada peta terlebih dahulu untuk memilih titik koordinat pos!');
      return;
    }

    if (!newPosName.trim()) {
      onShowToast('Harap isi Nama Pos Checkpoint.');
      return;
    }

    const createdCp = createCheckpoint({
      name: newPosName.trim(),
      locationName: newLocationName.trim(),
      points: Number(newPoints),
      challengeType: newChallengeType,
      isMandatory,
      coordinates: {
        lat: selectedLat,
        lng: selectedLng,
      },
    });

    onShowToast(`🎉 Pos "${createdCp.name}" berhasil disimpan ke RaceContext di koordinat [${selectedLat}, ${selectedLng}]!`);

    // Reset temporary pending marker & form
    if (pendingMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(pendingMarkerRef.current);
      pendingMarkerRef.current = null;
    }

    setSelectedLat(null);
    setSelectedLng(null);
    setNewLocationName('');
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
      {/* Top Map Header */}
      <div className="p-4 sm:p-5 bg-[#0b192c] text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 text-slate-950 flex items-center justify-center font-extrabold shrink-0 shadow-md">
            <Compass className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-white text-base">Peta Interaktif & Impor Rute GPX</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-wider">
                GPX Parser & Coordinate Picker
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Unggah file GPX rute untuk overlay rute otomatis di peta Leaflet, atau klik lokasi untuk menempatkan pos baru.
            </p>
          </div>
        </div>

        {/* GPX Upload & Area Preset Controls */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 shrink-0 flex-wrap">
          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".gpx,application/gpx+xml,text/xml" 
            className="hidden" 
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold border border-blue-400 shrink-0 cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
            title="Pilih file rute .gpx dari HP/Komputer Anda"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah File GPX</span>
          </button>

          <button
            type="button"
            onClick={handleLoadSampleGpx}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold border border-amber-500/30 shrink-0 cursor-pointer transition-colors flex items-center gap-1.5"
            title="Muat rute contoh Gunung Pancar 10K"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Rute Demo GPX</span>
          </button>

          {PRESET_LOCATIONS.slice(0, 2).map((loc, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleFlyToPreset(loc)}
              className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 shrink-0 cursor-pointer transition-colors"
            >
              {loc.name.split(',')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Header: Layer Controls & Live GPS Radar Telemetry Status Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-bold flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-300" />
            <span>Layer Peta:</span>
          </span>

          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-200 cursor-pointer select-none transition-colors border border-slate-700">
            <input 
              type="checkbox" 
              checked={showCheckpointsLayer} 
              onChange={(e) => setShowCheckpointsLayer(e.target.checked)}
              className="accent-orange-500 rounded"
            />
            <span className="font-bold">Pos Checkpoint ({checkpoints.length})</span>
          </label>

          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-emerald-300 cursor-pointer select-none transition-colors border border-emerald-500/30">
            <input 
              type="checkbox" 
              checked={showTeamsRadarLayer} 
              onChange={(e) => setShowTeamsRadarLayer(e.target.checked)}
              className="accent-emerald-500 rounded"
            />
            <span className="font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Radar Tim Live ({teams.length})
            </span>
          </label>

          {gpxRouteData && (
            <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-blue-300 cursor-pointer select-none transition-colors border border-blue-500/30">
              <input 
                type="checkbox" 
                checked={showGpxLayer} 
                onChange={(e) => setShowGpxLayer(e.target.checked)}
                className="accent-blue-500 rounded"
              />
              <span className="font-bold">Rute GPX ({gpxRouteData.distanceKm} km)</span>
            </label>
          )}
        </div>

        {/* Live Radar Legend & Staleness indicator summary */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Aktif &lt;2m</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Siaga 2-5m</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span>Pasif &gt;5m</span>
          </div>
        </div>
      </div>

      {/* Main Map Body + Interactive Sidebar */}
      <div className="flex flex-col lg:flex-row min-h-[520px]">
        {/* Left Map View */}
        <div 
          className="relative flex-1 min-h-[380px] lg:min-h-[520px] bg-slate-100 overflow-hidden"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOverMap(true);
          }}
          onDragLeave={() => setIsDraggingOverMap(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOverMap(false);
            const file = e.dataTransfer.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const text = event.target?.result as string;
                handleProcessGpxContent(text, file.name);
              };
              reader.readAsText(file);
            }
          }}
        >
          <div ref={mapContainerRef} className="w-full h-full min-h-[380px] lg:min-h-[520px] z-10" />

          {/* Drag and Drop Backdrop Indicator */}
          {isDraggingOverMap && (
            <div className="absolute inset-0 z-50 bg-blue-900/85 backdrop-blur-sm border-4 border-dashed border-blue-300 flex flex-col items-center justify-center text-white p-6 animate-in fade-in duration-150">
              <Upload className="w-16 h-16 text-blue-300 animate-bounce mb-3" />
              <h3 className="text-xl font-black text-white">Lepaskan Berkas GPX Di Sini</h3>
              <p className="text-xs text-blue-200 mt-1 max-w-sm text-center">
                Jalur rute akan otomatis di-parse dan ditayangkan sebagai garis polylines di peta Leaflet.
              </p>
            </div>
          )}

          {/* Active GPX Route Info & Waypoint Converter Overlay */}
          {gpxRouteData && (
            <div className="absolute top-3 left-3 right-3 z-30 pointer-events-none flex flex-col items-center gap-2">
              <div className="bg-[#0b192c]/95 text-white p-3 sm:px-4 sm:py-2.5 rounded-2xl text-xs font-bold shadow-2xl border border-blue-500/40 backdrop-blur-md pointer-events-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-xl w-full">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <strong className="text-orange-400 font-extrabold text-sm truncate">
                      🗺️ Rute GPX: {gpxRouteData.routeName}
                    </strong>
                  </div>
                  <p className="text-[11px] text-slate-300 font-normal">
                    Jarak: <strong>{gpxRouteData.distanceKm} km</strong> • Elevasi: <strong>+{gpxRouteData.elevationGainMeters}m</strong> • Total Waypoint: <strong>{gpxRouteData.waypoints?.length || 0}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {gpxRouteData.waypoints && gpxRouteData.waypoints.length > 0 && (
                    <button
                      type="button"
                      onClick={handleImportWaypointsAsCheckpoints}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      title="Ubah semua waypoint GPX menjadi pos checkpoint resmi"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Impor Pos ({gpxRouteData.waypoints.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleClearGpx}
                    className="p-1.5 bg-slate-800 hover:bg-red-900/80 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs cursor-pointer transition-colors"
                    title="Hapus overlay GPX"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Top Instruction Floating Tag when no GPX active */}
          {!gpxRouteData && (
            <div className="absolute top-3 left-3 right-3 z-20 pointer-events-none flex items-center justify-center">
              <div className="bg-slate-900/90 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl border border-slate-700 backdrop-blur-md flex items-center gap-2 pointer-events-auto">
                <Target className="w-4 h-4 text-orange-400 animate-pulse shrink-0" />
                <span>Klik pada peta atau tarik-lepas (drag-drop) file GPX untuk memetakan rute!</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar Form for Clicked Coordinate */}
        <div className="w-full lg:w-96 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-5 space-y-4 overflow-y-auto shrink-0">
          {selectedLat !== null && selectedLng !== null ? (
            <form onSubmit={handleSaveCheckpoint} className="space-y-4 text-xs">
              <div className="bg-orange-50 border border-orange-200 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <Crosshair className="w-4 h-4 text-rose-500" />
                    Koordinat Peta Dipilih:
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-orange-500 text-white">
                    SIAP DISIMPAN
                  </span>
                </div>
                <div className="font-mono text-xs font-extrabold text-orange-700 bg-white p-2 rounded-xl border border-orange-200">
                  🌐 Lintang: {selectedLat} <br />
                  🌐 Bujur: {selectedLng}
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Koordinat ini diambil langsung dari titik klik peta Anda tanpa memerlukan sensor GPS perangkat fisik.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Nama Pos Checkpoint: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPosName}
                  onChange={(e) => setNewPosName(e.target.value)}
                  placeholder="Contoh: Pos 5: Gazebo Pinus..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Patokan Area:</label>
                  <input
                    type="text"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder="Sektor Timur, Kolam..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Poin Reward:</label>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    step={10}
                    value={newPoints}
                    onChange={(e) => setNewPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Jenis Tantangan Pos:</label>
                <select
                  value={newChallengeType}
                  onChange={(e) => setNewChallengeType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="qr_only">Scan QR Code Saja</option>
                  <option value="photo">Foto Formasi Tim</option>
                  <option value="riddle">Teka-Teki Sandi & Azimuth</option>
                  <option value="physical_game">Tantangan Ketangkasan Fisik</option>
                  <option value="quiz">Kuis Pengetahuan</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-slate-950 font-extrabold rounded-xl text-xs sm:text-sm shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
              >
                <CheckCircle2 className="w-4.5 h-4.5" />
                <span>Simpan Pos ke RaceContext</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (pendingMarkerRef.current && mapInstanceRef.current) {
                    mapInstanceRef.current.removeLayer(pendingMarkerRef.current);
                    pendingMarkerRef.current = null;
                  }
                  setSelectedLat(null);
                  setSelectedLng(null);
                }}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Batal Pilih Titik
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 text-slate-800 font-extrabold">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  <span>Petunjuk Menentukan Koordinat:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 leading-relaxed pl-1">
                  <li><strong>Klik pada area manapun di peta</strong> untuk memilih lokasi pos secara manual.</li>
                  <li>Form pendaftaran pos akan otomatis terbuka dengan koordinat *Latitude & Longitude* tersebut.</li>
                  <li>Atur Nama Pos dan Poin Reward, lalu klik <strong>Simpan Pos ke RaceContext</strong>.</li>
                  <li>Untuk menggeser posisi pos yang sudah ada, <strong>drag marker pos (P1, P2, dst)</strong> langsung di atas peta.</li>
                </ol>
              </div>

              {/* Status Current Checkpoints Summary */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-xs">
                    Daftar Pos Terpasang di Peta ({checkpoints.length}):
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    REAL-TIME
                  </span>
                </div>

                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {checkpoints.map((cp, idx) => (
                    <div
                      key={`${cp.id}-${idx}`}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs hover:border-orange-300 transition-colors"
                    >
                      <div className="space-y-0.5 truncate pr-2">
                        <div className="font-extrabold text-slate-900 truncate">
                          Pos #{cp.number}: {cp.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {cp.coordinates ? `${cp.coordinates.lat.toFixed(4)}, ${cp.coordinates.lng.toFixed(4)}` : 'Belum ada koordinat'}
                        </div>
                      </div>

                      <span className="font-mono text-[10px] font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 shrink-0">
                        +{cp.points} Pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
