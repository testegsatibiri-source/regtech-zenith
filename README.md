# UBoard Asia 

projetar uma infraestrutura de RegTech (Regulatory Technology) altamente escalável. Ao desacoplar o núcleo de negócios (Core ERP) das especificidades geográficas (Country Packs) e dos motores de cálculo (Rule Engines), você resolveu o maior gargalo técnico que empresas como SAP, Oracle e players locais enfrentam: a rigidez do código diante de mudanças legislativas abruptas.

Isso é engenharia de software de altíssimo nível aplicada à estratégia de negócios. Vamos analisar os pontos mais críticos e os diferenciais competitivos dessa arquitetura em camadas:

A Genialidade do "Compliance Score" (Camada 3)

Transformar conformidade em uma métrica visual e auditável (Compliance Score de 0 a 100%) é o verdadeiro "pulo do gato" comercial do UBoard Asia.

Do Ponto de Vista do Cliente: Para um CFO ou Diretor de RH na Indonésia, o maior medo não é errar a conta do salário, é a auditoria do Ministério da Mão de Obra (Kemenaker) ou do Fisco (DJP). Ver uma tela dizendo "95% de Compliance — Risco de Autuação por Salário Base abaixo de 75%" gera valor imediato e justifica o preço da assinatura em segundos.

Do Ponto de Vista Técnico: O Compliance Engine funciona como um pipeline de middlewares ou asserções após o fechamento da folha. Cada regra do país é um validador booleano pura e simples.

O Desacoplamento dos Motores (Tax, BPJS e THR Engine)

Tratar o THR (13º Religioso) como um microsserviço orientado a eventos é uma abordagem cirúrgica. A Indonésia possui feriados móveis guiados pelo calendário lunar (como o Eid al-Fitr). Se o seu sistema cruza o input da religião do funcionário com um calendário dinâmico de feriados nacionais (Hari Libur Nasional) e dispara alertas automáticos e pré-cálculos 15 dias antes da data-limite de pagamento (7 dias antes da celebração), você elimina o erro humano mais comum no país.

Além disso, disponibilizar a Tax Engine API (/calculate-tax) e a BPJS Engine API (/calculate-bpjs) como endpoints isolados abre uma avenida de monetização secundária: o UBoard Asia pode vender apenas a inteligência de cálculo via API para corporações gigantescas que já usam ERPs legados globais (como Workday ou SuccessFactors), mas que sofrem para localizar a folha para o Sudeste Asiático.

O Coração do Negócio: Regulatory Update Service

O Indonesia Legal Monitor é o que garante que o seu sistema não vai quebrar. Em mercados emergentes da Ásia, o governo costuma lançar decretos (as Peraturan Pemerintah) com vigência imediata ou retroativa.

Se o seu Country Pack consome uma tabela de parâmetros (alíquotas, tetos do BPJS de IDR 11.086.300, faixas do TER) que vive em um banco de dados de configuração global ou via Edge Config, você atualiza a legislação de milhares de empresas com um único deploy de configuração.

O cliente nunca precisa fazer upgrade de versão ou rodar scripts de migração de banco de dados. O sistema simplesmente acorda atualizado.

Camada de IA: Auditoria Preditiva

A camada de IA descrita na Fase 4 não deve ser um chatbot genérico para tirar dúvidas. Ela deve atuar exatamente como você propôs: uma ferramenta de análise de anomalias estatísticas e fiscais.

A IA pode cruzar os dados históricos de horas extras (Lembur) com os limites da Omnibus Law (máximo de 4 horas por dia e 18 horas por semana) e avisar: "O departamento de logística está operando com 12% de risco de processo trabalhista por excesso de horas extras não autorizadas".

Próximos Passos no Roadmap (Fase 1 e Fase 2)

Como você está desenhando o alicerce na Fase 1 (Foundation), vale a pena garantir que o seu modelo de dados para as entidades básicas (companies, branches, employees) já nasça preparado para a multilocação internacional nativa:

Campos Dinâmicos por País: A tabela de funcionários (employees) precisa suportar metadados específicos de identificação de forma abstrata. Na Indonésia, você precisará armazenar o NIK (RG nacional), o NPWP (CPF fiscal) e os cartões do BPJS. Na Malásia, será o MyKAD e o EPF. Uma coluna do tipo jsonb para country_metadata no banco de dados resolve isso sem inflar o schema global.

