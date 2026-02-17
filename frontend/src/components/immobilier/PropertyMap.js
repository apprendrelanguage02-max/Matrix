import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default Leaflet icon
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = defaultIcon;

// Conakry, Guinée — default center
const CONAKRY = [9.5370, -13.6785];

export default function PropertyMap({ latitude, longitude, title, city }) {
  const position = latitude && longitude ? [latitude, longitude] : null;
  const center = position || CONAKRY;

  return (
    <div className="w-full h-64 border border-zinc-200 overflow-hidden">
      <MapContainer center={center} zoom={position ? 15 : 12} style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false} attributionControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {position && (
          <Marker position={position}>
            <Popup>
              <strong className="font-['Manrope']">{title}</strong>
              {city && <><br /><span>{city}</span></>}
            </Popup>
          </Marker>
        )}
        {!position && (
          <Marker position={CONAKRY}>
            <Popup><span className="font-['Manrope']">{city || "Conakry, Guinée"}</span></Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
