# Briefing de design — HOFIX

Crie a **identidade visual** e as **telas** de um aplicativo chamado **HOFIX** (proponha também 2 alternativas de nome curtas, em português ou neutras).

---

## 1. O produto

Um app para **celular (Android e iPhone) e navegador** em que uma rede hoteleira acompanha, ao longo do dia, o **preço da diária de hoje** dos seus hotéis comparado com o dos concorrentes diretos de cada hotel.

- O cliente tem **9 hotéis**, cada um com **3 concorrentes**.
- Os preços são atualizados **de hora em hora, das 8h às 20h**. Depois das 20h não há atualização.
- O uso é rápido e frequente: o gerente abre o app várias vezes ao dia, **no celular, muitas vezes em pé, no balcão ou na rua**, e precisa entender em 3 segundos: *"meu hotel está caro ou barato em relação aos concorrentes agora?"*. A decisão que ele toma é subir ou baixar o próprio preço.

## 2. Público

Donos, gerentes e equipe de revenue de hotéis e pousadas no Brasil. São profissionais ocupados, nem sempre familiarizados com tecnologia, com idade entre 30 e 60 anos. Querem números claros, não gráficos complicados.

## 3. Personalidade da marca

- **Confiável e precisa**, como um instrumento de medição: dado limpo, sem enfeite.
- **Calma e profissional**, sem alarmismo. As cores de alerta aparecem só quando importa.
- **Hospitalidade moderna**: pode ter um toque acolhedor, mas sem clichês de turismo (praia, palmeira, mala).
- Palavras-chave: clareza, controle, vantagem, tempo real, sóbrio.

Evitar: visual de cassino ou bolsa de valores frenético, excesso de gradientes, ilustrações infantis, e **qualquer semelhança com a marca do Booking.com** (o azul e amarelo dele, logo ou tipografia). O app não é do Booking.com e não pode parecer ser.

## 4. Entregáveis da identidade

1. **Logotipo**: versão horizontal (símbolo + nome), símbolo sozinho, versões clara e escura. A ideia do símbolo pode explorar comparação, varredura (scan), régua ou termômetro de preço, ou um prédio estilizado.
2. **Ícone do app** (quadrado, legível em 48 px).
3. **Paleta de cores**:
   - cor principal da marca + neutros;
   - cores **semânticas**, que são essenciais: *mais barato que a média*, *mais caro que a média*, *em destaque (fora do limite)*, *esgotado*, *desatualizado/sem dado*, *erro*;
   - tema claro e tema escuro;
   - contraste mínimo WCAG AA, legível **sob sol forte**. Não depender só da cor: usar também ícone/seta (▲▼) e texto.
4. **Tipografia**: uma família de fonte gratuita (Google Fonts) com **números tabulares**, para os preços alinharem. Defina a escala: preço grande, títulos, corpo e legendas.
5. **Componentes**: cartão de hotel, linha de preço (hotel/concorrente), selo de status, chip de diferença %, botão, campo de texto, abas, filtro, gráfico de linhas, barra de navegação, cabeçalho com horário da atualização.
6. **Regras básicas**: espaçamentos (grade de 4 ou 8 px), raios de borda, sombras e alvos de toque de no mínimo 44 px.

## 5. Formato e restrições técnicas

- O app será desenvolvido em **React Native (Expo)** com **Firebase**. O design precisa ser implementável com componentes nativos simples: sem efeitos que só existem na web, e blur e transparências com moderação.
- Telas mobile em **390 × 844**. Uma versão web/desktop do painel em **1440 × 900**.
- Moeda e datas no padrão brasileiro: **R$ 1.234,56**, **dd/mm**, **HH:MM**. Textos em **português do Brasil**.

## 6. Telas

Use os **dados de exemplo** da seção 7 em todas as telas.

### 6.1 Login
Logo, e-mail, senha, botão "Entrar", link "Esqueci minha senha". Mostre também o estado de erro ("E-mail ou senha incorretos").

