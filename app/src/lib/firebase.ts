import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';

/**
 * Configuração do Firebase lida do arquivo .env (ver .env.example).
 *
 * Importante: o Expo só substitui variáveis EXPO_PUBLIC_* quando elas são lidas
 * de forma literal (process.env.EXPO_PUBLIC_X). Por isso cada uma está escrita
 * por extenso, sem montar o nome dinamicamente.
 *
 * Esses valores não são segredos (o Firebase os expõe em todo app web); a segurança
 * dos dados fica nas regras do Firestore. Mesmo assim, ficam fora do Git para cada
 * ambiente usar o próprio projeto.
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/** Nomes das variáveis que faltam no .env (lista vazia = configuração completa). */
export const missingFirebaseEnv: string[] = Object.entries({
  EXPO_PUBLIC_FIREBASE_API_KEY: firebaseConfig.apiKey,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  EXPO_PUBLIC_FIREBASE_APP_ID: firebaseConfig.appId,
})
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missingFirebaseEnv.length > 0) {
  console.warn(
    `[Firebase] Variáveis ausentes no .env: ${missingFirebaseEnv.join(', ')}. ` +
      'Copie app/.env.example para app/.env, preencha e reinicie o "npx expo start".',
  );
}

/** Instância única do app Firebase (reaproveitada no recarregamento rápido do Expo). */
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
