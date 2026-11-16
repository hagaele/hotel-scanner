// Dados fictícios do briefing de design (Rede Cerrado Hotéis, 14:00).
// Servem para desenvolver as telas antes da integração com o Firestore.

import { DEFAULT_ALERT_RULES } from '@/lib/alerts';
import type { Client, Hotel, Property } from '@/types';

/** "Agora" fixo do cenário de exemplo, para as telas serem reproduzíveis. */
export const MOCK_NOW = new Date('2026-11-10T14:00:00-03:00');

const at = (hhmm: string) => `2026-11-10T${hhmm}:00-03:00`;

const slug = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

function ok(name: string, price: number, extra: Partial<Property['latest']> = {}): Property {
  return { id: slug(name), name, latest: { status: 'ok', price, checkedAt: at('14:00'), ...extra } };
}

export const mockClient: Client = {
  id: 'rede-cerrado',
  name: 'Rede Cerrado Hotéis',
  alertThresholdPct: 10,
  alertRules: DEFAULT_ALERT_RULES,
};

const BSB = 'Brasília/DF';
const GYN = 'Goiânia/GO';
const CLV = 'Caldas Novas/GO';

const rows: { own: Property; competitors: Property[]; city: string; floorPrice: number }[] = [
  {
    own: ok('Hotel Cerrado Esplanada', 389),
    competitors: [ok('Hotel Eixo Monumental', 412), ok('Hotel Asa Norte', 365), ok('Hotel Setor Hoteleiro Sul', 398)],
    city: BSB,
    floorPrice: 330,
  },
  {
    own: ok('Cerrado Thermas Resort', 720, { previousPrice: 690, changedAt: at('11:00') }),
    competitors: [
      ok('Resort Águas Quentes', 610, { previousPrice: 650, changedAt: at('13:00') }),
      ok('Hotel Termas do Lago', 585),
      ok('Pousada Fonte Viva', 640),
    ],
    city: CLV,
    floorPrice: 600,
  },
  {
    own: ok('Cerrado Express Brasília', 219),
    competitors: [ok('Hotel Rodoviária Express', 259), ok('Hotel Via W3', 248), ok('Pousada Candangos', 265)],
    city: BSB,
    floorPrice: 190,
  },
  {
    own: ok('Cerrado Business', 455),
    competitors: [ok('Hotel Executivo Planalto', 470), ok('Plaza Ministérios', 440), ok('Hotel Lago Paranoá', 462)],
    city: BSB,
    floorPrice: 390,
  },
  {
    own: {
      id: slug('Cerrado Flat Marista'),
      name: 'Cerrado Flat Marista',
      latest: { status: 'sold_out', price: null, checkedAt: at('14:00') },
    },
    competitors: [ok('Flat Setor Oeste', 310), ok('Hotel Praça Cívica', 295), ok('Hotel Jardim Goiás', 330)],
    city: GYN,
    floorPrice: 260,
  },
  {
    own: ok('Cerrado Boutique Goiânia', 610, { checkedAt: at('11:00') }),
    competitors: [ok('Casa Ipê Boutique', 590), ok('Hotel Arte Bueno', 640), ok('Villa Flamboyant', 605)],
    city: GYN,
    floorPrice: 520,
  },
  {
    own: ok('Hotel Cerrado Termal', 340),
    competitors: [ok('Hotel Lagoa Termal', 335), ok('Pousada Águas Claras', 352), ok('Hotel Serra de Caldas', 328)],
    city: CLV,
    floorPrice: 290,
  },
  {
    own: ok('Cerrado Suítes Goiânia', 298),
    competitors: [ok('Flat Setor Sul', 285), ok('Hotel Mirante Goiânia', 310), ok('Suítes Av. T-63', 300)],
    city: GYN,
    floorPrice: 250,
  },
  {
    own: {
      id: slug('Hotel Cerrado Parque das Águas'),
      name: 'Hotel Cerrado Parque das Águas',
      latest: { status: 'failed', price: null, checkedAt: null },
    },
    competitors: [ok('Hotel Ipê Termas', 380), ok('Pousada Jardim das Águas', 360), ok('Hotel Mirante das Termas', 395)],
    city: CLV,
    floorPrice: 300,
  },
];

export const mockHotels: Hotel[] = rows.map((row, index) => ({
  id: row.own.id,
  order: index + 1,
  ...row,
}));
