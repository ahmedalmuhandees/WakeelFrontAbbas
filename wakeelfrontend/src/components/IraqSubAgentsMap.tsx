import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Agent } from '../types';
import { governorateCoordinates, iraqBounds, baghdadCenter, parseAddressCoordinates } from '../utils/iraqGovernorateCoords';
import { IraqGovernorates } from '../types';

/** إصلاح مسار أيقونة الـ marker في Leaflet (مشكلة شائعة مع webpack) */
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/** تكبير الخريطة على بغداد عند كون كل الوكلاء فيها */
const BAGHDAD_ZOOM = 11;

/** مكون داخلي لضبط حدود الخريطة عند تغيير البيانات (يستخدم مواقع العلامات الفعلية) */
function FitBounds({ positions, allBaghdad }: { positions: [number, number][]; allBaghdad: boolean }) {
  const map = useMap();
  React.useEffect(() => {
    if (positions.length === 0) return;
    if (allBaghdad) {
      map.setView(baghdadCenter, BAGHDAD_ZOOM);
      return;
    }
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12 });
  }, [map, positions, allBaghdad]);
  return null;
}

interface IraqSubAgentsMapProps {
  agents: Agent[];
  className?: string;
}

/** خريطة العراق تعرض اماكن التغطية في العراق (حسب المحافظة) مع اسم الوكيل والشركة — خلفية بيضاء */
const IraqSubAgentsMap: React.FC<IraqSubAgentsMapProps> = ({ agents, className = '' }) => {
  const bounds = useMemo(
    () => L.latLngBounds(iraqBounds[0] as L.LatLngTuple, iraqBounds[1] as L.LatLngTuple),
    []
  );

  const markers = useMemo(() => {
    const byGov: Record<number, number> = {};
    return agents
      .filter((a) => a.governorate != null && governorateCoordinates[a.governorate as keyof typeof governorateCoordinates])
      .map((agent) => {
        const fromAddress = parseAddressCoordinates(agent.address);
        if (fromAddress) {
          return { agent, position: fromAddress };
        }
        const gov = agent.governorate as keyof typeof governorateCoordinates;
        const base = governorateCoordinates[gov];
        if (!base) return null;
        const count = byGov[gov] ?? 0;
        byGov[gov] = count + 1;
        const offset = 0.04 * (count - 0.5 * (byGov[gov] - 1));
        return {
          agent,
          position: [base[0] + offset * 0.5, base[1] + offset] as [number, number],
        };
      })
      .filter(Boolean) as { agent: Agent; position: [number, number] }[];
  }, [agents]);

  const fitPositions = useMemo(() => markers.map((m) => m.position), [markers]);
  const allBaghdad = useMemo(
    () => agents.length > 0 && agents.every((a) => Number(a.governorate) === IraqGovernorates.Baghdad),
    [agents]
  );

  if (agents.length === 0) {
    return (
      <div className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center min-h-[320px] ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">لا توجد مكاتب فرعية لعرضها على الخريطة</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white ${className}`}>
      <MapContainer
        center={[33.2, 44.4]}
        zoom={6}
        minZoom={5}
        maxZoom={12}
        maxBounds={bounds}
        maxBoundsViscosity={1}
        className="h-[380px] w-full"
        scrollWheelZoom={true}
        style={{ background: '#fafafa' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds positions={fitPositions} allBaghdad={allBaghdad} />
        {markers.map(({ agent, position }) => (
          <Marker key={agent.id} position={position} icon={defaultIcon}>
            <Popup>
              <div className="text-right min-w-[140px]">
                <p className="font-semibold text-gray-900">{agent.fullName}</p>
                <p className="text-sm text-gray-600">{agent.companyName || '—'}</p>
                {agent.address && (
                  <p className="text-xs text-gray-500 mt-1">{agent.address}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default IraqSubAgentsMap;
