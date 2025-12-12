import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Package, Truck, CheckCircle, Clock, Navigation, Layers, Play, Pause, RefreshCw } from 'lucide-react';
import type { IEmissao } from '../../types/IEmissao';
import { motion } from 'framer-motion';
import { useMapTrackingData } from '../../hooks/useMapTrackingData';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ShipmentTrackingMapProps {
  emissoes: IEmissao[];
  enableAutoRefresh?: boolean;
  refreshIntervalMs?: number;
  isAdmin?: boolean;
}

// Brazilian state capitals coordinates
const BRAZIL_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'AC': { lat: -9.975, lng: -67.825 },
  'AL': { lat: -9.649, lng: -35.709 },
  'AM': { lat: -3.118, lng: -60.021 },
  'AP': { lat: 0.035, lng: -51.066 },
  'BA': { lat: -12.971, lng: -38.511 },
  'CE': { lat: -3.731, lng: -38.526 },
  'DF': { lat: -15.794, lng: -47.882 },
  'ES': { lat: -20.319, lng: -40.338 },
  'GO': { lat: -16.686, lng: -49.264 },
  'MA': { lat: -2.530, lng: -44.305 },
  'MG': { lat: -19.920, lng: -43.937 },
  'MS': { lat: -20.442, lng: -54.646 },
  'MT': { lat: -15.595, lng: -56.096 },
  'PA': { lat: -1.455, lng: -48.490 },
  'PB': { lat: -7.119, lng: -34.845 },
  'PE': { lat: -8.047, lng: -34.877 },
  'PI': { lat: -5.092, lng: -42.804 },
  'PR': { lat: -25.429, lng: -49.271 },
  'RJ': { lat: -22.906, lng: -43.172 },
  'RN': { lat: -5.795, lng: -35.209 },
  'RO': { lat: -8.762, lng: -63.900 },
  'RR': { lat: 2.819, lng: -60.673 },
  'RS': { lat: -30.027, lng: -51.229 },
  'SC': { lat: -27.595, lng: -48.549 },
  'SE': { lat: -10.947, lng: -37.073 },
  'SP': { lat: -23.550, lng: -46.633 },
  'TO': { lat: -10.184, lng: -48.334 },
};

// Major cities coordinates for more precise routing
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'SAO PAULO': { lat: -23.550, lng: -46.633 },
  'RIO DE JANEIRO': { lat: -22.906, lng: -43.172 },
  'BELO HORIZONTE': { lat: -19.920, lng: -43.937 },
  'BRASILIA': { lat: -15.794, lng: -47.882 },
  'SALVADOR': { lat: -12.971, lng: -38.511 },
  'CURITIBA': { lat: -25.429, lng: -49.271 },
  'FORTALEZA': { lat: -3.731, lng: -38.526 },
  'RECIFE': { lat: -8.047, lng: -34.877 },
  'PORTO ALEGRE': { lat: -30.027, lng: -51.229 },
  'MANAUS': { lat: -3.118, lng: -60.021 },
  'GOIANIA': { lat: -16.686, lng: -49.264 },
  'CAMPINAS': { lat: -22.905, lng: -47.061 },
  'GUARULHOS': { lat: -23.462, lng: -46.533 },
  'SANTOS': { lat: -23.960, lng: -46.333 },
  'FLORIANOPOLIS': { lat: -27.595, lng: -48.549 },
  'VITORIA': { lat: -20.319, lng: -40.338 },
  'NATAL': { lat: -5.795, lng: -35.209 },
  'JOAO PESSOA': { lat: -7.119, lng: -34.845 },
  'MACEIO': { lat: -9.649, lng: -35.709 },
  'TERESINA': { lat: -5.092, lng: -42.804 },
  'SAO LUIS': { lat: -2.530, lng: -44.305 },
  'BELEM': { lat: -1.455, lng: -48.490 },
  'CUIABA': { lat: -15.595, lng: -56.096 },
  'CAMPO GRANDE': { lat: -20.442, lng: -54.646 },
};

