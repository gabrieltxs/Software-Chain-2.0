# 01 · Visão geral do experimento

## O que a tarefa faz

O experimento possui três fases principais:

1. **Configuração**
   - cadastro da sessão
   - definição dos parâmetros
   - definição dos critérios de encerramento
   - definição dos conjuntos de dicas

2. **Definição dos elos**
   - escolha do conteúdo de cada elo da cadeia
   - cada elo pode ser uma **palavra** ou uma **imagem**
   - exportação e importação do conjunto de objetos

3. **Execução**
   - apresentação dos estímulos em ordem embaralhada
   - seleção dos itens na sequência correta
   - abertura de um bloco de dicas após um número configurável de acertos
   - registro de acertos, erros, tentativas, respostas às dicas e motivo de término

## Fluxo preservado

A refatoração manteve a estrutura lógica do experimento original:

- tela intermediária de configuração
- formulário de configuração
- tela intermediária de objetos
- formulário de definição dos elos
- tela intermediária de início
- tarefa experimental
- tela final

## O que mudou

O que mudou foi a **organização**:

- HTML mais limpo
- JavaScript modular por fase
- interface visual mais consistente
- correções em pontos frágeis do código original
- documentação pronta para edição futura

## Para quem este pacote serve

- **Iniciantes**: podem importar o JSON pronto e usar os exemplos.
- **Usuários intermediários**: podem editar HTML e JavaScript por fase.
- **Usuários avançados**: podem alterar o gerador do JSON e reconstruir o experimento.