### 6.2 Esqueci minha senha
Campo de e-mail + botão "Enviar link" + confirmação "Enviamos um link para seu e-mail".

### 6.3 Painel (tela principal) — a mais importante
- Cabeçalho: logo/nome do cliente ("Rede Litoral Hotéis"), **"Atualizado às 14:00 · próxima às 15:00"**.
- Resumo no topo: quantos hotéis estão **acima**, **abaixo** e **em destaque**.
- Filtro: "Todos" / "Só em destaque".
- **Lista de 9 cartões**, um por hotel próprio. Cada cartão mostra:
  - nome do hotel;
  - **preço de hoje** (grande);
  - média dos 3 concorrentes;
  - **diferença %** em relação à média, com seta ▲/▼ e cor;
  - indicação discreta dos 3 concorrentes (mini-barra de posição: o hotel é o mais barato, o do meio ou o mais caro);
  - selo **"Em destaque"** quando a diferença passa de 10%.
- Mostre cartões em estados diferentes: normal, em destaque acima, em destaque abaixo, **esgotado**, **desatualizado** (cinza, "última leitura às 11:00") e **falha na leitura**.

### 6.4 Painel fora do horário
Mesma tela depois das 20h, com aviso amigável: **"Atualizações retomam amanhã às 08:00"** e os últimos preços do dia.

### 6.5 Detalhe do hotel
- Nome do hotel e status.
- Lista comparativa: **o hotel próprio em destaque** + os 3 concorrentes, cada um com preço, diferença % em relação ao hotel próprio, ▲/▼ e o preço anterior quando mudou hoje (ex.: "era R$ 420,00 às 10:00"), além do horário da última verificação e um link "Ver no Booking.com".
- **Gráfico de linhas** com abas **Hoje** (eixo de 8h a 20h, pontos de hora em hora) e **7 dias**. O hotel próprio fica em linha mais grossa e destacada; os concorrentes em cores secundárias; e há uma legenda clara.

### 6.6 Saúde da coleta (apenas administrador)
Tela técnica e simples para o dono do sistema: últimas execuções (horário, duração, ok / bloqueadas / falhas), taxa de sucesso do dia e da semana, e lista de propriedades com problema. Pode ser mais densa que as outras.

### 6.7 Estados gerais
Carregando (skeleton), sem conexão, lista vazia ("Nenhum hotel em destaque agora", sem emoji) e erro genérico.

### 6.8 Versão web (1440 × 900)
Painel em grade (3 colunas de cartões) com o detalhe do hotel abrindo em painel lateral ou em página própria.

## 7. Dados de exemplo (fictícios)

Cliente: **Rede Litoral Hotéis**. Limite de destaque: **10%**. Horário atual nas telas: **14:00**. Calcule média e diferença % a partir dos preços abaixo.

| Hotel próprio | Preço hoje | Concorrentes (preço hoje) | Situação |
|---|---|---|---|
| Hotel Litoral Centro | R$ 389,00 | Hotel Atlântico Plaza R$ 412,00 · Pousada Maré Alta R$ 365,00 · Hotel Farol R$ 398,00 | Normal (−0,7%) |
| Litoral Praia Resort | R$ 720,00 | Resort Costa Dourada R$ 610,00 · Hotel Sol Nascente R$ 585,00 · Pousada Brisa R$ 640,00 | **Destaque: +17,7% acima** |
| Hotel Litoral Express | R$ 219,00 | Ibis Orla R$ 259,00 · Hotel Rota 101 R$ 248,00 · Pousada Caminho R$ 265,00 | **Destaque: −14,9% abaixo** |
| Litoral Business | R$ 455,00 | Hotel Executivo Sul R$ 470,00 · Plaza Negócios R$ 440,00 · Hotel Avenida R$ 462,00 | Normal (−0,5%) |
| Pousada Litoral Verde | Esgotado | Pousada Mata Atlântica R$ 310,00 · Chalés da Serra R$ 295,00 · Pousada Recanto R$ 330,00 | **Esgotado** |
| Litoral Boutique | R$ 610,00 (última leitura 11:00) | Casa Azul Boutique R$ 590,00 · Hotel Arte R$ 640,00 · Villa Mar R$ 605,00 | **Desatualizado** |
| Hotel Litoral Norte | R$ 340,00 | Hotel Enseada R$ 335,00 · Pousada do Porto R$ 352,00 · Hotel Pescador R$ 328,00 | Normal (+0,5%) |
| Litoral Suítes | R$ 298,00 | Flat Mar R$ 285,00 · Hotel Mirante R$ 310,00 · Suítes Orla R$ 300,00 | Normal (−0,1%) |
| Hotel Litoral Sul | — | Hotel Pontal R$ 380,00 · Pousada Coqueiral R$ 360,00 · Hotel Baía R$ 395,00 | **Falha na leitura** |

