# Briefing — DASH HOTEIS (Monitor de Preços de Diárias)

Versão 3 · novembro/2026
Este briefing **substitui** o MVP web em Python (`mvp.md`, `CLAUDE-mvp.md`) e o plano de coleta minuto a minuto (`plano-v2-tempo-real.md`). Esses documentos ficam só como histórico.

---

## 1. O que é

Um aplicativo para **celular (Android e iPhone) e navegador** onde o cliente, uma rede hoteleira, acompanha durante o dia o **preço da diária no Booking.com** dos seus hotéis e dos concorrentes de cada um, para decidir os próprios preços com rapidez.

O produto é **próprio**, não uma plataforma de terceiros. Ele já nasce preparado para atender outros clientes no futuro (revenda).

## 2. Para quem

- **Cliente inicial:** 9 hotéis próprios, cada um com 3 concorrentes definidos por ele. São **36 propriedades** monitoradas, ou menos se algum concorrente se repetir.
- **Usuários:** o dono e a equipe de revenue/gerência do cliente. Cada usuário vê só os hotéis do próprio cliente.
- **Administrador:** você, que cadastra hotéis e usuários e acompanha se a coleta está funcionando.

## 3. O que o app faz

| Funcionalidade | Detalhe |
|---|---|
| Login | E-mail e senha |
| Painel principal | Um cartão por hotel próprio: preço de hoje, média dos concorrentes, diferença em % e destaque quando a diferença passa do limite (padrão 10%) |
| Detalhe do hotel | Preço do hotel e de cada concorrente, com a diferença de cada um, seta ▲/▼ quando o preço mudou no dia e o horário da última verificação |
| Gráficos | **Hoje** (leituras de hora em hora, das 8h às 20h) e **últimos 7 dias** |
| Atualização automática | Os preços aparecem na tela sozinhos quando chega uma nova leitura, sem precisar recarregar |
| Estados honestos | "Esgotado", "desatualizado" e "falha na leitura" ficam visíveis. O app nunca mostra preço velho como se fosse atual |
| Fora do horário | Depois das 20h, o app mostra os últimos preços do dia e o aviso "próxima atualização amanhã às 8h" |
| Saúde da coleta (só admin) | Quantas leituras deram certo, foram bloqueadas ou falharam, e quantas vezes os preços mudaram |

**Fora desta versão:** notificações push, alertas por e-mail ou WhatsApp, outras datas de check-in, cadastro de clientes pelo próprio app. O Firebase facilita adicionar notificações push depois.

## 4. Regras da coleta

- **Quando:** de hora em hora, **das 8h às 20h** (horário de Brasília), todos os dias. São 13 coletas por dia, e nenhuma fora desse horário.
- **O quê:** preço da diária de **hoje** (check-in hoje, check-out amanhã), 1 quarto, 2 adultos, em reais, considerando o quarto mais barato disponível. **A confirmar com o cliente:** se o preço é com ou sem taxas e se vale tarifa não reembolsável.
- **Volume:** 36 × 13 = **468 leituras por dia (~14 mil por mês)**. É baixo, cerca de 100 vezes menos que no plano minuto a minuto.
- **Histórico:** toda leitura é guardada e nunca sobrescrita.

## 5. Como será construído

**Stack obrigatória (não negociável): React Native + Firebase.** Tudo o que está abaixo fica dentro dessas duas tecnologias. O Expo é o framework de React Native recomendado pela documentação oficial do React Native, não uma tecnologia diferente.

| Peça | Tecnologia |
|---|---|
| App (celular + web) | **React Native com Expo**: um único código gera Android, iPhone e a versão web |
| Login | Firebase Authentication |
| Banco de dados | Cloud Firestore. As telas recebem os preços em tempo real |
| Coleta automática | Função agendada do Firebase (Cloud Functions + Cloud Scheduler) com navegador headless |
| Site | Firebase Hosting |
| Proxy (se precisar) | Proxy residencial (ex.: Decodo), só se o Booking.com bloquear |
| Desenvolvimento | Claude Code, seguindo o `CLAUDE.md` |

## 6. Custos estimados

| Item | Custo | Observação |
|---|---|---|
| Firebase (plano Blaze, pago por uso) | Provavelmente US$0 a poucos dólares por mês | O plano Blaze é obrigatório para funções agendadas e exige cartão. Neste volume, o uso deve ficar dentro ou perto da cota gratuita |
| Proxy residencial | US$0, ou ~US$15 a 25 por mês se for necessário | ~14 mil leituras × ~0,5 MB ≈ 7 GB por mês |
| Google Play | US$25, pagamento único | Para publicar na loja. No teste, dá para instalar o APK direto |
| Apple Developer | US$99 por ano | Só se o app for publicado para iPhone. No teste, o cliente pode usar a versão web no iPhone |

## 7. Riscos

- **Termos de Uso do Booking.com.** Coletar preços do site contraria os Termos de Uso dele. Com ~470 leituras por dia, o risco de bloqueio é baixo, mas o risco contratual continua existindo. É uma decisão consciente do negócio e deve ser apresentada ao cliente, não escondida.
- **Bloqueio de IP de servidor.** As funções do Firebase rodam em IPs do Google, que o Booking.com pode tratar com mais desconfiança do que uma conexão de casa. O primeiro teste técnico verifica isso. Se houver bloqueio, entra o proxy residencial.
- **Mudança de layout.** Quando o Booking.com mudar a página, a leitura do preço pode quebrar e vai exigir manutenção. A tela de saúde da coleta serve para perceber isso rápido.

## 8. Etapas

1. **Configuração:** projeto Firebase, repositório e ambiente de desenvolvimento.
2. **Teste de coleta:** ler o preço de 3 hotéis reais, conferir com o site e testar a partir do Firebase. *Esta etapa decide se precisa de proxy.*
3. **Banco e coleta agendada:** cadastro dos 36 hotéis e coletas automáticas das 8h às 20h.
4. **App:** login, painel, detalhe, gráficos e estados.
5. **Publicação para teste:** versão web no ar e APK Android para o cliente.
6. **Teste de 2 semanas com o cliente:** medir se o preço lido bate com o site, a taxa de bloqueio, quantas vezes os preços mudam por dia e se o cliente usa o app.

## 9. Pendências com o cliente

- [ ] URLs do Booking.com dos 9 hotéis e dos 27 concorrentes
- [ ] Definição do preço: com ou sem taxas, se vale tarifa não reembolsável, ocupação de 2 adultos
- [ ] Limite de diferença que acende o destaque (sugestão: 10%)
- [ ] Quem terá login (nomes e e-mails)
- [ ] Se o app vai para as lojas (Google Play e App Store) já no teste, ou se começa com web + APK
- [ ] Aceite do risco de Termos de Uso
