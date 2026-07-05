'use client';

import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const RIYADH = { lat: 24.7136, lng: 46.6753 };

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

export default function LeafletMapInner({ value, onChange }: {
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
}) {
  const [marker, setMarker] = useState(value ?? RIYADH);

  const pick = (lat: number, lng: number) => {
    const next = { lat, lng };
    setMarker(next);
    onChange(next);
  };

  return (
    <MapContainer center={[marker.lat, marker.lng]} zoom={11} style={{ height: '360px', width: '100%', borderRadius: '12px' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickToPlace onPick={pick} />
      <Marker
        position={[marker.lat, marker.lng]}
        icon={markerIcon}
        draggable
        eventHandlers={{
          dragend(e) {
            const latlng = e.target.getLatLng();
            pick(latlng.lat, latlng.lng);
          },
        }}
      />
    </MapContainer>
  );
}
