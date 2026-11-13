import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';

import { firebaseApp } from './firebase';

/**
 * Cliente (rede hoteleira) exibido no app.
 * Nesta entrega existe um cliente só. O modelo já separa os dados por cliente
 * (clients/{clientId}/...) para o produto atender outras redes no futuro.
 */
export const CLIENT_ID = 'rede-litoral';

/**
 * Banco de dados Firestore.
 * ignoreUndefinedProperties: campos opcionais vazios (ex.: link não informado)
 * são simplesmente omitidos, em vez de gerar erro ao salvar.
 * O try/catch evita erro de "já inicializado" no recarregamento rápido do Expo.
 */
function createFirestore(): Firestore {
  try {
    return initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true });
  } catch {
    return getFirestore(firebaseApp);
  }
}

export const db = createFirestore();

/** Traduz os erros do Firestore para mensagens em português. */
export function firestoreErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  switch (code) {
    case 'permission-denied':
      return 'Sem permissão para acessar os dados. Entre novamente ou confira as regras do Firestore.';
    case 'unavailable':
      return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
    case 'not-found':
      return 'Registro não encontrado. Ele pode ter sido removido.';
    case 'failed-precondition':
      return 'O banco de dados ainda não foi criado no Firebase. Avise o administrador.';
    case 'deadline-exceeded':
      return 'O servidor demorou para responder. Tente de novo.';
    default:
      return 'Não foi possível concluir. Tente novamente.';
  }
}
