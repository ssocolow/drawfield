export function getSTDEnergy(grid: number[][], weights: number[][]): number;
export function getNewEnergy(grid: number[][]): number;
export function getHopfieldWeights(selection: 'A-C' | 'A-G'): Promise<number[][]>;
export function doHopfieldUpdate(grid: number[][], weights: number[][]): number[][];
export function doDenseHopfieldUpdate(grid: number[][]): number[][];

