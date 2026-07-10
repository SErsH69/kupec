/**
 * Серверы Majestic RP (RU-проекты). Порт из прототипа (SERVERS).
 * id — идентификатор в API, name — человекочитаемое название города.
 */
export interface Server {
  readonly id: string;
  readonly name: string;
}

export const SERVERS: readonly Server[] = [
  { id: 'RU1', name: 'New York' },
  { id: 'RU2', name: 'Detroit' },
  { id: 'RU3', name: 'Chicago' },
  { id: 'RU4', name: 'San Francisco' },
  { id: 'RU5', name: 'Atlanta' },
  { id: 'RU6', name: 'San Diego' },
  { id: 'RU7', name: 'Los Angeles' },
  { id: 'RU8', name: 'Miami' },
  { id: 'RU9', name: 'Las Vegas' },
  { id: 'RU10', name: 'Washington' },
  { id: 'RU11', name: 'Dallas' },
  { id: 'RU12', name: 'Boston' },
  { id: 'RU13', name: 'Houston' },
  { id: 'RU14', name: 'Seattle' },
  { id: 'RU15', name: 'Phoenix' },
  { id: 'RU16', name: 'Denver' },
  { id: 'RU17', name: 'Portland' },
  { id: 'RU18', name: 'Orlando' },
  { id: 'RU19', name: 'Memphis' },
] as const;

export type ServerId = (typeof SERVERS)[number]['id'];

const SERVER_IDS = new Set(SERVERS.map((s) => s.id));

export function isServerId(value: string): value is ServerId {
  return SERVER_IDS.has(value);
}

export function serverName(id: string): string | undefined {
  return SERVERS.find((s) => s.id === id)?.name;
}