const STATUS_COLORS: Record<string, string> = {
  'PRE_POSTADO': '#8B5CF6',
  'POSTADO': '#3B82F6',
  'COLETADO': '#06B6D4',
  'EM_TRANSITO': '#F59E0B',
  'AGUARDANDO_RETIRADA': '#F97316',
  'ENTREGUE': '#10B981',
  'CANCELADO': '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  'PRE_POSTADO': 'Pré-Postado',
  'POSTADO': 'Postado',
  'COLETADO': 'Coletado',
  'EM_TRANSITO': 'Em Trânsito',
  'AGUARDANDO_RETIRADA': 'Aguard. Retirada',
  'ENTREGUE': 'Entregue',
  'CANCELADO': 'Cancelado',
};

// Get coordinates from city name or UF
const getCoordinates = (city?: string, uf?: string): { lat: number; lng: number } => {
  if (city) {
    const normalizedCity = city.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (CITY_COORDINATES[normalizedCity]) {
      return CITY_COORDINATES[normalizedCity];
    }
  }
  
  if (uf) {
    const normalizedUf = uf.toUpperCase();
    if (BRAZIL_COORDINATES[normalizedUf]) {
      return BRAZIL_COORDINATES[normalizedUf];
    }
  }
  
  return BRAZIL_COORDINATES['SP'];
};

// Calculate intermediate points for curved route animation
const calculateRoutePoints = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  progress: number // 0 to 1
): { lat: number; lng: number }[] => {
  const points: { lat: number; lng: number }[] = [];
  const numPoints = 50;
  
  // Calculate control point for Bezier curve (arc effect)
  const midLat = (origin.lat + destination.lat) / 2;
  const midLng = (origin.lng + destination.lng) / 2;
  const distance = Math.sqrt(
    Math.pow(destination.lat - origin.lat, 2) + 
    Math.pow(destination.lng - origin.lng, 2)
  );
  
  // Add curvature based on distance
  const curvature = distance * 0.15;
  const controlLat = midLat + curvature;
  const controlLng = midLng;
  
  const progressPoints = Math.floor(numPoints * progress);
  
  for (let i = 0; i <= progressPoints; i++) {
    const t = i / numPoints;
    // Quadratic Bezier curve
    const lat = Math.pow(1 - t, 2) * origin.lat + 
                2 * (1 - t) * t * controlLat + 
                Math.pow(t, 2) * destination.lat;
    const lng = Math.pow(1 - t, 2) * origin.lng + 
                2 * (1 - t) * t * controlLng + 
                Math.pow(t, 2) * destination.lng;
    points.push({ lat, lng });
  }
  
  return points;
};

// Calculate current position based on status
const getProgressByStatus = (status: string): number => {
  switch (status) {
    case 'PRE_POSTADO': return 0;
    case 'POSTADO': return 0.15;
    case 'COLETADO': return 0.35;
    case 'EM_TRANSITO': return 0.65;
    case 'AGUARDANDO_RETIRADA': return 0.9;
    case 'ENTREGUE': return 1;
    case 'CANCELADO': return 0;
    default: return 0;
  }
};

