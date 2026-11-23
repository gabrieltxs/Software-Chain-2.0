"""Checks do empacotamento; não simulam sessões com participantes no Lab.js."""
import json
from pathlib import Path
import runpy
import unittest
from unittest.mock import patch

from tools import build_labjs_json as builder


class BuilderTests(unittest.TestCase):
    def test_import_does_not_read_assets_or_write_distribution(self):
        with patch.object(Path, 'read_text', side_effect=AssertionError('leitura durante importação')), \
             patch.object(Path, 'read_bytes', side_effect=AssertionError('leitura durante importação')), \
             patch.object(Path, 'write_text', side_effect=AssertionError('escrita durante importação')):
            module = runpy.run_path(str(builder.ROOT / 'tools' / 'build_labjs_json.py'), run_name='import_test')
        self.assertTrue(callable(module['build_data']))

    def test_generated_artifact_is_byte_identical(self):
        generated = json.dumps(builder.build_data(), ensure_ascii=False, indent=2).encode('utf-8')
        self.assertEqual(generated, builder.DIST_JSON.read_bytes())

    def test_stages_embed_their_sources_and_replace_asset_markers(self):
        components = builder.build_data()['components']
        for component_id, stage in [('12', 'stage1'), ('14', 'stage2'), ('8', 'stage3')]:
            with self.subTest(stage=stage):
                self.assertEqual(components[component_id]['messageHandlers'][0]['code'],
                                 (builder.ROOT / 'src' / 'stages' / f'{stage}.js').read_text(encoding='utf-8'))
                self.assertNotIn('__COMMON_THEME__', components[component_id]['content'])
                for marker in builder.INLINE_ASSETS:
                    self.assertNotIn(marker, components[component_id]['content'])


if __name__ == '__main__':
    unittest.main()
