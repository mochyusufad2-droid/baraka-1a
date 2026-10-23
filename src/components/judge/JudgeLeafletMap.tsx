import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Navigation, 
  MapPin, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Maximize2, 
  Target, 
  Layers, 
  Clock, 
  Eye, 
  Zap,
  RotateCw
} from 'lucide-react';
import { Checkpoint, Team, SosAlert } from '../../types';

interface JudgeLeafletMapProps {
  checkpoints: Checkpoint[];
  teams: Team[];
  sosAlerts?: SosAlert[];
  selectedPosId: string;
  onSelectPos: (posId: string) => void;
  onSelectTeam?: (teamId: string) => void;
  onShowToast?: (msg: string) => void;
}

export const JudgeLeafletMap: React.FC<JudgeLeafletMapProps> = ({
  checkpoints,
  teams,
  sosAlerts = [],
  selectedPosId,
  onSelectPos,
  onSelectTeam,
  onShowToast
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeFilter, setActiveFilter] = useState<'all' | 'pos' | 'teams' | 'sos'>('all');
  const [liveGpsTracking, setLiveGpsTracking] = useState<boolean>(true);
  const [localTeamCoords, setLocalTeamCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<string>(
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Initialize team coordinates from props or fallback to checkpoint coordinates with offset
  useEffect(() => {
    const coordsMap: Record<string, { lat: number; lng: number }> = {};
    teams.forEach((t, idx) => {
      if (t.currentCoordinates) {
        coordsMap[t.id] = { ...t.currentCoordinates };
      } else {
        // Fallback to team's current checkpoint location with small spread offset
        const targetCp = checkpoints.find((cp) => cp.id === t.currentCheckpointId) || checkpoints[0];
        if (targetCp) {
          const offsetLat = (Math.sin(idx * 1.5) * 0.0012) + (Math.random() * 0.0004);
          const offsetLng = (Math.cos(idx * 1.5) * 0.0012) + (Math.random() * 0.0004);
          coordsMap[t.id] = {
            lat: targetCp.coordinates.lat + offsetLat,
            lng: targetCp.coordinates.lng + offsetLng
          };
        } else {
          coordsMap[t.id] = { lat: -6.6350, lng: 106.8830 };
        }
      }
    });
    setLocalTeamCoords(coordsMap);
  }, [teams, checkpoints]);

  // Live GPS Simulation Interval: simulate minor movement every 4 seconds when live tracking is active
  useEffect(() => {
    if (!liveGpsTracking) return;

    const interval = setInterval(() => {
      setLocalTeamCoords((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((tId) => {
          const team = teams.find((t) => t.id === tId);
          if (team && team.status === 'racing') {
            // Slight jitter simulating real GPS updates
            const jitterLat = (Math.random() - 0.48) * 0.00025;
            const jitterLng = (Math.random() - 0.48) * 0.00025;
            updated[tId] = {
              lat: updated[tId].lat + jitterLat,
              lng: updated[tId].lng + jitterLng
            };
          }
        });
        return updated;
      });
      setLastUpdateTimestamp(
        new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [liveGpsTracking, teams]);

  // Main Leaflet Map Initialization & Rendering
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy previous instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Default center around first checkpoint or Gunung Geulis
    const centerLat = checkpoints[0]?.coordinates.lat || -6.6341;
    const centerLng = checkpoints[0]?.coordinates.lng || 106.8821;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 15,
      zoomControl: true,
      attributionControl: true
    });

    mapInstanceRef.current = map;

    // OpenStreetMap tile layer with dark or crisp standard theme
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors | Race GPS Live'
    }).addTo(map);

    // Layer Group for all dynamic markers
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [checkpoints]);

  // Update Markers & Polyline when checkpoints, localTeamCoords, selectedPosId, or activeFilter changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // 1. Draw Route Polyline connecting all Checkpoints
    if (checkpoints.length > 1 && (activeFilter === 'all' || activeFilter === 'pos')) {
      const latLngs: L.LatLngExpression[] = checkpoints.map((cp) => [
        cp.coordinates.lat,
        cp.coordinates.lng
      ]);

      const polyline = L.polyline(latLngs, {
        color: '#f97316',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.85,
        lineCap: 'round'
      });
      polyline.addTo(markersGroup);
    }

    // 2. Render Checkpoints Markers
    if (activeFilter === 'all' || activeFilter === 'pos') {
      checkpoints.forEach((cp) => {
        const isSelected = cp.id === selectedPosId;

        // Custom HTML Icon for Checkpoint
        const cpIcon = L.divIcon({
          className: 'custom-leaflet-cp-icon',
          html: `
            <div class="relative group cursor-pointer">
              ${isSelected ? '<div class="absolute -inset-2 bg-orange-500/40 rounded-full animate-ping"></div>' : ''}
              <div class="relative flex items-center justify-center w-9 h-9 rounded-full ${
                isSelected 
                  ? 'bg-orange-500 text-slate-950 ring-4 ring-orange-300 ring-offset-2' 
                  : 'bg-[#0b192c] text-white border-2 border-orange-400 shadow-md'
              } font-black text-xs shadow-lg transition-transform transform hover:scale-110">
                P${cp.number}
              </div>
              <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow border border-slate-700">
                ${cp.name.split(':')[0] || cp.name}
              </div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const marker = L.marker([cp.coordinates.lat, cp.coordinates.lng], { icon: cpIcon });

        // Calculate how many teams are currently at or completed this checkpoint
        const teamsAtPos = teams.filter((t) => t.currentCheckpointId === cp.id).length;

        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 font-sans text-slate-900';
        popupContent.innerHTML = `
          <div style="font-family: sans-serif; min-width: 180px;">
            <div style="font-size: 10px; font-weight: 800; color: #f97316; text-transform: uppercase;">
              CHECKPOINT ${cp.number} ${cp.isMandatory ? '• POS WAJIB' : ''}
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px;">
              ${cp.name}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              📍 ${cp.locationName}
            </div>
            <div style="display: flex; gap: 8px; margin-top: 8px; font-size: 11px; font-weight: 700;">
              <span style="background: #f1f5f9; padding: 2px 6px; rounded: 4px;">Poin: +${cp.points}</span>
              <span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; rounded: 4px;">${teamsAtPos} Tim Aktif</span>
            </div>
            <button 
              id="select-pos-btn-${cp.id}" 
              style="margin-top: 10px; width: 100%; background: #0f172a; color: #ffffff; border: none; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; transition: background 0.2s;"
            >
              ${isSelected ? '✓ Pos Jaga Anda Saat Ini' : '🎯 Jadikan Pos Jaga Aktif'}
            </button>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`select-pos-btn-${cp.id}`);
          if (btn) {
            btn.onclick = () => {
              onSelectPos(cp.id);
              if (onShowToast) {
                onShowToast(`📍 Pos Jaga Aktif disetel ke: ${cp.name}`);
              }
              map.closePopup();
            };
          }
        });

        marker.addTo(markersGroup);
      });
    }

    // 3. Render Participant / Team Markers
    if (activeFilter === 'all' || activeFilter === 'teams') {
      teams.forEach((team) => {
        const pos = localTeamCoords[team.id];
        if (!pos) return;

        // Determine icon color based on team status or color
        const isRacing = team.status === 'racing';
        const teamColorClass = isRacing ? 'bg-emerald-500 border-emerald-300' : 'bg-slate-500 border-slate-300';

        const teamIcon = L.divIcon({
          className: 'custom-leaflet-team-icon',
          html: `
            <div class="relative group cursor-pointer">
              <div class="absolute -inset-1.5 bg-emerald-400/30 rounded-full animate-pulse"></div>
              <div class="relative flex items-center justify-center px-2 py-1 rounded-full ${teamColorClass} text-white font-extrabold text-[11px] shadow-md border-2 border-white transition-transform transform hover:scale-110">
                <span class="mr-1 text-[9px]">🏃</span> ${team.bibNumber}
              </div>
              <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-emerald-950 text-emerald-300 text-[9px] font-black px-1.5 py-0.2 rounded shadow">
                ${team.name}
              </div>
            </div>
          `,
          iconSize: [42, 24],
          iconAnchor: [21, 12]
        });

        const marker = L.marker([pos.lat, pos.lng], { icon: teamIcon });

        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 font-sans text-slate-900';
        popupContent.innerHTML = `
          <div style="font-family: sans-serif; min-width: 190px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 10px; font-weight: 800; color: #10b981; text-transform: uppercase;">
                BIB: ${team.bibNumber}
              </span>
              <span style="font-size: 10px; font-weight: 700; background: #dcfce7; color: #15803d; padding: 1px 6px; border-radius: 999px;">
                ${team.status.toUpperCase()}
              </span>
            </div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 3px;">
              ${team.name}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              🏷️ ${team.category}
            </div>
            <div style="margin-top: 6px; padding: 6px; background: #f8fafc; border-radius: 6px; font-size: 11px; border: 1px solid #e2e8f0;">
              <div><strong>Pos Saat Ini:</strong> ${team.lastPosName || 'Start'}</div>
              <div><strong>Checkpoints:</strong> ${team.checkpointsCompleted}/${team.totalCheckpoints} Selesai</div>
              <div><strong>Total Skor:</strong> <span style="color: #f97316; font-weight: 800;">${team.totalScore} Poin</span></div>
              <div style="font-size: 9px; color: #94a3b8; margin-top: 3px;">GPS Terakhir: ${lastUpdateTimestamp}</div>
            </div>
            ${
              onSelectTeam 
                ? `<button 
                    id="select-team-btn-${team.id}" 
                    style="margin-top: 8px; width: 100%; background: #f97316; color: #0f172a; border: none; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; cursor: pointer;"
                  >
                    📝 Pilih Tim untuk Scoring Manual
                  </button>` 
                : ''
            }
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
          if (onSelectTeam) {
            const btn = document.getElementById(`select-team-btn-${team.id}`);
            if (btn) {
              btn.onclick = () => {
                onSelectTeam(team.id);
                if (onShowToast) {
                  onShowToast(`🎯 Tim ${team.name} (${team.bibNumber}) dipilih untuk input skor.`);
                }
                map.closePopup();
              };
            }
          }
        });

        marker.addTo(markersGroup);
      });
    }

    // 4. Render SOS Alert Markers
    if ((activeFilter === 'all' || activeFilter === 'sos') && sosAlerts.length > 0) {
      sosAlerts.forEach((sos) => {
        if (sos.status !== 'active') return;

        const sosIcon = L.divIcon({
          className: 'custom-leaflet-sos-icon',
          html: `
            <div class="relative cursor-pointer">
              <div class="absolute -inset-3 bg-rose-600/60 rounded-full animate-ping"></div>
              <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-rose-600 text-white font-black text-xs shadow-xl border-2 border-white">
                🚨
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker([sos.coordinates.lat, sos.coordinates.lng], { icon: sosIcon });
        marker.bindPopup(`
          <div style="font-family: sans-serif; min-width: 170px;">
            <div style="font-size: 10px; font-weight: 800; color: #e11d48; text-transform: uppercase;">
              ⚠️ SOS EMERGENCY ALERT
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px;">
              Tim ${sos.teamName} (${sos.bibNumber})
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              Waktu SOS: ${sos.timeString}
            </div>
          </div>
        `);
        marker.addTo(markersGroup);
      });
    }
  }, [checkpoints, teams, localTeamCoords, selectedPosId, activeFilter, sosAlerts, lastUpdateTimestamp]);

  // Center Map to selected Pos Jaga
  const handleCenterSelectedPos = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const currentCp = checkpoints.find((c) => c.id === selectedPosId);
    if (currentCp) {
      map.flyTo([currentCp.coordinates.lat, currentCp.coordinates.lng], 16, { duration: 1 });
      if (onShowToast) {
        onShowToast(`🔍 Peta difokuskan ke ${currentCp.name}`);
      }
    }
  };

  // Fit bounds to show all checkpoints and active teams
  const handleFitAllBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const points: L.LatLngExpression[] = checkpoints.map((cp) => [
      cp.coordinates.lat,
      cp.coordinates.lng
    ]);

    Object.values(localTeamCoords).forEach((pos) => {
      points.push([pos.lat, pos.lng]);
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40] });
      if (onShowToast) {
        onShowToast('📐 Tampilan peta disesuaikan memuat seluruh lokasi pos & peserta.');
      }
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
      {/* Map Control Header */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white">Peta Live GPS Pos & Peserta</h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE RADAR
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Update GPS Real-Time: <span className="font-mono text-orange-400 font-bold">{lastUpdateTimestamp}</span>
            </p>
          </div>
        </div>

        {/* Filter Badges & View Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-orange-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua Marker
            </button>
            <button
              onClick={() => setActiveFilter('pos')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeFilter === 'pos'
                  ? 'bg-orange-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pos ({checkpoints.length})
            </button>
            <button
              onClick={() => setActiveFilter('teams')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeFilter === 'teams'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Peserta ({teams.length})
            </button>
            {sosAlerts.length > 0 && (
              <button
                onClick={() => setActiveFilter('sos')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  activeFilter === 'sos'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-rose-400 hover:text-rose-300'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                SOS ({sosAlerts.filter((s) => s.status === 'active').length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCenterSelectedPos}
              title="Fokuskan peta ke Pos Jaga aktif"
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Target className="w-3.5 h-3.5 text-orange-400" />
              <span>Ke Pos Jaga</span>
            </button>

            <button
              onClick={handleFitAllBounds}
              title="Tampilkan seluruh pos dan peserta"
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Fit Zoom</span>
            </button>

            <button
              onClick={() => setLiveGpsTracking(!liveGpsTracking)}
              title={liveGpsTracking ? 'Jeda simulasi pergerakan GPS' : 'Aktifkan simulasi pergerakan GPS'}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-colors ${
                liveGpsTracking
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${liveGpsTracking ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{liveGpsTracking ? 'GPS Live' : 'GPS Jeda'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Leaflet Map Canvas Container */}
      <div className="relative w-full h-[420px] bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Legend Overlay at Bottom Right */}
        <div className="absolute bottom-3 right-3 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 shadow-2xl text-[10px] text-slate-300 space-y-1.5 pointer-events-auto">
          <div className="font-bold text-white text-[11px] mb-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-orange-400" /> Legenda Radar Leaflet
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-orange-500 text-slate-950 flex items-center justify-center font-bold text-[8px]">P2</span>
            <span>Pos Jaga / Checkpoint Lomba</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[8px]">A-01</span>
            <span>Posisi GPS Peserta (Realtime)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0 border-b-2 border-dashed border-orange-500"></span>
            <span>Rute Jalur Pergerakan Lomba</span>
          </div>
        </div>
      </div>
    </div>
  );
};
