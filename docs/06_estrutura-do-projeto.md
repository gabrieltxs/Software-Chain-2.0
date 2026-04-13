# 06 · Estrutura do projeto

```text
labjs_chain_refatorado/
├── README.md
├── assets/
│   ├── audio/
│   └── images/
├── dist/
│   └── main.refatorado.json
├── docs/
│   ├── 01_visao-geral.md
│   ├── 02_como-usar-no-labjs.md
│   ├── 03_execucao-e-dados.md
│   ├── 04_base-teorica.md
│   ├── 05_refatoracao_e_decisoes.md
│   └── 06_estrutura-do-projeto.md
├── examples/
│   ├── config_exemplo.json
│   └── objetos_exemplo.json
├── source/
│   └── original/
│       └── main.original.json
├── src/
│   ├── common/
│   │   └── theme.css
│   └── stages/
│       ├── stage1.html
│       ├── stage1.js
│       ├── stage2.html
│       ├── stage2.js
│       ├── stage3.html
│       └── stage3.js
└── tools/
    └── build_labjs_json.py
```

## O que editar primeiro

- Quer mudar o visual geral? → `src/common/theme.css`
- Quer mexer na fase 1? → `src/stages/stage1.*`
- Quer mexer na fase 2? → `src/stages/stage2.*`
- Quer mexer na fase 3? → `src/stages/stage3.*`
- Quer gerar novamente o JSON do Lab.js? → `tools/build_labjs_json.py`
