# 05 · Refatoração e decisões técnicas

## Correções relevantes

### 1. Botão final de encerramento
No original, o botão “Obrigado por Participar” fazia `preventDefault()` e disparava apenas o download do log.
Além disso, o `response target` configurado no componente apontava para `#sub_`, que não existia.

Na versão refatorada:

- o botão final é um **submit real**
- os campos finais são preparados antes do envio
- o download do log continua existindo
- o `html.Form` pode encerrar a fase da maneira esperada

### 2. Ordenação dos elos
No original, a fase 3 criava uma ordenação numérica correta, mas depois não a utilizava.
Isso podia gerar ordem incorreta para `Elo 10`, `Elo 11`, etc.

Na versão refatorada:

- a ordenação é feita por número do elo
- essa ordenação é realmente usada na sequência correta

### 3. Store global duplicado
No original, havia um store do Lab.js e outro store separado em `window`.
Isso podia fragmentar a lógica entre:
- coleta automática do Lab.js
- armazenamento usado pelos scripts customizados

Na versão refatorada:

- o store exposto em `window` é o mesmo usado pelo fluxo do experimento

### 4. Carregamento de checkboxes e campos
No original, ao carregar JSONs:
- alguns campos ficavam com valor preenchido
- mas continuavam desabilitados
- ou não refletiam corretamente o estado visual

Na versão refatorada:

- o carregamento reaplica estados visuais e lógicos de forma consistente

### 5. Biblioteca de imagens
No original, as imagens apareciam apenas como referência.
O pesquisador precisava digitar manualmente o nome do arquivo.

Na versão refatorada:

- a biblioteca é clicável
- o elo ativo em modo imagem recebe automaticamente o arquivo escolhido

### 6. Persistência do resultado final
No original, o log final era baixado, mas não era integrado de forma clara ao dataset estruturado.

Na versão refatorada:

- o log é baixado
- e também pode ser serializado em campos ocultos do formulário final

## O que foi mantido intencionalmente

- fluxo geral em três fases
- uso de configurações salvas em JSON
- uso de objetos salvos em JSON
- uso de dicas verbais por conjuntos
- contagem de acertos, erros e tentativas
- encerramento por múltiplos critérios
- log textual final

## O que você pode modificar depois

- visual das telas
- textos de instrução
- quantidade máxima de conjuntos de dicas
- regras de feedback
- formato do log final
- campos extras para análise
