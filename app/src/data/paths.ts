import { collection, doc } from 'firebase/firestore';

import { CLIENT_ID, db } from '@/lib/firestore';

/**
 * Modelo de dados no Firestore:
 *
 * clients/{clientId}                               nome do cliente e limite de destaque
 * clients/{clientId}/hotels/{hotelId}              hotel próprio + 3 concorrentes, cada um com o "latest"
 * clients/{clientId}/hotels/{hotelId}/checks/{id}  histórico: uma leitura por documento, nunca sobrescrita
 *
 * Os caminhos ficam todos aqui, para nenhuma tela montar caminho "na mão".
 */
export const clientRef = () => doc(db, 'clients', CLIENT_ID);
export const hotelsCol = () => collection(db, 'clients', CLIENT_ID, 'hotels');
export const hotelRef = (hotelId: string) => doc(db, 'clients', CLIENT_ID, 'hotels', hotelId);
export const checksCol = (hotelId: string) => collection(db, 'clients', CLIENT_ID, 'hotels', hotelId, 'checks');