export const ShipmentTrackingMap = ({ 
  emissoes, 
  enableAutoRefresh = false,
  refreshIntervalMs = 5 * 60 * 1000, // 5 minutes
  isAdmin = false
}: ShipmentTrackingMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routesRef = useRef<L.LayerGroup | null>(null);
  const animatedMarkersRef = useRef<L.LayerGroup | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<'light' | 'dark'>('light');
  const [showRoutes, setShowRoutes] = useState(true);
  const [isAnimating, setIsAnimating] = useState(true);
  const animationFrameRef = useRef<number | null>(null);

  // Use auto-refresh hook
  const { 
    emissoes: trackedEmissoes, 
    isRefreshing, 
    lastUpdated,
    refresh 
  } = useMapTrackingData(emissoes, {
    enabled: enableAutoRefresh,
    refreshInterval: refreshIntervalMs,
  });

  // Use tracked emissoes if auto-refresh is enabled, otherwise use props
  const dataEmissoes = enableAutoRefresh ? trackedEmissoes : emissoes;

  // Process emissions with origin and destination coordinates
  const processedEmissoes = useMemo(() => {
    return dataEmissoes.map(emissao => {
      // Origin from remetente
      const remetenteUf = emissao.remetente?.endereco?.uf || 'SP';
      const remetenteCidade = emissao.remetente?.endereco?.localidade;
      const origin = getCoordinates(remetenteCidade, remetenteUf);
      
      // Add small jitter to origin to prevent stacking
      const originJitter = {
        lat: origin.lat + (Math.random() - 0.5) * 0.3,
        lng: origin.lng + (Math.random() - 0.5) * 0.3
      };
      
      // Destination from destinatario
      const destUf = emissao.destinatario?.endereco?.uf || 'RJ';
      const destCidade = emissao.destinatario?.endereco?.localidade;
      const destination = getCoordinates(destCidade, destUf);
      
      // Add small jitter to destination
      const destJitter = {
        lat: destination.lat + (Math.random() - 0.5) * 0.3,
        lng: destination.lng + (Math.random() - 0.5) * 0.3
      };
      
      // Calculate current position based on status
      const progress = getProgressByStatus(emissao.status || 'PRE_POSTADO');
      const routePoints = calculateRoutePoints(originJitter, destJitter, 1);
      const currentPointIndex = Math.floor(routePoints.length * progress);
      const currentPosition = routePoints[Math.min(currentPointIndex, routePoints.length - 1)] || originJitter;
      
      return {
        ...emissao,
        origin: originJitter,
        destination: destJitter,
        currentPosition,
        progress,
        routePoints
      };
    });
  }, [dataEmissoes]);

  // Statistics by state
  const statsByState = useMemo(() => {
    return processedEmissoes.reduce((acc, e) => {
      const uf = e.destinatario?.endereco?.uf?.toUpperCase() || 'SP';
      if (!acc[uf]) acc[uf] = { total: 0, statuses: {} as Record<string, number> };
      acc[uf].total += 1;
      const status = e.status || 'PRE_POSTADO';
      acc[uf].statuses[status] = (acc[uf].statuses[status] || 0) + 1;
      return acc;
    }, {} as Record<string, { total: number; statuses: Record<string, number> }>);
  }, [processedEmissoes]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      center: [-14.235, -51.925],
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map.current);
    markersRef.current = L.layerGroup().addTo(map.current);
    routesRef.current = L.layerGroup().addTo(map.current);
    animatedMarkersRef.current = L.layerGroup().addTo(map.current);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update tile layer
  useEffect(() => {
    if (!map.current) return;

    map.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.current?.removeLayer(layer);
      }
    });

    const tileUrl = mapStyle === 'light'
      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map.current);
  }, [mapStyle]);

  // Update markers and routes
  useEffect(() => {
    if (!map.current || !markersRef.current || !routesRef.current || !animatedMarkersRef.current) return;

    markersRef.current.clearLayers();
    routesRef.current.clearLayers();
    animatedMarkersRef.current.clearLayers();

    const filteredEmissoes = activeFilter
      ? processedEmissoes.filter(e => e.status === activeFilter)
      : processedEmissoes;

    // Create origin marker icon
    const createOriginIcon = () => {
      return L.divIcon({
        className: 'origin-marker',
        html: `
          <div style="
            width: 16px;
            height: 16px;
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.5);
          "></div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
    };

    // Create destination marker icon
    const createDestinationIcon = (status: string) => {
      const color = STATUS_COLORS[status] || '#6B7280';
      return L.divIcon({
        className: 'dest-marker',
        html: `
          <div style="
            width: 24px;
            height: 24px;
            background: ${color};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 3px 10px ${color}80;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 8px;
              height: 8px;
              background: white;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24],
      });
    };

    // Create animated package icon (for in-transit)
    const createPackageIcon = (status: string) => {
      const color = STATUS_COLORS[status] || '#F59E0B';
      return L.divIcon({
        className: 'package-marker',
        html: `
          <div style="
            width: 28px;
            height: 28px;
            background: linear-gradient(135deg, ${color} 0%, ${color}cc 100%);
            border-radius: 8px;
            border: 2px solid white;
            box-shadow: 0 4px 12px ${color}60;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: pulse 2s infinite;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      });
    };

    // Add markers and routes for each shipment
    filteredEmissoes.forEach(emissao => {
      const status = emissao.status || 'PRE_POSTADO';
      
      if (showRoutes && emissao.status !== 'PRE_POSTADO' && emissao.status !== 'CANCELADO') {
        // Draw route line
        const routeCoords = emissao.routePoints.map(p => [p.lat, p.lng] as [number, number]);
        
        // Dashed line for remaining route
        const fullRoute = L.polyline(routeCoords, {
          color: '#94A3B8',
          weight: 2,
          opacity: 0.4,
          dashArray: '5, 10',
        });
        routesRef.current?.addLayer(fullRoute);
        
        // Solid animated line for completed route
        const progressCoords = routeCoords.slice(0, Math.floor(routeCoords.length * emissao.progress) + 1);
        if (progressCoords.length > 1) {
          const progressRoute = L.polyline(progressCoords, {
            color: STATUS_COLORS[status],
            weight: 3,
            opacity: 0.8,
            className: 'animated-route',
          });
          routesRef.current?.addLayer(progressRoute);
        }
        
        // Origin marker
        const originMarker = L.marker([emissao.origin.lat, emissao.origin.lng], {
          icon: createOriginIcon(),
        });
        markersRef.current?.addLayer(originMarker);
      }
      
      // Destination marker
      const destMarker = L.marker(
        [emissao.destination.lat, emissao.destination.lng],
        { icon: createDestinationIcon(status) }
      );

      const popupContent = `
        <div style="font-family: system-ui; min-width: 220px;">
          <div style="
            background: linear-gradient(135deg, ${STATUS_COLORS[status]} 0%, ${STATUS_COLORS[status]}dd 100%);
            color: white;
            padding: 14px;
            margin: -10px -10px 12px -10px;
            border-radius: 4px 4px 0 0;
          ">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="font-size: 15px;">${emissao.codigoObjeto || 'N/A'}</strong>
              <span style="font-size: 11px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 12px;">
                ${Math.round(emissao.progress * 100)}%
              </span>
            </div>
            <div style="font-size: 12px; opacity: 0.95; margin-top: 4px;">
              ${STATUS_LABELS[status]}
            </div>
          </div>
          <div style="padding: 0 4px;">
            <div style="margin-bottom: 10px;">
              <div style="font-size: 11px; color: #64748B; margin-bottom: 3px; display: flex; align-items: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                Origem
              </div>
              <div style="font-size: 13px; color: #1E293B; font-weight: 500;">
                ${emissao.remetente?.endereco?.localidade || 'N/A'} - ${emissao.remetente?.endereco?.uf || ''}
              </div>
            </div>
            <div style="margin-bottom: 10px;">
              <div style="font-size: 11px; color: #64748B; margin-bottom: 3px; display: flex; align-items: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F97316" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Destino
              </div>
              <div style="font-size: 13px; font-weight: 500; color: #1E293B;">
                ${emissao.destinatario?.nome || 'N/A'}
              </div>
              <div style="font-size: 12px; color: #475569;">
                ${emissao.destinatario?.endereco?.localidade || ''} - ${emissao.destinatario?.endereco?.uf || ''}
              </div>
            </div>
            <div style="
              display: flex;
              justify-content: space-between;
              background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
              padding: 10px;
              border-radius: 8px;
              margin-top: 8px;
            ">
              <div>
                <div style="font-size: 10px; color: #94A3B8;">Transportadora</div>
                <div style="font-size: 12px; font-weight: 600; color: #F97316;">
                  ${emissao.transportadora || 'N/A'}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 10px; color: #94A3B8;">Valor</div>
                <div style="font-size: 12px; font-weight: 600; color: #10B981;">
                  R$ ${emissao.valor || '0.00'}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      destMarker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup'
      });
      markersRef.current?.addLayer(destMarker);

      // Add animated package marker for in-transit
      if (emissao.status === 'EM_TRANSITO' && isAnimating) {
        const packageMarker = L.marker(
          [emissao.currentPosition.lat, emissao.currentPosition.lng],
          { icon: createPackageIcon(status) }
        );
        packageMarker.bindPopup(popupContent, { maxWidth: 300 });
        animatedMarkersRef.current?.addLayer(packageMarker);
      }
    });

  }, [processedEmissoes, activeFilter, mapStyle, showRoutes, isAnimating]);

  // Status filter counts
  const statusCounts = useMemo(() => {
    return processedEmissoes.reduce((acc, e) => {
      const status = e.status || 'PRE_POSTADO';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [processedEmissoes]);

  const filterButtons = [
    { status: null, label: 'Todos', icon: Package, count: processedEmissoes.length },
    { status: 'EM_TRANSITO', label: 'Em Trânsito', icon: Truck, count: statusCounts['EM_TRANSITO'] || 0 },
    { status: 'ENTREGUE', label: 'Entregues', icon: CheckCircle, count: statusCounts['ENTREGUE'] || 0 },
    { status: 'PRE_POSTADO', label: 'Pré-Postado', icon: Clock, count: statusCounts['PRE_POSTADO'] || 0 },
    { status: 'AGUARDANDO_RETIRADA', label: 'Aguard. Retirada', icon: MapPin, count: statusCounts['AGUARDANDO_RETIRADA'] || 0 },
  ];

  const topStates = Object.entries(statsByState)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2.5 bg-gradient-to-br from-primary to-orange-500 rounded-xl shadow-lg">
                <Navigation className="h-5 w-5 text-white" />
              </div>
              {isAnimating && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse border-2 border-slate-900" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Mapa de Rastreamento</h3>
              <p className="text-slate-400 text-sm">Visualize as rotas em tempo real</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRoutes(!showRoutes)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                showRoutes 
                  ? 'bg-primary/20 text-primary border border-primary/30' 
                  : 'bg-slate-700/50 hover:bg-slate-700 text-white'
              }`}
            >
              <Truck className="h-4 w-4" />
              Rotas
            </button>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                isAnimating 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-slate-700/50 hover:bg-slate-700 text-white'
              }`}
            >
              {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setMapStyle(mapStyle === 'light' ? 'dark' : 'light')}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg transition-all text-sm"
            >
              <Layers className="h-4 w-4" />
              {mapStyle === 'light' ? 'Escuro' : 'Claro'}
            </button>
            {enableAutoRefresh && (
              <button
                onClick={refresh}
                disabled={isRefreshing}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                  isRefreshing 
                    ? 'bg-blue-500/20 text-blue-400 cursor-wait' 
                    : 'bg-slate-700/50 hover:bg-slate-700 text-white'
                }`}
                title={lastUpdated ? `Última atualização: ${formatDistanceToNow(lastUpdated, { locale: ptBR, addSuffix: true })}` : 'Atualizar dados'}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Admin badge & last updated */}
        {isAdmin && (
          <div className="flex items-center justify-between mt-3 px-1">
            <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-1 rounded">
              Admin View - Todos os clientes
            </span>
            {lastUpdated && enableAutoRefresh && (
              <span className="text-xs text-slate-500">
                Atualizado {formatDistanceToNow(lastUpdated, { locale: ptBR, addSuffix: true })}
              </span>
            )}
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {filterButtons.map(({ status, label, icon: Icon, count }) => (
            <button
              key={status || 'all'}
              onClick={() => setActiveFilter(status)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all
                ${activeFilter === status
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeFilter === status ? 'bg-white/20' : 'bg-slate-600'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative">
        <div ref={mapContainer} className="h-[450px] w-full" />
        
        {/* CSS for animations */}
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          .animated-route {
            stroke-dasharray: 10, 5;
            animation: dash 1s linear infinite;
          }
          @keyframes dash {
            to { stroke-dashoffset: -15; }
          }
          .leaflet-popup-content-wrapper {
            border-radius: 12px !important;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2) !important;
          }
          .leaflet-popup-tip {
            background: white !important;
          }
        `}</style>

        {/* Stats Overlay */}
        <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-border/50 max-w-[200px] hidden lg:block">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm text-foreground">Top Destinos</h4>
          </div>
          <div className="space-y-2">
            {topStates.map(([uf, data], idx) => (
              <div key={uf} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`
                    w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                    ${idx === 0 ? 'bg-amber-500 text-white' : 
                      idx === 1 ? 'bg-slate-400 text-white' :
                      idx === 2 ? 'bg-amber-700 text-white' :
                      'bg-muted text-muted-foreground'}
                  `}>
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-foreground">{uf}</span>
                </div>
                <span className="text-sm text-muted-foreground font-mono">{data.total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-sm rounded-xl p-3 shadow-xl border border-border/50 hidden md:block">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Origem</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <div key={status} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[status] }}
                />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* No data overlay */}
        {processedEmissoes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">Nenhum envio para exibir</p>
              <p className="text-sm text-muted-foreground/70">Crie etiquetas para visualizar no mapa</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Stats Bar */}
      <div className="bg-muted/30 border-t border-border/50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
          {Object.entries(statusCounts).map(([status, count]) => (
            <motion.div 
              key={status} 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setActiveFilter(activeFilter === status ? null : status)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[status] }}
              />
              <span className="text-xs text-muted-foreground">{STATUS_LABELS[status]}</span>
              <span className="text-xs font-bold text-foreground">{count}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
