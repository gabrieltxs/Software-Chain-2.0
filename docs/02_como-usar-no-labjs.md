# 02 · Como usar no Lab.js

## Opção mais simples: importar o arquivo pronto

Use o arquivo:

- `dist/main.refatorado.json`

### Passo a passo

1. Abra o builder do Lab.js.
2. Importe o arquivo JSON refatorado.
3. Revise as telas e scripts.
4. Rode o preview para testar.
5. Exporte o experimento para o formato de implantação desejado.

## Estrutura interna

O JSON foi gerado a partir de:

- `src/common/theme.css`
- `src/stages/stage1.html`
- `src/stages/stage1.js`
- `src/stages/stage2.html`
- `src/stages/stage2.js`
- `src/stages/stage3.html`
- `src/stages/stage3.js`

## Regerando o JSON depois de editar o código-fonte

Após modificar os arquivos em `src/`, rode:

```bash
python tools/build_labjs_json.py
```

Isso sobrescreve:

- `dist/main.refatorado.json`

## Arquivo original

Uma cópia do experimento original foi preservada em:

- `source/original/main.original.json`

Isso ajuda a comparar alterações e revisar o que foi modificado.
