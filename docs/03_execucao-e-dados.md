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

## Download automático do log

Ao final da tarefa, o botão **“Obrigado por participar”**:

- prepara os campos finais
- dispara o download de `final_log.txt`
- deixa a submissão do `html.Form` acontecer normalmente

Assim, o comportamento fica mais próximo do uso correto do Lab.js, sem perder a conveniência do arquivo final.

## Onde encontrar os dados

### 1. No dataset exportado do Lab.js
Útil para análise tabular e consolidação entre participantes.

### 2. No arquivo `final_log.txt`
Útil para inspeção rápida, conferência manual e auditoria de uma sessão individual.

### 3. Em plataformas externas
Se o experimento for implantado em Open Lab, JATOS ou integração genérica com survey, os dados podem ser exportados pela própria plataforma.

## Sugestão prática de análise

Para análise automatizada:

- use `results_json` quando precisar reconstruir todas as tentativas
- use `end_reason` e os totais para resumos por participante
- use `final_log` apenas como trilha textual de conferência
