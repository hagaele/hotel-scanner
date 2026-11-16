import { collection, doc } from 'firebase/firestore';

import { CLIENT_ID, db } from '@/lib/firestore';

/**
 * Modelo de dados no Firestore:
 *
 * clients/{clientId}                                  nome do cliente, limite de destaque e regras de alerta
 * clients/{clientId}/hotels/{hotelId}                 unidade (localização, preço-piso) + concorrentes, cada um com o "latest"
 * clients/{clientId}/hotels/{hotelId}/checks/{id}     histórico: uma leitura por documento, com a data de estadia, nunca sobrescrita
 * clients/{clientId}/hotels/{hotelId}/decisions/{id}  decisões sobre a sugestão de preço de uma data
 * clients/{clientId}/events/{id}                      eventos e feriados locais cadastrados (e datas descartadas)
 * clients/{clientId}/savedSearches/{id}               pesquisas salvas do catálogo
 * clients/{clientId}/userState/{uid}                  alertas já lidos por cada usuário
 *
 * Os caminhos ficam todos aqui, para nenhuma tela montar caminho "na mão".
 */
export const clientRef = () => doc(db, 'clients', CLIENT_ID);
export const hotelsCol = () => collection(db, 'clients', CLIENT_ID, 'hotels');
export const hotelRef = (hotelId: string) => doc(db, 'clients', CLIENT_ID, 'hotels', hotelId);
export const checksCol = (hotelId: string) => collection(db, 'clients', CLIENT_ID, 'hotels', hotelId, 'checks');
export const decisionsCol = (hotelId: string) => collection(db, 'clients', CLIENT_ID, 'hotels', hotelId, 'decisions');
export const eventsCol = () => collection(db, 'clients', CLIENT_ID, 'events');
export const eventRef = (eventId: string) => doc(db, 'clients', CLIENT_ID, 'events', eventId);
export const savedSearchesCol = () => collection(db, 'clients', CLIENT_ID, 'savedSearches');
export const savedSearchRef = (searchId: string) => doc(db, 'clients', CLIENT_ID, 'savedSearches', searchId);
export const userStateRef = (uid: string) => doc(db, 'clients', CLIENT_ID, 'userState', uid);
