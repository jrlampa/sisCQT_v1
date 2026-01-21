
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useToast } from '../context/ToastContext';

// Correção para ícones do Leaflet que as vezes não carregam corretamente com build tools
import 'leaflet/dist/leaflet.css';

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

// Sub-componente para lidar com cliques no mapa
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
  const { showToast } = useToast();

  const fetchNodes = async () => {
    try {
      const response = await fetch('/api/nodes');
      if (!response.ok) throw new Error("Erro ao buscar nós");
      const data = await response.json();
      setGeoData(data);
    } catch (err) {
      showToast("Erro ao carregar dados do mapa", "error");
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
      const response = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat, lng,
          name,
          type,
          properties: { status: 'ativo', tension: 'BT' }
        })
      });

      if (response.ok) {
        showToast(`${type} criado com sucesso!`, "success");
        fetchNodes();
        if (onNodeCreated) onNodeCreated();
      }
    } catch (err) {
      showToast("Erro ao salvar nó no banco", "error");
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
      
      <MapContainer 
        center={[-22.9068, -43.1729]} // Rio de Janeiro default
        zoom={15} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <MapClickHandler onMapClick={handleAddNode} />

        {geoData && geoData.features.map((feature: any) => (
          <Marker 
            key={feature.id}
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
