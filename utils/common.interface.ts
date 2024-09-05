import { JwtPayload } from "jwt-decode";

export interface IProduct {
    ean: string;
    title: string;
    brand: string;
    model: string;
    color: string;
    size: string;
    dimension: string;
    weight: string;
    category: string;
    images: string[];
    elid: string;
    created_at?: string;
}

export interface IJwtPayload extends JwtPayload {}
