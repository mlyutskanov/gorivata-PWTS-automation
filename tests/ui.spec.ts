import { expect, test } from '@playwright/test';
import {
  MAP_PATH,
  SOFIA_CENTRE,
  TILE_URL_TEMPLATE,
  expectRealMapTile,
  tilePathPattern,
} from './support/tiles';

test('station map loads real map tiles for Sofia city centre', async ({ page, baseURL }) => {
  expect(baseURL, 'set BASE_URL to the app under test').toBeTruthy();

  const tilePath = tilePathPattern(SOFIA_CENTRE);
  const tileResponse = page.waitForResponse((r) => tilePath.test(new URL(r.url()).pathname));

  await page.goto(MAP_PATH);
  const response = await tileResponse;

  expect(new URL(response.url()).host, 'map uses an unexpected tile provider').toBe(
    new URL(TILE_URL_TEMPLATE).host,
  );
  expect(response.status()).toBe(200);
  expectRealMapTile(await response.body());

  const { z, x, y } = SOFIA_CENTRE;
  const tile = page.locator(`img.leaflet-tile[src*="/${z}/${x}/${y}"]`);
  await expect(tile).toBeVisible();
  await expect
    .poll(() => tile.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
    .toBe(256);
});
