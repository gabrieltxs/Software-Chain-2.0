#!/usr/bin/env python3
"""Recompõe o JSON do Lab.js a partir dos arquivos-fonte refatorados."""

import base64
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE_JSON = ROOT / 'source' / 'original' / 'main.original.json'
DIST_JSON = ROOT / 'dist' / 'main.refatorado.json'

THEME = (ROOT / 'src' / 'common' / 'theme.css').read_text(encoding='utf-8')
INLINE_ASSETS = {
    '__CHAIN2_LOGO__': ROOT / 'assets' / 'logo' / 'chain2.png',
    '__LAEC_LOGO__': ROOT / 'assets' / 'logo' / 'laec_logo.png',
    '__JULIO_PHOTO__': ROOT / 'assets' / 'logo' / 'julio.png',
    '__LORISMARIO_PHOTO__': ROOT / 'assets' / 'logo' / 'lorismario.png',
    '__GABRIEL_PHOTO__': ROOT / 'assets' / 'logo' / 'gabriel.png',
}


def file_to_data_uri(path: Path) -> str:
    suffix = path.suffix.lower()
    mime = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
    }.get(suffix, 'application/octet-stream')
    encoded = base64.b64encode(path.read_bytes()).decode('ascii')
    return f'data:{mime};base64,{encoded}'


INLINE_REPLACEMENTS = {
    '__COMMON_THEME__': THEME,
    **{marker: file_to_data_uri(path) for marker, path in INLINE_ASSETS.items()},
}

def inline_html(path: Path) -> str:
    html = path.read_text(encoding='utf-8')
    for marker, replacement in INLINE_REPLACEMENTS.items():
        html = html.replace(marker, replacement)
    return html

def read_text(path: Path) -> str:
    return path.read_text(encoding='utf-8')

data = json.loads(SOURCE_JSON.read_text(encoding='utf-8'))
components = data['components']

components['12']['title'] = 'Apresentação e Configuração'
components['12']['content'] = inline_html(ROOT / 'src' / 'stages' / 'stage1.html')
components['12']['messageHandlers'][0]['code'] = read_text(ROOT / 'src' / 'stages' / 'stage1.js')

components['14']['title'] = 'Objetos'
components['14']['content'] = inline_html(ROOT / 'src' / 'stages' / 'stage2.html')
components['14']['messageHandlers'][0]['code'] = read_text(ROOT / 'src' / 'stages' / 'stage2.js')

components['8']['title'] = 'Execução'
components['8']['content'] = inline_html(ROOT / 'src' / 'stages' / 'stage3.html')
components['8']['messageHandlers'][0]['code'] = read_text(ROOT / 'src' / 'stages' / 'stage3.js')
components['8']['responses'] = [{
    'label': '',
    'event': '',
    'target': '',
    'filter': ''
}]

components['13']['title'] = 'main'
components['13']['messageHandlers'][0]['code'] = """handMeDowns: ['datastore', 'el', 'debug'];
const sharedDatastore = new lab.data.Store();
sharedDatastore.show = function() {
  console.log('datastore contents:', this.entries || this.data || this);
};
window.datastore = sharedDatastore;
datastore = sharedDatastore;

const sharedObjectStore = new lab.data.Store();
sharedObjectStore.show = function() {
  console.log('datastore_objs contents:', this.entries || this.data || this);
};
window.datastore_objs = sharedObjectStore;
datastore_objs = sharedObjectStore;"""

# Ajustes leves nos textos das telas intermediárias
screen_updates = {
    '5': 'Abrindo apresentação do LAEC',
    '19': 'Abrindo definição dos elos',
    '11': 'Iniciando experimento',
    '9': 'Experimento encerrado.\n\nObrigado!\n\nChame o pesquisador ou entrevistador.'
}
for cid, text in screen_updates.items():
    for obj in components[cid].get('content', []):
        if obj.get('type') == 'i-text':
            obj['text'] = text
            obj['fontWeight'] = 'bold'

data['components']['root']['metadata'] = {
    'title': 'Experimento de cadeia refatorado',
    'description': 'Versão refatorada de um experimento em Lab.js com interface redesenhada, correções funcionais e documentação ampliada.',
    'repository': 'Repositório local exportado em zip',
    'contributors': 'OpenAI · refatoração assistida'
}

DIST_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Arquivo gerado em: {DIST_JSON}')
