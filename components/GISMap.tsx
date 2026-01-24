import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useToast } from '../context/ToastContext';
import { ApiError, ApiService } from '../services/apiService';

// Importante: O CSS do Leaflet é carregado via <link> no index.html para evitar erros de ESM no navegador

const trafoIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/355/355980.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

const posteIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2992/2992153.png',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

interface GISMapProps {
  onNodeCreated?: () => void;
}

type BaseMapId = 'osm' | 'satellite' | 'light';

const BASEMAP_STORAGE_KEY = 'sisqat_gis_basemap';

const MapClickHandler = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const GISMap: React.FC<GISMapProps> = ({ onNodeCreated }) => {
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [baseMapId, setBaseMapId] = useState<BaseMapId>(() => {
    try {
      const raw = localStorage.getItem(BASEMAP_STORAGE_KEY);
      if (raw === 'osm' || raw === 'satellite' || raw === 'light') return raw;
    } catch {}
    return 'osm';
  });
  const { showToast } = useToast();

  const baseMaps = useMemo(() => {
    return {
      osm: {
        label: 'Base (OSM Streets)',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
      // “GE Pro” e “Google Maps” sem chave/licença: usamos alternativas abertas de mercado.
      // - satellite: satélite estilo “Google Earth”
      // - light: estilo “maps” mais limpo
      satellite: {
        label: 'GE Pro (Satélite)',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri',
      },
      light: {
        label: 'Google Maps (Estilo)',
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    } satisfies Record<BaseMapId, { label: string; url: string; attribution: string }>;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(BASEMAP_STORAGE_KEY, baseMapId);
    } catch {}
  }, [baseMapId]);

  const fetchNodes = async () => {
    try {
      const data = await ApiService.getGisNodes();
      setGeoData(data);
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError && err.status === 401) {
        showToast("Sessão expirada. Faça login novamente.", "error");
      }
      // Fallback para não quebrar a UI se a API ainda não estiver pronta
      setGeoData({ type: "FeatureCollection", features: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  const handleAddNode = async (lat: number, lng: number) => {
    const name = prompt("Identificação do Ponto (ex: P-102):");
    if (!name) return;

    const type = confirm("É um Transformador? (Cancelar para Poste)") ? 'TRAFO' : 'POSTE';

    try {
      await ApiService.createGisNode({
        lat,
        lng,
        name,
        type,
        properties: { status: 'ativo', tension: 'BT' },
      });
      showToast(`${type} criado com sucesso!`, "success");
      fetchNodes();
      if (onNodeCreated) onNodeCreated();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        showToast("Sessão expirada. Faça login novamente.", "error");
      } else {
        showToast("Erro ao salvar nó. Verifique a conexão com o banco.", "error");
      }
    }
  };

  return (
    <div className="h-[650px] w-full rounded-[40px] overflow-hidden shadow-2xl border-8 border-white/30 relative">
      {loading && (
        <div className="absolute inset-0 z-[1000] bg-white/50 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center">
             <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent animate-spin rounded-full mb-2"></div>
             <span className="text-[10px] font-black uppercase text-blue-600">Sincronizando GIS...</span>
          </div>
        </div>
      )}

      {/* Banner de status */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[600] glass-dark px-5 py-3 rounded-2xl border border-white/40">
        <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">Em desenvolvimento</span>
        <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">
          Camadas e integrações GIS ainda em evolução
        </div>
      </div>

      {/* Seletor de mapa base */}
      <div className="absolute top-6 right-6 z-[650] glass-dark p-4 rounded-2xl border border-white/40">
        <div className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Mapa base</div>
        <select
          aria-label="Selecionar mapa base"
          className="bg-white/80 border border-gray-200 rounded-xl px-3 py-2 text-[10px] font-black text-gray-800 outline-none"
          value={baseMapId}
          onChange={(e) => setBaseMapId(e.target.value as BaseMapId)}
        >
          {Object.entries(baseMaps).map(([id, bm]) => (
            <option key={id} value={id}>
              {bm.label}
            </option>
          ))}
        </select>
      </div>
      
      <MapContainer 
        // Cabo Frio - RJ (padrão)
        center={[-22.8794, -42.0187]} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          key={baseMapId}
          url={baseMaps[baseMapId].url}
          attribution={baseMaps[baseMapId].attribution}
        />
        
        <MapClickHandler onMapClick={handleAddNode} />

        {geoData && geoData.features && geoData.features.map((feature: any) => (
          <Marker 
            key={feature.id || Math.random()}
            position={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]}
            icon={feature.properties.type === 'TRAFO' ? trafoIcon : posteIcon}
          >
            <Popup className="custom-popup">
              <div className="p-2 min-w-[150px]">
                <h4 className="font-black text-blue-800 uppercase text-xs mb-1">{feature.properties.name}</h4>
                <div className="h-px bg-gray-100 my-2"></div>
                <p className="text-[9px] font-bold text-gray-500 uppercase">Tipo: {feature.properties.type}</p>
                <p className="text-[9px] font-bold text-gray-500 uppercase">Lat: {feature.geometry.coordinates[1].toFixed(5)}</p>
                <p className="text-[9px] font-bold text-gray-500 uppercase">Lng: {feature.geometry.coordinates[0].toFixed(5)}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      <div className="absolute bottom-6 left-6 z-[500] glass-dark p-4 rounded-2xl border border-white/40 pointer-events-none">
        <h5 className="text-[10px] font-black text-blue-600 uppercase mb-2">Legenda de Rede</h5>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
          <span className="text-[9px] font-bold text-gray-600 uppercase">Transformador (TRAFO)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          <span className="text-[9px] font-bold text-gray-600 uppercase">Poste de Derivação</span>
        </div>
      </div>
    </div>
  );
};

export default GISMap;