Para o gráfico "Hoje" do **Litoral Praia Resort**: o hotel próprio ficou em R$ 690,00 das 8h às 10h e subiu para R$ 720,00 às 11h; o Resort Costa Dourada caiu de R$ 650,00 para R$ 610,00 às 13h; os demais ficaram estáveis.

## 8. Ordem de entrega sugerida

1. Página de identidade (logo, ícone, cores, tipografia, componentes e estados).
2. Painel mobile (6.3), com todos os estados.
3. Detalhe do hotel (6.5).
4. Demais telas mobile (6.1, 6.2, 6.4, 6.6, 6.7).
5. Versão web (6.8).
6. Tema escuro do painel e do detalhe.

---

## 9. Decisões já tomadas (para reproduzir o resultado atual)

- **Nomes alternativos:** Paridade e Diária.
- **Símbolo:** quatro barras (seu hotel + 3 concorrentes) cortadas pela linha da média; a barra do seu hotel é a mais alta, em verde-menta. Nome "HOFIX" desenhado com formas geométricas.
- **Cores (claro / escuro):**
  - Marca: verde-abismo `#0F2E2A` e menta `#4FC7A2`; botão principal `#145C50` / `#4FC7A2`.
  - Fundo `#F4F6F5` / `#0C1513`; cartões `#FFFFFF` / `#15201D`; texto `#0E1A18` / `#E8F0ED`.
  - Mais barato (▼): azul-petróleo `#0B5F86` / `#6CC4EA`.
  - Mais caro (▲): cobre `#A0480A` / `#F3A35C`.
  - Em destaque: selo sólido escuro `#0F2E2A` (no escuro, claro `#E8F0ED`).
  - Esgotado: violeta `#5A4790` / `#B9A9F2`. Desatualizado: cinza `#5F6B67` / `#97A39F`. Erro: vermelho `#B3261E` / `#FF8E84`, com borda tracejada no cartão.
- **Fonte:** IBM Plex Sans (400, 500, 600, 700), números tabulares. Escala: preço 40 / 32 / 20 px; títulos 24 / 18 px; corpo 16 px; rótulo 14 px; legenda 13 px; mínimo 12 px.
- **Regras:** grade de 4 px; raios 6 / 10 / 16 px e pílula; toque mínimo 44 px; sombra só nos cartões do tema claro.
- **Painel:** hotéis em destaque no topo, hotéis sem leitura comparável (falha, desatualizado, esgotado) no fim. Destaque = chip sólido + borda do cartão na cor da direção.
- **Navegação:** barra inferior com Painel, Destaques, Coleta (só administrador) e Conta. Na web, trilho lateral; o detalhe abre em painel de 480 px e a grade passa a 2 colunas.
- **Gráfico:** hotel próprio em 3 px com pontos; concorrentes em 1,75 px com traços diferentes (longo, curto, pontilhado); área futura do dia sombreada com marcador "agora".
