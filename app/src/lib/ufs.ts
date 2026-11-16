// Unidades da federação e montagem da localização ("Cidade/UF"), que é como a localização fica gravada no Firestore.

export const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
] as const;

export type Uf = (typeof UFS)[number];

/** Nome de cada UF, para a busca aceitar a sigla ou o nome ("go" ou "goiás"). */
export const UF_NAMES: Record<Uf, string> = {
  AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul',
  MT: 'Mato Grosso', PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco', PI: 'Piauí', PR: 'Paraná',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RO: 'Rondônia', RR: 'Roraima', RS: 'Rio Grande do Sul',
  SC: 'Santa Catarina', SE: 'Sergipe', SP: 'São Paulo', TO: 'Tocantins',
};

export const isUf = (value: string): value is Uf => (UFS as readonly string[]).includes(value);

/** "Brasília" + "DF" -> "Brasília/DF". */
export const joinCity = (city: string, uf: string) => `${city.trim()}/${uf}`;

/** "Caldas Novas/GO" -> { city: "Caldas Novas", uf: "GO" }. Localização fora do padrão fica sem UF. */
export function splitCity(value: string | undefined): { city: string; uf: string } {
  const match = /^(.+)\/([A-Za-z]{2})$/.exec((value ?? '').trim());
  if (!match || !isUf(match[2].toUpperCase())) return { city: (value ?? '').trim(), uf: '' };
  return { city: match[1].trim(), uf: match[2].toUpperCase() };
}

/** Compara nomes de cidade sem acento e sem diferenciar maiúsculas ("goiania" acha "Goiânia"). */
export const foldText = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase('pt-BR');
