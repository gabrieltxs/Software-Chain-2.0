# Experimento de Cadeia para Lab.js — versão refatorada

Este repositório contém uma refatoração completa do experimento originalmente enviado em `main.json`, preservando o fluxo geral e a lógica principal, mas reorganizando o código, corrigindo problemas funcionais e melhorando de forma ampla a interface de uso.

## O que está neste pacote

- `dist/main.refatorado.json` — arquivo pronto para importar no Lab.js.
- `source/original/main.original.json` — cópia do arquivo original.
- `src/` — HTML, CSS e JavaScript das três fases, organizados por etapa.
- `tools/build_labjs_json.py` — script que recompõe o JSON do Lab.js a partir dos arquivos-fonte.
- `assets/` — imagens e áudios extraídos do experimento original.
- `examples/` — exemplos de configuração e definição de objetos.
- `docs/` — documentação detalhada, do nível iniciante ao avançado.

## Principais melhorias implementadas

1. **Interface redesenhada**
   - Fase 1 com cards, resumo visual e campos mais legíveis.
   - Fase 2 com montagem guiada dos elos e biblioteca de imagens clicável.
   - Fase 3 com painel principal mais limpo, indicadores em tempo real e modal de dicas mais claro.

2. **Correções funcionais**
   - Unificação do `datastore` usado pelo Lab.js e pelos scripts customizados.
   - Correção da ordenação dos elos quando há mais de 9 itens.
   - Correção do carregamento de estados de checkboxes e campos desabilitados.
   - Reescrita do encerramento da fase final para usar submissão real do `html.Form`.

3. **Coleta de dados melhorada**
   - O encerramento da Fase 3 agora usa um overlay de bloqueio em tela cheia após o critério de conclusão.
   - Os resultados passam a ser baixados automaticamente em `XLSX`, com abas separadas e plots na aba final.
   - O log textual continua disponível no dataset do Lab.js para conferência.
   - Campos resumo adicionais (`results_json`, `end_reason`, `total_time_seconds`, etc.) foram adicionados.

## Começando rápido

1. Abra o builder do Lab.js.
2. Importe `dist/main.refatorado.json`.
3. Faça um teste no preview.
4. Ajuste o experimento conforme necessário.
5. Exporte para sua forma de coleta preferida.

## Documentação

- `docs/01_visao-geral.md`
- `docs/02_como-usar-no-labjs.md`
- `docs/03_execucao-e-dados.md`
- `docs/04_base-teorica.md`
- `docs/05_refatoracao_e_decisoes.md`

## Observação

A base teórica incluída na documentação não assume que o experimento pertença a um único paradigma clássico. Em vez disso, ela articula o procedimento a partir de três famílias de conceitos que fazem sentido para esta tarefa:

- **cadeias comportamentais e controle de estímulos**
- **prompts, pistas e transferência de controle**
- **evocação por pistas, recuperação semântica e priming**