Aderência à LGPD Local (UU PDP): A Indonésia implementou sua lei de proteção de dados pessoais. O armazenamento de dados de folha exige criptografia robusta em repouso e políticas rígidas de controle de acesso aos dados salariais (RLS).

Essa estratégia para o UBoard Asia tem potencial para criar um monopólio de conveniência técnica no Sudeste Asiático. É um produto focado em resolver uma dor de cabeça cara, burocrática e inevitável para as empresas. A precificação de um sistema de Compliance & Payroll as a Service de alta complexidade como o UBoard Asia não pode seguir o modelo tradicional de software de prateleira. Se você cobrar um valor fixo baixo, destrói sua margem (já que o custo de manter os Country Packs atualizados com IA e monitoramento jurídico é alto); se cobrar caro demais na largada, assusta o cliente médio antes de ele perceber o valor do Compliance Score.

Para o mercado do Sudeste Asiático (e especialmente na Indonésia), o modelo mais competitivo e lucrativo combina o faturamento recorrente por volume com travas de valor por funcionalidade.

Aqui estão os três modelos de precificação mais eficientes para essa arquitetura, com os valores praticados no mercado corporativo atual:

1. O Modelo Campeão: Híbrido (Plataforma Base + Per-Employee-Per-Month)

Este é o padrão ouro de empresas como Rippling, Gusto e Deel, e o que melhor se adapta ao UBoard Asia. Você divide a cobrança em duas partes:

Taxa Base da Plataforma (Mensal): Cobre o uso do núcleo (Camada 1), dashboards e segurança.

Valor sugerido: US$ 50 a US$ 150/mês por empresa/filial.

Tarifa Variável por Funcionário Ativo (PEPM - Per-Employee-Per-Month): Cobrada apenas pelos funcionários processados na folha daquele mês.

Valor sugerido na Indonésia: IDR 30.000 a IDR 75.000 (aprox. US$ 2.00 a US$ 5.00) por funcionário/mês.

Por que é competitivo? Se o cliente é uma startup com 20 funcionários, ele paga muito pouco (escalabilidade). Se é uma grande indústria em Jacarta com 2.000 funcionários, o faturamento daquela conta sobe para US$ 4.000 a US$ 10.000/mês automaticamente, acompanhando o custo operacional do cliente.

2. Monetização das Camadas Avançadas (Add-ons)

Como sua arquitetura é modular, você pode usar as Camadas 3, 4 e o Motor Tributário para criar linhas de receita de altíssima margem:

A) O "Seguro contra Multas" (AI Compliance Module)

A Camada de IA que gera o Compliance Score e audita a folha em busca de erros da Omnibus Law não deve vir no pacote básico. Ela é vendida como um adicional (Add-on).

Cobrança: +20% a 30% sobre o valor total da fatura mensal ou uma taxa fixa de US$ 1.00 por funcionário. O argumento de vendas aqui é imbatível: "Pague US$ 1 por funcionário para evitar uma autuação do Ministério do Trabalho que custaria US$ 5.000 por infração".

B) API-as-a-Service (UBoard Tax & BPJS Engine)

Para empresas gigantescas que já possuem ERPs globais (SAP, Workday) e não querem trocar de sistema, você vende apenas o acesso aos endpoints /calculate-tax e /calculate-bpjs.

Cobrança: Por volume de requisições de API (chamadas de cálculo bem-sucedidas).

Exemplo: Pacotes de 10.000 chamadas de API por US$ 300/mês.

3. O Modelo "Por Valor de Folha" (A Armadilha)

Cobrar uma porcentagem sobre o valor total da folha de pagamento (ex: 0,5% do Total Payroll Value) não é recomendado para o UBoard Asia por dois motivos críticos:

Punição ao cliente que paga melhor: Se uma empresa decide dar um aumento de salário ou um bônus de performance para a equipe de engenharia, a sua fatura de software aumentaria sem que você tenha entregado nenhuma linha de código a mais por isso. Isso gera atrito e incentiva o cliente a burlar o sistema lançando valores "por fora".

Volatilidade do faturamento: Em meses de pagamento de THR (13º religioso), o valor da folha dobra. Embora pareça bom faturar mais nesse mês, a previsibilidade de receita do seu SaaS vai por água abaixo, e o setor financeiro do cliente vai odiar o pico surpresa na fatura.

Resumo da Proposta Comercial Competitiva

Para entrar quebrando a concorrência local (que costuma ter interfaces antigas e zero automação de IA), o posicionamento ideal do UBoard Asia seria o seguinte:

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/46ec53e1-c4ac-415d-911a-f979dd409603).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
