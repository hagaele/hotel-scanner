import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';

import { firebaseApp } from './firebase';

/**
 * Autenticação no ANDROID e iPHONE.
 * Sem a persistência com AsyncStorage, o usuário seria deslogado toda vez que fechasse o app.
 * O try/catch evita erro de "auth já inicializado" no recarregamento rápido do Expo.
 */
function createAuth(): Auth {
  try {
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch {
    return getAuth(firebaseApp);
  }
}

export const auth = createAuth();
