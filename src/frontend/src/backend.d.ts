import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Point {
    x: number;
    y: number;
    id: bigint;
    name: string;
}
export interface Region {
    x: number;
    y: number;
    id: bigint;
    height: number;
    name: string;
    width: number;
}
export interface backendInterface {
    addPoint(name: string, x: number, y: number): Promise<bigint>;
    addRegion(name: string, x: number, y: number, width: number, height: number): Promise<bigint>;
    deletePoint(id: bigint): Promise<void>;
    deleteRegion(id: bigint): Promise<void>;
    getPoints(): Promise<Array<Point>>;
    getRegions(): Promise<Array<Region>>;
}
