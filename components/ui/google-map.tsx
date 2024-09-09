"use client";

import GoogleMap from "google-maps-react-markers";
import { MapPin } from "lucide-react";

type Props = {
    lat: number | null;
    lng: number | null;
    height?: string;
    zoom?: number;
};

export default function GoogleMapReact({
    lat,
    lng,
    height = "22rem",
    zoom = 18,
}: Props) {
    const mapCenter = { lat, lng };

    return (
        <div className="w-full" style={{ height }}>
            <GoogleMap
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                defaultCenter={mapCenter}
                defaultZoom={zoom}
                mapMinHeight={height}
            >
                <Marker lat={lat} lng={lng} stroke={1} />
            </GoogleMap>
        </div>
    );
}

const Marker = ({}: any) => (
    <MapPin className="w-8 h-8 text-primary fill-primary" />
);
