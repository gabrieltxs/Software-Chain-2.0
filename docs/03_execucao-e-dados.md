# 03 · Execução do experimento e coleta de dados

## Como a execução funciona

Na fase experimental:

1. os estímulos são mostrados em ordem embaralhada
2. o participante deve clicar no item correto da sequência
3. cada clique conta como tentativa
4. acertos e erros são contabilizados
5. após um número configurável de acertos, um bloco de dicas é aberto
6. a sessão encerra por:
   - tempo
   - acertos
   - erros
   - tentativas
   - ou fim da cadeia completa

## Dados registrados

Além dos dados automáticos do Lab.js, a versão refatorada preenche também:

- `final_log`
- `results_json`
- `end_reason`
- `total_time_seconds`
- `total_attempts`
- `total_correct`
- `total_incorrect`

## Encerramento e download automático

Quando um critério de conclusão é atingido:

- a interface é bloqueada por um overlay em tela cheia
- a tela orienta o participante a chamar o pesquisador responsável
- o botão **“Obrigado”** conclui a tarefa e mantém a tela inutilizada

Ao clicar em **“Obrigado”**:

- os campos finais são preparados
- o download de uma planilha `XLSX` é disparado
- a submissão do `html.Form` acontece normalmente

Assim, o comportamento fica mais próximo do uso correto do Lab.js, sem perder a conveniência do arquivo final estruturado.

## Onde encontrar os dados

### 1. No dataset exportado do Lab.js
Útil para análise tabular e consolidação entre participantes.

### 2. No arquivo `XLSX`
Útil para inspeção rápida, conferência manual e auditoria de uma sessão individual, com abas para participante, configuração, objetos, dicas e resultados.

### 3. Em plataformas externas
Se o experimento for implantado em Open Lab, JATOS ou integração genérica com survey, os dados podem ser exportados pela própria plataforma.

## Sugestão prática de análise

Para análise automatizada:

- use a aba `Resultados` do `XLSX` para leitura rápida com tabelas e plots
- use `results_json` quando precisar reconstruir todas as tentativas
- use `end_reason` e os totais para resumos por participante
- use `final_log` apenas como trilha textual de conferência
