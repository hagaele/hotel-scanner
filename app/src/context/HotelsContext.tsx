import { limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';
import { checksCol, clientRef, eventsCol, hotelsCol, savedSearchesCol, userStateRef } from '@/data/paths';
import { buildAlerts, toAlertRules, type AlertItem } from '@/lib/alerts';
import { addDays, monthOf, monthStart, todayKey } from '@/lib/dates';
import { CLIENT_ID, firestoreErrorMessage } from '@/lib/firestore';
import { holidayMap } from '@/lib/holidays';
import { buildRateIndex, type RateIndex } from '@/lib/market';
import { MAX_STAY_DAYS_AHEAD } from '@/lib/readings';
import type {
  CalendarEvent,
  CatalogFilters,
  CheckStatus,
  Client,
  Hotel,
  LatestCheck,
  Property,
  RateCheck,
  SavedSearch,
} from '@/types';

const DEFAULT_THRESHOLD_PCT = 10;
/** Teto de tarifas lidas por hotel na janela (4 propriedades x ~90 noites, com várias coletas). */
const MAX_RATES_PER_HOTEL = 3000;

type HotelsContextValue = {
  client: Client;
  hotels: Hotel[];
  /** Relógio real (atualizado a cada minuto) para calcular "desatualizado" e as datas. */
  now: Date;
  /** Hoje, no fuso de Brasília ("AAAA-MM-DD"). */
  today: string;
  loading: boolean;
  error: string | null;
  /** Tarifas por data de estadia, do primeiro dia do mês até 60 dias à frente. */
  checks: RateCheck[];
  checksByHotel: Record<string, RateCheck[]>;
  rateIndex: RateIndex;
  ratesLoading: boolean;
  /** Eventos, feriados locais e datas descartadas. */
  events: CalendarEvent[];
  /** Feriados nacionais do ano atual e do seguinte. */
  holidays: Map<string, string>;
  savedSearches: SavedSearch[];
  alerts: AlertItem[];
  readAlerts: Record<string, boolean>;
  unreadCount: number;
};

const HotelsContext = createContext<HotelsContextValue | null>(null);

/**
 * Estado global dos dados da rede.
 * Uma única assinatura em tempo real (onSnapshot) por coleção, compartilhada por todas as telas:
 * o painel, o calendário, o catálogo e a central de alertas leem daqui com useHotelsData().
 * Quando ninguém está logado, nada é lido do Firestore.
 */
export function HotelsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid;

  const [client, setClient] = useState<Client>(() => emptyClient());
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [clientLoaded, setClientLoaded] = useState(false);
  const [hotelsLoaded, setHotelsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [checksByHotel, setChecksByHotel] = useState<Record<string, RateCheck[]>>({});
  const [ratesLoading, setRatesLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [readAlerts, setReadAlerts] = useState<Record<string, boolean>>({});

  const today = todayKey(now);
  const windowStart = monthStart(monthOf(today));
  const windowEnd = addDays(today, MAX_STAY_DAYS_AHEAD);

  // Cliente, hotéis, eventos, pesquisas salvas e alertas lidos.
  useEffect(() => {
    if (!uid) {
      setHotels([]);
      setEvents([]);
      setSavedSearches([]);
      setReadAlerts({});
      setClientLoaded(false);
      setHotelsLoaded(false);
      return;
    }
    const onError = (err: unknown) => setError(firestoreErrorMessage(err));

    const unsubscribers = [
      onSnapshot(
        clientRef(),
        (snap) => {
          const data = snap.data();
          setClient({
            id: CLIENT_ID,
            name: typeof data?.name === 'string' ? data.name : 'Sua rede',
            alertThresholdPct:
              typeof data?.alertThresholdPct === 'number' ? data.alertThresholdPct : DEFAULT_THRESHOLD_PCT,
            alertRules: toAlertRules(data?.alertRules),
          });
          setClientLoaded(true);
        },
        onError,
      ),
      onSnapshot(
        query(hotelsCol(), orderBy('order')),
        (snap) => {
          setHotels(snap.docs.map((d) => toHotel(d.id, d.data())));
          setHotelsLoaded(true);
          setError(null);
        },
        onError,
      ),
      onSnapshot(eventsCol(), (snap) => setEvents(snap.docs.map((d) => toEvent(d.id, d.data()))), onError),
      onSnapshot(
        savedSearchesCol(),
        (snap) =>
          setSavedSearches(
            snap.docs.map((d) => toSavedSearch(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          ),
        onError,
      ),
      onSnapshot(userStateRef(uid), (snap) => {
        const raw = snap.data()?.readAlerts;
        setReadAlerts(raw && typeof raw === 'object' ? (raw as Record<string, boolean>) : {});
      }, onError),
    ];

    // Cancela os "ouvintes" ao sair, para não gastar leituras nem memória.
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [uid]);

  // Tarifas por data de estadia: um "ouvinte" por hotel, só na janela usada pelas telas.
  // Os ouvintes ficam num mapa e só os hotéis que entram ou saem da lista são (des)assinados:
  // cadastrar ou remover um hotel não relê as tarifas de todos os outros (cada releitura conta na cota do Firestore).
  const hotelIds = hotels.map((h) => h.id).sort().join('|');
  const listeners = useRef(new Map<string, () => void>());
  const loadedRates = useRef(new Set<string>());

  // Janela nova (virada do dia) ou outro usuário: começa do zero.
  useEffect(() => {
    const current = listeners.current;
    const loaded = loadedRates.current;
    return () => {
      current.forEach((unsubscribe) => unsubscribe());
      current.clear();
      loaded.clear();
      setChecksByHotel({});
    };
  }, [uid, windowStart, windowEnd]);

  useEffect(() => {
    const current = listeners.current;
    const loaded = loadedRates.current;
    const ids = uid && hotelIds ? hotelIds.split('|') : [];
    if (!ids.length) {
      current.forEach((unsubscribe) => unsubscribe());
      current.clear();
      loaded.clear();
      setChecksByHotel({});
      setRatesLoading(!hotelsLoaded);
      return;
    }
    const wanted = new Set(ids);
    const checkDone = () => setRatesLoading(ids.some((id) => !loaded.has(id)));

    // Hotéis removidos: cancela o ouvinte e tira as tarifas da memória.
    current.forEach((unsubscribe, hotelId) => {
      if (wanted.has(hotelId)) return;
      unsubscribe();
      current.delete(hotelId);
      loaded.delete(hotelId);
      setChecksByHotel(({ [hotelId]: _removed, ...rest }) => rest);
    });

    // Hotéis novos: assina só eles.
    for (const hotelId of ids) {
      if (current.has(hotelId)) continue;
      current.set(
        hotelId,
        onSnapshot(
          query(
            checksCol(hotelId),
            where('stayDate', '>=', windowStart),
            where('stayDate', '<=', windowEnd),
            limit(MAX_RATES_PER_HOTEL),
          ),
          (snap) => {
            const rows = snap.docs.map((d) => toRateCheck(d.data())).filter((c): c is RateCheck => c !== null);
            setChecksByHotel((prev) => ({ ...prev, [hotelId]: rows }));
            loaded.add(hotelId);
            checkDone();
          },
          (err) => {
            setError(firestoreErrorMessage(err));
            loaded.add(hotelId);
            checkDone();
          },
        ),
      );
    }
    checkDone();
  }, [uid, hotelIds, windowStart, windowEnd, hotelsLoaded]);

  // Relógio: atualiza a cada minuto (preço "desatualizado", virada do dia).
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const year = Number(today.slice(0, 4));
  const holidays = useMemo(() => holidayMap([year, year + 1]), [year]);

  const checks = useMemo(() => {
    const current = new Set(hotels.map((h) => h.id));
    return Object.entries(checksByHotel)
      .filter(([id]) => current.has(id))
      .flatMap(([, rows]) => rows);
  }, [checksByHotel, hotels]);
  const rateIndex = useMemo(() => buildRateIndex(checks), [checks]);

  const alerts = useMemo(
    () => buildAlerts({ client, hotels, checks, index: rateIndex, events, holidays, now, today }),
    [client, hotels, checks, rateIndex, events, holidays, now, today],
  );
  const unreadCount = alerts.filter((a) => !readAlerts[a.id]).length;

  const value: HotelsContextValue = {
    client,
    hotels,
    now,
    today,
    loading: !!uid && !error && !(clientLoaded && hotelsLoaded),
    error,
    checks,
    checksByHotel,
    rateIndex,
    ratesLoading,
    events,
    holidays,
    savedSearches,
    alerts,
    readAlerts,
    unreadCount,
  };

  return <HotelsContext.Provider value={value}>{children}</HotelsContext.Provider>;
}

/** Acesso aos dados da rede em qualquer tela. */
export function useHotelsData(): HotelsContextValue {
  const context = useContext(HotelsContext);
  if (!context) throw new Error('useHotelsData precisa estar dentro de <HotelsProvider>.');
  return context;
}

// ---------- conversão dos documentos do Firestore para os tipos do app ----------

function emptyClient(): Client {
  return { id: CLIENT_ID, name: '', alertThresholdPct: DEFAULT_THRESHOLD_PCT, alertRules: toAlertRules(undefined) };
}

const STATUSES: CheckStatus[] = ['ok', 'sold_out', 'blocked', 'failed'];

function toLatest(raw: unknown): LatestCheck {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    status: STATUSES.includes(r.status as CheckStatus) ? (r.status as CheckStatus) : 'failed',
    price: typeof r.price === 'number' ? r.price : null,
    checkedAt: typeof r.checkedAt === 'string' ? r.checkedAt : null,
    previousPrice: typeof r.previousPrice === 'number' ? r.previousPrice : undefined,
    changedAt: typeof r.changedAt === 'string' ? r.changedAt : undefined,
  };
}

function toProperty(raw: unknown, fallbackId: string): Property {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: typeof r.id === 'string' ? r.id : fallbackId,
    name: typeof r.name === 'string' ? r.name : 'Sem nome',
    bookingUrl: typeof r.bookingUrl === 'string' && r.bookingUrl ? r.bookingUrl : undefined,
    latest: toLatest(r.latest),
    competitorKey: typeof r.competitorKey === 'string' && r.competitorKey ? r.competitorKey : undefined,
  };
}

function toHotel(id: string, data: Record<string, unknown>): Hotel {
  const competitors = Array.isArray(data.competitors) ? data.competitors : [];
  return {
    id,
    order: typeof data.order === 'number' ? data.order : 0,
    own: toProperty(data.own, id),
    competitors: competitors.map((c, i) => toProperty(c, `${id}-${i + 1}`)),
    city: typeof data.city === 'string' && data.city.trim() ? data.city.trim() : undefined,
    floorPrice: typeof data.floorPrice === 'number' && data.floorPrice > 0 ? data.floorPrice : undefined,
  };
}

function toRateCheck(data: Record<string, unknown>): RateCheck | null {
  if (typeof data.propertyId !== 'string' || typeof data.checkedAt !== 'string') return null;
  return {
    propertyId: data.propertyId,
    status: typeof data.status === 'string' ? data.status : 'failed',
    price: typeof data.price === 'number' ? data.price : null,
    checkedAt: data.checkedAt,
    stayDate: typeof data.stayDate === 'string' ? data.stayDate : undefined,
  };
}

function toEvent(id: string, data: Record<string, unknown>): CalendarEvent {
  const kind = data.kind === 'feriado' || data.kind === 'descartado' ? data.kind : 'evento';
  return {
    id,
    date: typeof data.date === 'string' ? data.date : '',
    city: typeof data.city === 'string' ? data.city : '',
    name: typeof data.name === 'string' ? data.name : 'Evento',
    kind,
  };
}

function toSavedSearch(id: string, data: Record<string, unknown>): SavedSearch {
  const f = (data.filters ?? {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === 'string' ? v : '');
  const filters: CatalogFilters = {
    text: text(f.text),
    city: text(f.city),
    minPrice: text(f.minPrice),
    maxPrice: text(f.maxPrice),
    role: f.role === 'own' || f.role === 'competitor' ? f.role : 'all',
  };
  return {
    id,
    name: typeof data.name === 'string' ? data.name : 'Pesquisa',
    filters,
    createdAt: typeof data.createdAtIso === 'string' ? data.createdAtIso : '',
  };
}
