// Dados fictícios do briefing de design (Rede Litoral Hotéis, 14:00).
// Servem para desenvolver as telas antes da integração com o Firestore.

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
  id: 'rede-litoral',
  name: 'Rede Litoral Hotéis',
  alertThresholdPct: 10,
};

const rows: { own: Property; competitors: Property[] }[] = [
  {
    own: ok('Hotel Litoral Centro', 389),
    competitors: [ok('Hotel Atlântico Plaza', 412), ok('Pousada Maré Alta', 365), ok('Hotel Farol', 398)],
  },
  {
    own: ok('Litoral Praia Resort', 720, { previousPrice: 690, changedAt: at('11:00') }),
    competitors: [
      ok('Resort Costa Dourada', 610, { previousPrice: 650, changedAt: at('13:00') }),
      ok('Hotel Sol Nascente', 585),
      ok('Pousada Brisa', 640),
    ],
  },
  {
    own: ok('Hotel Litoral Express', 219),
    competitors: [ok('Ibis Orla', 259), ok('Hotel Rota 101', 248), ok('Pousada Caminho', 265)],
  },
  {
    own: ok('Litoral Business', 455),
    competitors: [ok('Hotel Executivo Sul', 470), ok('Plaza Negócios', 440), ok('Hotel Avenida', 462)],
  },
  {
    own: {
      id: slug('Pousada Litoral Verde'),
      name: 'Pousada Litoral Verde',
      latest: { status: 'sold_out', price: null, checkedAt: at('14:00') },
    },
    competitors: [ok('Pousada Mata Atlântica', 310), ok('Chalés da Serra', 295), ok('Pousada Recanto', 330)],
  },
  {
    own: ok('Litoral Boutique', 610, { checkedAt: at('11:00') }),
    competitors: [ok('Casa Azul Boutique', 590), ok('Hotel Arte', 640), ok('Villa Mar', 605)],
  },
  {
    own: ok('Hotel Litoral Norte', 340),
    competitors: [ok('Hotel Enseada', 335), ok('Pousada do Porto', 352), ok('Hotel Pescador', 328)],
  },
  {
    own: ok('Litoral Suítes', 298),
    competitors: [ok('Flat Mar', 285), ok('Hotel Mirante', 310), ok('Suítes Orla', 300)],
  },
  {
    own: {
      id: slug('Hotel Litoral Sul'),
      name: 'Hotel Litoral Sul',
      latest: { status: 'failed', price: null, checkedAt: null },
    },
    competitors: [ok('Hotel Pontal', 380), ok('Pousada Coqueiral', 360), ok('Hotel Baía', 395)],
  },
];

export const mockHotels: Hotel[] = rows.map((row, index) => ({
  id: row.own.id,
  order: index + 1,
  ...row,
}));
