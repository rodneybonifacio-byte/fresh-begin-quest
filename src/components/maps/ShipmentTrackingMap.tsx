import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Package, Truck, CheckCircle, Clock, Navigation, Layers } from 'lucide-react';
import type { IEmissao } from '../../types/IEmissao';

interface ShipmentTrackingMapProps {
  emissoes: IEmissao[];
}

// Brazilian state capitals coordinates for demo positioning
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

export const ShipmentTrackingMap = ({ emissoes }: ShipmentTrackingMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<'light' | 'dark'>('light');

  // Process emissions to get coordinates
  const processedEmissoes = emissoes.map(emissao => {
    const uf = emissao.destinatario?.endereco?.uf?.toUpperCase() || 'SP';
    const coords = BRAZIL_COORDINATES[uf] || BRAZIL_COORDINATES['SP'];
    
    // Add some randomness to prevent markers stacking
    const jitter = {
      lat: coords.lat + (Math.random() - 0.5) * 2,
      lng: coords.lng + (Math.random() - 0.5) * 2
    };
    
    return {
      ...emissao,
      coordinates: jitter
    };
  });

  // Statistics by state
  const statsByState = processedEmissoes.reduce((acc, e) => {
    const uf = e.destinatario?.endereco?.uf?.toUpperCase() || 'SP';
    if (!acc[uf]) acc[uf] = { total: 0, statuses: {} as Record<string, number> };
    acc[uf].total += 1;
    const status = e.status || 'PRE_POSTADO';
    acc[uf].statuses[status] = (acc[uf].statuses[status] || 0) + 1;
    return acc;
  }, {} as Record<string, { total: number; statuses: Record<string, number> }>);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map centered on Brazil
    map.current = L.map(mapContainer.current, {
      center: [-14.235, -51.925],
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
    });

    // Add zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map.current);

    // Create layer group for markers
    markersRef.current = L.layerGroup().addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update tile layer when style changes
  useEffect(() => {
    if (!map.current) return;

    // Remove existing tile layers
    map.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.current?.removeLayer(layer);
      }
    });

    // Add new tile layer based on style
    const tileUrl = mapStyle === 'light'
      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map.current);
  }, [mapStyle]);

  // Update markers when data or filter changes
  useEffect(() => {
    if (!map.current || !markersRef.current) return;

    // Clear existing markers
    markersRef.current.clearLayers();

    // Filter emissions
    const filteredEmissoes = activeFilter
      ? processedEmissoes.filter(e => e.status === activeFilter)
      : processedEmissoes;

    // Create custom icon
    const createIcon = (status: string) => {
      const color = STATUS_COLORS[status] || '#6B7280';
      return L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: 32px;
            height: 32px;
            background: ${color};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 12px;
              height: 12px;
              background: white;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });
    };

    // Add markers
    filteredEmissoes.forEach(emissao => {
      const status = emissao.status || 'PRE_POSTADO';
      const marker = L.marker(
        [emissao.coordinates.lat, emissao.coordinates.lng],
        { icon: createIcon(status) }
      );

      const popupContent = `
        <div style="font-family: system-ui; min-width: 200px;">
          <div style="
            background: linear-gradient(135deg, ${STATUS_COLORS[status]} 0%, ${STATUS_COLORS[status]}cc 100%);
            color: white;
            padding: 12px;
            margin: -10px -10px 10px -10px;
            border-radius: 4px 4px 0 0;
          ">
            <strong style="font-size: 14px;">${emissao.codigoObjeto || 'N/A'}</strong>
            <div style="font-size: 11px; opacity: 0.9; margin-top: 2px;">
              ${STATUS_LABELS[status]}
            </div>
          </div>
          <div style="padding: 0 2px;">
            <div style="margin-bottom: 8px;">
              <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">Destinatário</div>
              <div style="font-size: 13px; font-weight: 500; color: #1E293B;">
                ${emissao.destinatario?.nome || 'N/A'}
              </div>
            </div>
            <div style="margin-bottom: 8px;">
              <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">Destino</div>
              <div style="font-size: 13px; color: #475569;">
                ${emissao.destinatario?.endereco?.localidade || ''} - ${emissao.destinatario?.endereco?.uf || ''}
              </div>
            </div>
            <div style="
              display: flex;
              justify-content: space-between;
              background: #F8FAFC;
              padding: 8px;
              border-radius: 6px;
              margin-top: 10px;
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

      marker.bindPopup(popupContent, {
        maxWidth: 280,
        className: 'custom-popup'
      });

      markersRef.current?.addLayer(marker);
    });

    // Fit bounds if there are markers
    if (filteredEmissoes.length > 0 && filteredEmissoes.length < 50) {
      const bounds = L.latLngBounds(
        filteredEmissoes.map(e => [e.coordinates.lat, e.coordinates.lng])
      );
      map.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }
  }, [processedEmissoes, activeFilter, mapStyle]);

  // Status filter counts
  const statusCounts = processedEmissoes.reduce((acc, e) => {
    const status = e.status || 'PRE_POSTADO';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filterButtons = [
    { status: null, label: 'Todos', icon: Package, count: processedEmissoes.length },
    { status: 'EM_TRANSITO', label: 'Em Trânsito', icon: Truck, count: statusCounts['EM_TRANSITO'] || 0 },
    { status: 'ENTREGUE', label: 'Entregues', icon: CheckCircle, count: statusCounts['ENTREGUE'] || 0 },
    { status: 'PRE_POSTADO', label: 'Pré-Postado', icon: Clock, count: statusCounts['PRE_POSTADO'] || 0 },
    { status: 'AGUARDANDO_RETIRADA', label: 'Aguard. Retirada', icon: MapPin, count: statusCounts['AGUARDANDO_RETIRADA'] || 0 },
  ];

  // Top destination states
  const topStates = Object.entries(statsByState)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-primary to-orange-500 rounded-xl shadow-lg">
              <Navigation className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Mapa de Rastreamento</h3>
              <p className="text-slate-400 text-sm">Visualize todos os envios em tempo real</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMapStyle(mapStyle === 'light' ? 'dark' : 'light')}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg transition-all text-sm"
            >
              <Layers className="h-4 w-4" />
              {mapStyle === 'light' ? 'Escuro' : 'Claro'}
            </button>
          </div>
        </div>

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
              <span>{label}</span>
              <span className={`
                px-2 py-0.5 rounded-full text-xs font-bold
                ${activeFilter === status ? 'bg-white/20' : 'bg-slate-600'}
              `}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative">
        <div ref={mapContainer} className="h-[400px] w-full" />
        
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
            <div key={status} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[status] }}
              />
              <span className="text-xs text-muted-foreground">{STATUS_LABELS[status]}</span>
              <span className="text-xs font-bold text-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
