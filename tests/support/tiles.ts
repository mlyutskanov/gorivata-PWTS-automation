import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';

export type Tile = { z: number; x: number; y: number };

export const TILE_URL_TEMPLATE =
  process.env.TILE_URL_TEMPLATE ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const MAP_PATH = process.env.MAP_PATH ?? '/stations';

// Slippy-map tile containing Sofia city centre (42.698 N, 23.322 E) at zoom 13.
// It is also the centre tile of the app's default map view, so it always loads.
export const SOFIA_CENTRE: Tile = { z: 13, x: 4626, y: 3019 };

// SHA-256 of the "API KEY REQUIRED" image the previous provider served, with
// HTTP 200, for every tile once its keyless access ended (BUG-001).
export const KNOWN_PLACEHOLDER_SHA256 =
  '69be4aecf9f814ba45d585801a5aa41e79b16fc88eafec5b1954a9f06a69e6be';

export function tileUrl({ z, x, y }: Tile): string {
  return TILE_URL_TEMPLATE.replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y));
}

export function tilePathPattern({ z, x, y }: Tile): RegExp {
  return new RegExp(`/${z}/${x}/${y}(@2x)?\\.png(\\?|$)`);
}

export function analyzeTile(body: Buffer) {
  const png = PNG.sync.read(body);
  const counts = new Map<number, number>();
  for (let i = 0; i < png.data.length; i += 4) {
    const rgba = png.data.readUInt32BE(i);
    counts.set(rgba, (counts.get(rgba) ?? 0) + 1);
  }
  return {
    width: png.width,
    height: png.height,
    distinctColours: counts.size,
    dominantColourRatio: Math.max(...counts.values()) / (png.width * png.height),
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

// A real map tile of a city centre is busy: roads, buildings, labels, parks.
// Measured baseline (2026-11): real Sofia tile = 256 colours, dominant 10.8%;
// placeholder = 16 colours, dominant 96.9%. Thresholds sit far from both.
export async function expectRealMapTile(body: Buffer) {
  const tile = analyzeTile(body);
  await test.info().attach('checked-tile.png', { body, contentType: 'image/png' });
  await test.info().attach('tile-measurements.json', {
    body: JSON.stringify(tile, null, 2),
    contentType: 'application/json',
  });
  expect(tile.sha256, 'tile is the known "API KEY REQUIRED" placeholder').not.toBe(
    KNOWN_PLACEHOLDER_SHA256,
  );
  expect({ width: tile.width, height: tile.height }).toEqual({ width: 256, height: 256 });
  expect(tile.distinctColours, 'too few colours for real map imagery').toBeGreaterThanOrEqual(64);
  expect(tile.dominantColourRatio, 'tile is mostly one colour (blank or placeholder)').toBeLessThan(0.5);
}
