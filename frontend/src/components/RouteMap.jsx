import React, { useEffect, useState, useRef } from 'react';
import { Layers } from 'lucide-react';
import L from 'leaflet';

// Helper to load Mapbox SDK script and stylesheet from CDN
const loadMapboxScript = (callback) => {
  if (window.mapboxgl) {
    callback();
    return;
  }

  // Inject Mapbox stylesheet
  const cssId = 'mapbox-sdk-css';
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.css';
    link.rel = 'stylesheet';
    link.id = cssId;
    document.head.appendChild(link);
  }

  // Inject Mapbox script
  const scriptId = 'mapbox-sdk-script';
  let script = document.getElementById(scriptId);

  if (script) {
    script.addEventListener('load', () => callback());
    return;
  }

  script = document.createElement('script');
  script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.js';
  script.id = scriptId;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    if (callback) callback();
  };
  script.onerror = () => {
    console.error("Failed to load Mapbox GL JS script.");
  };
  document.body.appendChild(script);
};

// Calculate mathematical bearing (heading angle in degrees) between coordinates
function getBearing(startLat, startLng, endLat, endLng) {
  const dLng = (endLng - startLng) * Math.PI / 180;
  const lat1 = startLat * Math.PI / 180;
  const lat2 = endLat * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  let brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

export default function RouteMap({ 
  routes = [], 
  selectedRouteId, 
  startCoords, 
  endCoords, 
  chargingStations = [], 
  onSelectRoute,
  userLocation = null, // GPS location
  isTracking = false
}) {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [mapType, setMapType] = useState('dark'); // 'dark' (minimal light style), 'roadmap', 'satellite', 'hybrid'
  const [apiKey, setApiKey] = useState(localStorage.getItem('mapbox_access_token') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [is3DDriverView, setIs3DDriverView] = useState(true);
  const [mapStyleLoaded, setMapStyleLoaded] = useState(false);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);
  const prevLocRef = useRef(null);
  const bearingRef = useRef(0);

  // Dynamic Mapbox Loader
  useEffect(() => {
    loadMapboxScript(() => {
      setSdkLoaded(true);
    });
  }, []);

  // Track previous location coordinates and calculate real-time bearing angle
  useEffect(() => {
    if (userLocation) {
      if (prevLocRef.current && (prevLocRef.current[0] !== userLocation[0] || prevLocRef.current[1] !== userLocation[1])) {
        const heading = getBearing(
          prevLocRef.current[0], prevLocRef.current[1],
          userLocation[0], userLocation[1]
        );
        if (heading !== 0) {
          bearingRef.current = heading;
        }
      }
      prevLocRef.current = userLocation;
    } else {
      prevLocRef.current = null;
      bearingRef.current = 0;
    }
  }, [userLocation]);

  // Initialize Mapbox/Leaflet map instance
  useEffect(() => {
    if (!sdkLoaded || !mapRef.current) return;

    if (useFallback) {
      // Leaflet Fallback initialization
      if (!mapInstanceRef.current) {
        const initialCenter = startCoords 
          ? [startCoords[0], startCoords[1]]
          : [28.6139, 77.2090]; // [lat, lng] for Leaflet

        try {
          const leafletMap = L.map(mapRef.current, {
            center: initialCenter,
            zoom: 11,
            zoomControl: false
          });

          // Add zoom control at bottom-right
          L.control.zoom({ position: 'bottomright' }).addTo(leafletMap);

          // Add CartoDB Positron (Light) tile layer
          const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
          }).addTo(leafletMap);

          mapInstanceRef.current = {
            type: 'leaflet',
            leafletMap,
            tileLayer,
            resize: () => leafletMap.invalidateSize(),
            remove: () => leafletMap.remove()
          };
          setMapStyleLoaded(true);
        } catch (err) {
          console.error("Leaflet fallback initialization failed:", err);
        }
      }
    } else {
      // Mapbox GL JS initialization
      if (!mapInstanceRef.current) {
        if (!window.mapboxgl || !window.mapboxgl.supported()) {
          console.warn("Mapbox GL JS is not supported or loaded on this browser. Falling back to Leaflet.");
          setUseFallback(true);
          return;
        }

        try {
          const defaultToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
          const activeToken = apiKey || defaultToken;
          window.mapboxgl.accessToken = activeToken;

          const initialCenter = startCoords 
            ? [startCoords[1], startCoords[0]] // Mapbox uses [lng, lat]
            : [77.2090, 28.6139];

          const map = new window.mapboxgl.Map({
            container: mapRef.current,
            style: 'mapbox://styles/mapbox/light-v11',
            center: initialCenter,
            zoom: 11,
            pitch: 0,
            bearing: 0,
            attributionControl: false
          });

          // Add navigation zoom controls
          map.addControl(new window.mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

          map.on('style.load', () => {
            setMapStyleLoaded(true);
          });

          map.on('error', (e) => {
            console.error("Mapbox GL JS error caught:", e);
            if (e.error && (e.error.status === 401 || e.error.status === 403)) {
              console.warn("Mapbox authentication/token invalid. Switching to Leaflet fallback.");
              map.remove();
              mapInstanceRef.current = null;
              setUseFallback(true);
            }
          });

          mapInstanceRef.current = {
            type: 'mapbox',
            mapboxMap: map,
            resize: () => map.resize(),
            remove: () => map.remove()
          };
        } catch (err) {
          console.warn("Mapbox setup threw error. Falling back to Leaflet:", err);
          setUseFallback(true);
        }
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapStyleLoaded(false);
      }
    };
  }, [sdkLoaded, useFallback]);

  // Handle map type styles changing
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !sdkLoaded) return;

    if (map.type === 'leaflet') {
      const leafletMap = map.leafletMap;
      if (map.tileLayer) {
        leafletMap.removeLayer(map.tileLayer);
      }

      let tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      let attrib = '&copy; OpenStreetMap contributors &copy; CARTO';
      
      if (mapType === 'satellite' || mapType === 'hybrid') {
        tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        attrib = 'Tiles &copy; Esri';
      } else if (mapType === 'roadmap') {
        tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        attrib = '&copy; OpenStreetMap contributors';
      }

      map.tileLayer = L.tileLayer(tileUrl, { attribution: attrib }).addTo(leafletMap);
      setMapStyleLoaded(true);
      return;
    }

    // Mapbox Style switcher
    let styleUrl = 'mapbox://styles/mapbox/light-v11';
    if (mapType === 'roadmap') styleUrl = 'mapbox://styles/mapbox/streets-v12';
    else if (mapType === 'satellite') styleUrl = 'mapbox://styles/mapbox/satellite-v9';
    else if (mapType === 'hybrid') styleUrl = 'mapbox://styles/mapbox/satellite-streets-v12';

    setMapStyleLoaded(false);
    map.mapboxMap.setStyle(styleUrl);
  }, [mapType, sdkLoaded]);

  // Redraw overlays whenever style loads or dependency data updates
  useEffect(() => {
    if (!sdkLoaded || !mapInstanceRef.current || !mapStyleLoaded) return;

    const map = mapInstanceRef.current;
    map.resize();

    // ----------------------------------------------------
    // CASE A: LEAFLET RENDERING PATHWAY
    // ----------------------------------------------------
    if (map.type === 'leaflet') {
      const leafletMap = map.leafletMap;

      // 1. Clear previous markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      // 2. Clear previous polylines
      polylinesRef.current.forEach(p => leafletMap.removeLayer(p));
      polylinesRef.current = [];

      // 3. Draw Start Marker
      if (startCoords) {
        const popupContent = `<div class="text-[11px] font-sans text-slate-900 leading-normal"><strong class="text-[#10b981] block">Origin</strong>Starting Point Location</div>`;
        const marker = L.marker([startCoords[0], startCoords[1]], {
          icon: L.divIcon({
            className: 'custom-leaflet-marker',
            html: `
              <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg border border-white/20 bg-[#10b981] text-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="3" fill="currentColor"/>
                </svg>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).bindPopup(popupContent).addTo(leafletMap);
        markersRef.current.push(marker);
      }

      // 4. Draw End Marker
      if (endCoords) {
        const popupContent = `<div class="text-[11px] font-sans text-slate-900 leading-normal"><strong class="text-[#ef4444] block">Destination</strong>Arrival Location</div>`;
        const marker = L.marker([endCoords[0], endCoords[1]], {
          icon: L.divIcon({
            className: 'custom-leaflet-marker',
            html: `
              <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg border border-white/20 bg-[#ef4444] text-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3" fill="currentColor"/>
                </svg>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).bindPopup(popupContent).addTo(leafletMap);
        markersRef.current.push(marker);
      }

      // 5. Draw EV Charging Hubs
      chargingStations.forEach((station) => {
        const popupContent = `
          <div class="text-[11px] font-sans text-slate-900 leading-normal">
            <strong class="text-[#d97706] block">${station.name}</strong>
            <span class="text-slate-500">${station.type}</span>
            <span class="block mt-1 font-bold text-green-600">Active EV Hub</span>
          </div>
        `;
        const marker = L.marker([station.lat, station.lng], {
          icon: L.divIcon({
            className: 'custom-leaflet-marker',
            html: `
              <div class="flex items-center justify-center w-7 h-7 rounded-full shadow-md border border-white/20 bg-[#f59e0b] text-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" stroke="none"/>
                </svg>
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          })
        }).bindPopup(popupContent).addTo(leafletMap);
        markersRef.current.push(marker);
      });

      // 6. Draw Route lines
      routes.forEach((route) => {
        const isSelected = route.id === selectedRouteId;
        const routeColor = isSelected 
          ? (route.ecoScore >= 80 ? '#10b981' : '#3b82f6')
          : '#7c7c67';

        const polyline = L.polyline(route.coordinates, {
          color: routeColor,
          weight: isSelected ? 6 : 3.5,
          opacity: isSelected ? 0.95 : 0.45
        }).addTo(leafletMap);

        polyline.on('click', () => {
          if (onSelectRoute) onSelectRoute(route.id);
        });

        polyline.on('mouseover', () => {
          if (route.id !== selectedRouteId) {
            polyline.setStyle({ opacity: 0.8, weight: 5 });
          }
        });
        polyline.on('mouseout', () => {
          if (route.id !== selectedRouteId) {
            polyline.setStyle({ opacity: 0.45, weight: 3.5 });
          }
        });

        polylinesRef.current.push(polyline);
      });

      // 7. User Tracing / Active GPS marker
      if (userLocation) {
        const bearingAngle = bearingRef.current || 0;
        const arrowHtml = `
          <div style="transform: rotate(${bearingAngle}deg); transition: transform 0.1s ease-out;" class="w-8 h-8 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" stroke="white" stroke-width="2.5" class="w-7 h-7 shadow-lg filter drop-shadow-md">
              <path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z"/>
            </svg>
          </div>
        `;
        const pulseHtml = `
          <div class="relative w-6 h-6 flex items-center justify-center">
            <div class="absolute w-6 h-6 bg-blue-500 rounded-full animate-ping opacity-60"></div>
            <div class="w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-lg flex items-center justify-center">
              <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            </div>
          </div>
        `;
        const markerHtml = bearingAngle !== 0 ? arrowHtml : pulseHtml;
        const popupContent = `<div class="text-[11px] font-sans text-slate-900 leading-normal"><strong class="text-[#3b82f6] block">Your Location</strong>Active GPS Location Tracking</div>`;

        const marker = L.marker([userLocation[0], userLocation[1]], {
          icon: L.divIcon({
            className: 'custom-leaflet-user-marker',
            html: markerHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).bindPopup(popupContent).addTo(leafletMap);
        markersRef.current.push(marker);

        if (isTracking) {
          leafletMap.setView([userLocation[0], userLocation[1]], is3DDriverView ? 16 : 14);
        }
      } else {
        const bounds = [];
        if (startCoords) bounds.push([startCoords[0], startCoords[1]]);
        if (endCoords) bounds.push([endCoords[0], endCoords[1]]);
        routes.forEach(route => {
          route.coordinates.forEach(c => bounds.push([c[0], c[1]]));
        });

        if (bounds.length > 0) {
          leafletMap.fitBounds(bounds, { padding: [40, 40] });
        }
      }
      return;
    }

    // ----------------------------------------------------
    // CASE B: MAPBOX RENDERING PATHWAY
    // ----------------------------------------------------
    const mapboxMap = map.mapboxMap;

    // 1. Clear previous HTML markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // 2. Remove previously added layers and sources safely
    polylinesRef.current.forEach(routeId => {
      const layerId = `route-layer-${routeId}`;
      const sourceId = `route-source-${routeId}`;
      if (mapboxMap.getLayer(layerId)) mapboxMap.removeLayer(layerId);
      if (mapboxMap.getSource(sourceId)) mapboxMap.removeSource(sourceId);
    });
    polylinesRef.current = [];

    // 3. Draw Start Marker
    if (startCoords) {
      const el = document.createElement('div');
      el.className = 'custom-mapbox-marker cursor-pointer';
      el.innerHTML = `
        <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg border border-white/20 bg-[#10b981] text-white">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </svg>
        </div>
      `;

      const popup = new window.mapboxgl.Popup({ offset: 15 })
        .setHTML(`<div class="text-[11px] font-sans text-slate-900 leading-normal"><strong class="text-[#10b981] block">Origin</strong>Starting Point Location</div>`);

      const marker = new window.mapboxgl.Marker({ element: el })
        .setLngLat([startCoords[1], startCoords[0]])
        .setPopup(popup)
        .addTo(mapboxMap);

      markersRef.current.push(marker);
    }

    // 4. Draw End Marker
    if (endCoords) {
      const el = document.createElement('div');
      el.className = 'custom-mapbox-marker cursor-pointer';
      el.innerHTML = `
        <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg border border-white/20 bg-[#ef4444] text-white">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3" fill="currentColor"/>
          </svg>
        </div>
      `;

      const popup = new window.mapboxgl.Popup({ offset: 15 })
        .setHTML(`<div class="text-[11px] font-sans text-slate-900 leading-normal"><strong class="text-[#ef4444] block">Destination</strong>Arrival Location</div>`);

      const marker = new window.mapboxgl.Marker({ element: el })
        .setLngLat([endCoords[1], endCoords[0]])
        .setPopup(popup)
        .addTo(mapboxMap);

      markersRef.current.push(marker);
    }

    // 5. Draw EV Charging Hubs
    chargingStations.forEach((station) => {
      const el = document.createElement('div');
      el.className = 'custom-mapbox-marker cursor-pointer';
      el.innerHTML = `
        <div class="flex items-center justify-center w-7 h-7 rounded-full shadow-md border border-white/20 bg-[#f59e0b] text-white">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" stroke="none"/>
          </svg>
        </div>
      `;

      const popup = new window.mapboxgl.Popup({ offset: 15 })
        .setHTML(`
          <div class="text-[11px] font-sans text-slate-900 leading-normal">
            <strong class="text-[#d97706] block">${station.name}</strong>
            <span class="text-slate-500">${station.type}</span>
            <span class="block mt-1 font-bold text-green-600">Active EV Hub</span>
          </div>
        `);

      const marker = new window.mapboxgl.Marker({ element: el })
        .setLngLat([station.lng, station.lat])
        .setPopup(popup)
        .addTo(mapboxMap);

      markersRef.current.push(marker);
    });

    // 6. Add GeoJSON Sources & Route Polyline Layers
    routes.forEach((route) => {
      const isSelected = route.id === selectedRouteId;
      const routeColor = isSelected 
        ? (route.ecoScore >= 80 ? '#10b981' : '#3b82f6')
        : '#7c7c67';

      const sourceId = `route-source-${route.id}`;
      const layerId = `route-layer-${route.id}`;

      mapboxMap.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: route.coordinates.map(c => [c[1], c[0]])
          }
        }
      });

      mapboxMap.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': routeColor,
          'line-width': isSelected ? 6 : 3.5,
          'line-opacity': isSelected ? 0.95 : 0.45
        }
      });

      polylinesRef.current.push(route.id);

      // Select route on click
      mapboxMap.on('click', layerId, () => {
        if (onSelectRoute) onSelectRoute(route.id);
      });

      // Hover configurations
      mapboxMap.on('mouseenter', layerId, () => {
        mapboxMap.getCanvas().style.cursor = 'pointer';
        if (route.id !== selectedRouteId) {
          mapboxMap.setPaintProperty(layerId, 'line-opacity', 0.8);
          mapboxMap.setPaintProperty(layerId, 'line-width', 5);
        }
      });

      mapboxMap.on('mouseleave', layerId, () => {
        mapboxMap.getCanvas().style.cursor = '';
        if (route.id !== selectedRouteId) {
          mapboxMap.setPaintProperty(layerId, 'line-opacity', 0.45);
          mapboxMap.setPaintProperty(layerId, 'line-width', 3.5);
        }
      });
    });

    // 7. Paint user tracing location marker
    if (userLocation) {
      const el = document.createElement('div');
      el.className = 'custom-mapbox-user-marker';

      if (bearingRef.current !== undefined && bearingRef.current !== 0) {
        el.innerHTML = `
          <div style="transform: rotate(${bearingRef.current}deg); transition: transform 0.1s ease-out;" class="w-8 h-8 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" stroke="white" stroke-width="2.5" class="w-7 h-7 shadow-lg filter drop-shadow-md">
              <path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z"/>
            </svg>
          </div>
        `;
      } else {
        el.innerHTML = `
          <div class="relative w-6 h-6 flex items-center justify-center">
            <div class="absolute w-6 h-6 bg-blue-500 rounded-full animate-ping opacity-60"></div>
            <div class="w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-lg flex items-center justify-center">
              <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            </div>
          </div>
        `;
      }

      const popup = new window.mapboxgl.Popup({ offset: 15 })
        .setHTML(`<div class="text-[11px] font-sans text-slate-900 leading-normal"><strong class="text-[#3b82f6] block">Your Location</strong>Active GPS Location Tracking</div>`);

      const marker = new window.mapboxgl.Marker({ element: el })
        .setLngLat([userLocation[1], userLocation[0]])
        .setPopup(popup)
        .addTo(mapboxMap);

      markersRef.current.push(marker);

      // Driving GPS viewport centering and tilt controls
      if (isTracking) {
        if (is3DDriverView) {
          mapboxMap.easeTo({
            center: [userLocation[1], userLocation[0]],
            zoom: 17,
            pitch: 55,
            bearing: bearingRef.current,
            duration: 300
          });
        } else {
          mapboxMap.easeTo({
            center: [userLocation[1], userLocation[0]],
            pitch: 0,
            bearing: 0,
            duration: 300
          });
        }
      }
    } else {
      // Normal map boundaries and fitting
      mapboxMap.setPitch(0);
      mapboxMap.setBearing(0);

      const allCoordinates = [];
      if (startCoords) allCoordinates.push(startCoords);
      if (endCoords) allCoordinates.push(endCoords);
      routes.forEach(route => {
        if (route.coordinates) {
          allCoordinates.push(...route.coordinates);
        }
      });

      if (allCoordinates.length > 0) {
        const bounds = new window.mapboxgl.LngLatBounds();
        allCoordinates.forEach(c => {
          bounds.extend([c[1], c[0]]);
        });
        mapboxMap.fitBounds(bounds, { padding: 50, duration: 1500 });
      }
    }
  }, [mapStyleLoaded, routes, selectedRouteId, startCoords, endCoords, chargingStations, userLocation, isTracking, is3DDriverView]);

  if (!sdkLoaded) {
    return (
      <div className="w-full h-[400px] md:h-[450px] relative rounded-2xl overflow-hidden border border-[#e8e8e3] shadow-inner bg-[#fbfbf9] flex flex-col items-center justify-center gap-4 text-[#5b5b4b]">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-12 h-12 border-2 border-[#7c7c67]/20 rounded-full animate-ping"></div>
          <div className="w-10 h-10 border-t-2 border-[#7c7c67] rounded-full animate-spin"></div>
        </div>
        <div className="text-xs uppercase font-bold tracking-widest text-[#7c7c67] font-accent animate-pulse">
          Initializing Engine Core...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] md:h-[450px] relative rounded-2xl overflow-hidden border border-[#e8e8e3] shadow-inner">
      {/* Map DOM Element */}
      <div ref={mapRef} className="w-full h-full bg-[#fbfbf9]" />

      {/* Layer Settings Selector HUD */}
      <div className="absolute top-4 right-4 z-[1000] glass-panel p-2 rounded-xl border border-[#d8d8d0] flex items-center gap-1.5 flex-wrap max-w-[90%] sm:max-w-none">
        <div className="flex gap-1">
          {[
            { id: 'dark', label: 'Soft' },
            { id: 'roadmap', label: 'Map' },
            { id: 'satellite', label: 'Sat' },
            { id: 'hybrid', label: 'Hybrid' }
          ].map(prov => (
            <button
              key={prov.id}
              onClick={() => setMapType(prov.id)}
              className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
                mapType === prov.id 
                  ? 'bg-[#7c7c67] text-[#fbfbf9] shadow-md' 
                  : 'bg-[#e8e8e3]/60 text-[#5b5b4b] hover:text-[#1d1d16]'
              }`}
            >
              {prov.label}
            </button>
          ))}
        </div>
        <span className="w-px h-3.5 bg-[#d8d8d0]"></span>
        {!useFallback && (
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
              apiKey 
                ? 'bg-[#7c7c67]/20 text-[#7c7c67] border border-[#7c7c67]/30' 
                : 'bg-[#5b5b4b]/20 text-[#5b5b4b] border border-[#5b5b4b]/30'
            }`}
          >
            Token
          </button>
        )}
        {useFallback && (
          <div className="px-2 py-1 bg-[#7c7c67]/10 text-[#7c7c67] text-[8px] font-bold uppercase tracking-wider rounded border border-[#7c7c67]/25 shadow-inner">
            Leaflet Mode
          </div>
        )}
      </div>

      {/* Mapbox Token Slider overlay */}
      {showKeyInput && !useFallback && (
        <div className="absolute top-16 right-4 z-[1000] glass-panel p-3 rounded-xl border border-[#d8d8d0] w-64 space-y-2 text-left animate-fade-slide-up">
          <div className="text-[10px] font-bold text-[#1d1d16]">MAPBOX ACCESS TOKEN</div>
          <input
            type="password"
            placeholder="Paste Token here..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-[#fbfbf9] border border-[#d8d8d0] rounded px-2.5 py-1 text-xs text-[#1d1d16] focus:outline-none focus:border-[#7c7c67]"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                localStorage.removeItem('mapbox_access_token');
                setApiKey('');
                setShowKeyInput(false);
                window.location.reload();
              }}
              className="px-2 py-1 rounded bg-[#1d1d16]/10 text-[#1d1d16] text-[9px] font-bold uppercase cursor-pointer hover:bg-[#1d1d16]/20 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => {
                localStorage.setItem('mapbox_access_token', apiKey);
                setShowKeyInput(false);
                window.location.reload();
              }}
              className="px-2 py-1 rounded bg-[#7c7c67] text-[#fbfbf9] text-[9px] font-bold uppercase cursor-pointer hover:bg-[#5b5b4b] transition-colors"
            >
              Save &amp; Load
            </button>
          </div>
          <div className="text-[8px] text-[#5b5b4b] leading-normal">
            Note: App will reload to load Mapbox with your token. Leave empty to use default public token.
          </div>
        </div>
      )}

      {/* 3D HUD Navigation View Toggle buttons */}
      {isTracking && userLocation && (
        <div className="absolute bottom-4 right-4 z-[1000] glass-panel p-2 rounded-xl border border-[#7c7c67]/30 flex items-center gap-1.5 shadow-lg bg-[#e8e8e3]/30">
          <span className="w-2 h-2 bg-[#7c7c67] rounded-full animate-ping"></span>
          <button
            onClick={() => setIs3DDriverView(!is3DDriverView)}
            className={`px-2.5 py-1.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer font-accent ${
              is3DDriverView 
                ? 'bg-[#7c7c67] text-white shadow-md' 
                : 'bg-[#e8e8e3]/60 text-[#5b5b4b] hover:text-[#1d1d16]'
            }`}
          >
            {is3DDriverView ? '3D HUD View: ON' : '3D HUD View: OFF'}
          </button>
        </div>
      )}

      {/* Map Legend indicators */}
      <div className="absolute bottom-4 left-4 z-[1000] glass-panel px-3 py-2.5 rounded-xl border border-[#e8e8e3] text-[10px] text-[#1d1d16] font-semibold space-y-1.5 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-4 h-1 bg-[#10b981] rounded"></span>
          <span>Optimal Eco Route</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-1 bg-[#3b82f6] rounded"></span>
          <span>Selected Balanced Route</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-1 bg-[#7c7c67] rounded"></span>
          <span>Alternative Paths</span>
        </div>
        {userLocation && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block"></span>
            <span>Live GPS / Simulated Location</span>
          </div>
        )}
      </div>
    </div>
  );
}
