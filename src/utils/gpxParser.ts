/**
 * GPX (GPS Exchange Format) File Parser Utility
 * Parses .gpx files containing trackpoints (<trkpt>), waypoints (<wpt>), and routes (<rtept>)
 * for overlaying routes on Leaflet maps and extracting race metrics.
 */

export interface GPXTrackPoint {
  lat: number;
  lng: number;
  ele?: number;
  time?: string;
}

export interface GPXWaypoint {
  name: string;
  lat: number;
  lng: number;
  desc?: string;
  ele?: number;
  symbol?: string;
}

export interface GPXRouteData {
  fileName: string;
  routeName: string;
  distanceKm: number;
  elevationGainMeters: number;
  trackpoints: GPXTrackPoint[];
  waypoints: GPXWaypoint[];
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

/**
 * Calculates Haversine distance in kilometers between two lat/lng coordinates
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Parses raw GPX XML string into GPXRouteData
 */
export function parseGPXString(xmlContent: string, fileName: string = 'route.gpx'): GPXRouteData {
  if (!xmlContent || typeof xmlContent !== 'string') {
    throw new Error('Data GPX kosong atau tidak valid.');
  }

  // Sanitize unescaped ampersands or malformed entity references in XML string before parsing
  let sanitizedXml = xmlContent.trim();
  sanitizedXml = sanitizedXml.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');

  const parser = new DOMParser();
  let xmlDoc = parser.parseFromString(sanitizedXml, 'text/xml');

  let parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    // Try fallback parsing with HTML parser if XML strict entity mode fails
    try {
      const htmlDoc = parser.parseFromString(sanitizedXml, 'text/html');
      if (htmlDoc.querySelectorAll('trkpt, rtept, wpt').length > 0) {
        xmlDoc = htmlDoc;
        parseError = null;
      }
    } catch {
      // Keep original XML parse error
    }
  }

  if (parseError) {
    throw new Error(`Format berkas GPX tidak valid atau XML bermasalah: ${parseError.textContent}`);
  }

  // Extract Route/Track Name
  const nameEl = xmlDoc.querySelector('trk > name, rte > name, metadata > name, gpx > name');
  const routeName = nameEl?.textContent?.trim() || fileName.replace(/\.gpx$/i, '');

  const trackpoints: GPXTrackPoint[] = [];
  const waypoints: GPXWaypoint[] = [];

  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  const updateBounds = (lat: number, lng: number) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  };

  // 1. Extract Trackpoints (<trkpt>) or Routepoints (<rtept>)
  const trkptEls = xmlDoc.querySelectorAll('trkpt, rtept');
  trkptEls.forEach((pt) => {
    const latStr = pt.getAttribute('lat');
    const lonStr = pt.getAttribute('lon');
    if (latStr && lonStr) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lonStr);
      if (!isNaN(lat) && !isNaN(lng)) {
        const eleEl = pt.querySelector('ele');
        const timeEl = pt.querySelector('time');
        const ele = eleEl ? parseFloat(eleEl.textContent || '0') : undefined;
        const time = timeEl ? timeEl.textContent || undefined : undefined;

        trackpoints.push({ lat, lng, ele, time });
        updateBounds(lat, lng);
      }
    }
  });

  // 2. Extract Waypoints (<wpt>)
  const wptEls = xmlDoc.querySelectorAll('wpt');
  wptEls.forEach((wpt, index) => {
    const latStr = wpt.getAttribute('lat');
    const lonStr = wpt.getAttribute('lon');
    if (latStr && lonStr) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lonStr);
      if (!isNaN(lat) && !isNaN(lng)) {
        const nameNode = wpt.querySelector('name');
        const descNode = wpt.querySelector('desc, cmt');
        const eleNode = wpt.querySelector('ele');
        const symNode = wpt.querySelector('sym');

        const name = nameNode?.textContent?.trim() || `Waypoint ${index + 1}`;
        const desc = descNode?.textContent?.trim();
        const ele = eleNode ? parseFloat(eleNode.textContent || '0') : undefined;
        const symbol = symNode?.textContent?.trim();

        waypoints.push({ name, lat, lng, desc, ele, symbol });
        updateBounds(lat, lng);
      }
    }
  });

  if (trackpoints.length === 0 && waypoints.length === 0) {
    throw new Error('Berkas GPX tidak berisi data titik rute (trkpt) atau waypoint (wpt) yang valid.');
  }

  // Calculate total distance & elevation gain
  let totalDistanceKm = 0;
  let elevationGainMeters = 0;

  for (let i = 1; i < trackpoints.length; i++) {
    const prev = trackpoints[i - 1];
    const curr = trackpoints[i];
    const dist = calculateHaversineDistanceKm(prev.lat, prev.lng, curr.lat, curr.lng);
    totalDistanceKm += dist;

    if (prev.ele !== undefined && curr.ele !== undefined && curr.ele > prev.ele) {
      elevationGainMeters += curr.ele - prev.ele;
    }
  }

  // Fallback bounds if empty
  if (minLat === 90) {
    minLat = -6.6388;
    maxLat = -6.6388;
    minLng = 106.8864;
    maxLng = 106.8864;
  }

  return {
    fileName,
    routeName,
    distanceKm: Number(totalDistanceKm.toFixed(2)),
    elevationGainMeters: Math.round(elevationGainMeters),
    trackpoints,
    waypoints,
    bounds: {
      minLat,
      maxLat,
      minLng,
      maxLng,
    },
  };
}

/**
 * Generate sample GPX XML string for demo route (Lembah Pinus Gunung Pancar)
 */
export function generateSampleGPXContent(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RacePoint GPX Generator" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Rute Lomba Gunung Pancar Trail Run 10K</name>
    <desc>Rute resmi jalur hutan pinus &amp; bukit telaga</desc>
  </metadata>

  <wpt lat="-6.6388" lon="106.8864">
    <name>Pos 1: Start Lembah Pinus</name>
    <desc>Garis start utama peserta</desc>
  </wpt>
  <wpt lat="-6.6420" lon="106.8900">
    <name>Pos 2: Water Station Hutan Pinus</name>
    <desc>Pos nutrisi dan penambahan air minum</desc>
  </wpt>
  <wpt lat="-6.6480" lon="106.8950">
    <name>Pos 3: Puncak Curug Kencana</name>
    <desc>Pos misi foto formasi regu</desc>
  </wpt>

  <trk>
    <name>Jalur Lomba Gunung Pancar 10K</name>
    <trkseg>
      <trkpt lat="-6.6388" lon="106.8864"><ele>450</ele></trkpt>
      <trkpt lat="-6.6400" lon="106.8880"><ele>465</ele></trkpt>
      <trkpt lat="-6.6420" lon="106.8900"><ele>490</ele></trkpt>
      <trkpt lat="-6.6450" lon="106.8925"><ele>520</ele></trkpt>
      <trkpt lat="-6.6480" lon="106.8950"><ele>560</ele></trkpt>
      <trkpt lat="-6.6510" lon="106.8920"><ele>530</ele></trkpt>
      <trkpt lat="-6.6470" lon="106.8880"><ele>480</ele></trkpt>
      <trkpt lat="-6.6420" lon="106.8850"><ele>460</ele></trkpt>
      <trkpt lat="-6.6388" lon="106.8864"><ele>450</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;
}
