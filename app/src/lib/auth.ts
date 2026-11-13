import { getAuth } from 'firebase/auth';

import { firebaseApp } from './firebase';

/**
 * Autenticação na WEB.
 * No navegador, o getAuth já guarda a sessão (IndexedDB) e mantém o usuário logado ao recarregar.
 * No Android e iPhone o Metro usa o arquivo auth.native.ts no lugar deste.
 */
export const auth = getAuth(firebaseApp);
