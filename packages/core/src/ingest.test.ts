import { describe, expect, it } from 'vitest';
import { detectPath, ingestMarketJson } from './ingest';

describe('detectPath', () => {
  it('определяет раздел по имени массива', () => {
    expect(detectPath({ itemStatistics: [] })).toBe('items');
    expect(detectPath({ result: { vehicleStatistics: [] } })).toBe('vehicles');
    expect(detectPath({ clothingStatistics: [] })).toBe('clothes');
  });
  it('null для неизвестного', () => {
    expect(detectPath({ fooStatistics: [] })).toBeNull();
    expect(detectPath({})).toBeNull();
  });
});

describe('ingestMarketJson', () => {
  it('формат с ключами-разделами (как из закладки)', () => {
    const res = ingestMarketJson({
      items: { result: { serverId: 'RU17', itemStatistics: [{ itemId: 1, itemName: 'X', averagePrice: 100 }] } },
      vehicles: { result: { serverId: 'RU17', vehicleStatistics: [{ model: 'z', averagePrice: 200 }] } },
    });
    expect(res.sections).toBe(2);
    expect(res.serverId).toBe('RU17');
    expect(res.paths.items?.[0]?._path).toBe('items');
    expect(res.paths.vehicles?.[0]?.avg).toBe(200);
  });

  it('одиночный ответ API с автоопределением раздела', () => {
    const res = ingestMarketJson({
      result: { serverId: 'RU1', itemStatistics: [{ itemId: 5, itemName: 'Y', averagePrice: 50 }] },
    });
    expect(res.sections).toBe(1);
    expect(res.serverId).toBe('RU1');
    expect(res.paths.items?.[0]?.name).toBe('Y');
  });

  it('пустой результат, если раздел не определён', () => {
    const res = ingestMarketJson({ nonsense: true });
    expect(res.sections).toBe(0);
    expect(res.paths).toEqual({});
  });
});
