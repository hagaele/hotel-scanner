import { setDoc } from 'firebase/firestore';

import { withTimeout } from '@/lib/firestore';
import type { AlertRules } from '@/types';

import { clientRef, userStateRef } from './paths';

/** Marca alertas como lidos para o usuário (cada pessoa tem a própria marcação). */
export async function markAlertsRead(uid: string, alertIds: string[]): Promise<void> {
  if (!alertIds.length) return;
  const readAlerts = Object.fromEntries(alertIds.map((id) => [id, true]));
  await withTimeout(setDoc(userStateRef(uid), { readAlerts }, { merge: true }));
}

/** Salva as regras de alerta da rede. */
export async function saveAlertRules(rules: AlertRules): Promise<void> {
  // alertThresholdPct acompanha a regra "Unidade fora da média" (o limite de destaque é um número só).
  await withTimeout(setDoc(clientRef(), { alertRules: rules, alertThresholdPct: rules.outOfRangePct }, { merge: true }));
}
