import type { Persistence } from 'firebase/auth';

/**
 * O pacote firebase/auth tem a função getReactNativePersistence no build de React Native,
 * mas os tipos padrão do TypeScript são os da web e não a declaram.
 * Esta declaração só informa o TypeScript; o código real vem do próprio Firebase.
 */
declare module 'firebase/auth' {
  interface ReactNativeAsyncStorage {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
