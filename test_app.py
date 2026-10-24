import asyncio
import subprocess
import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
import chain
import main


class AppTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)

    def test_template_substitution_is_single_pass(self):
        self.assertEqual(main.fill_template('{{ a }} {{b}}', {'a': '{{b}}', 'b': 'value'}), '{{b}} value')

    def test_temperature_and_real_usage(self):
        model = MagicMock()
        invoke = model.bind.return_value.ainvoke = AsyncMock()
        invoke.return_value.content = 'Hello'
        invoke.return_value.usage_metadata = {'total_tokens': 42}
        with patch.object(chain, 'get_llm', return_value=model):
            result = asyncio.run(chain.run_prompt('test', 0.8))
        model.bind.assert_called_once_with(temperature=0.8)
        self.assertEqual(result['token_usage'], 42)
        self.assertFalse(result['token_usage_estimated'])

    def test_bad_requests_and_duplicate_ids(self):
        self.assertEqual(self.client.post('/api/batch-run', json={'prompt_template': 'hello', 'test_cases': [{}]}).status_code, 422)
        self.assertEqual(self.client.post('/api/run', json={'prompt_template': 'hello', 'input_case': {}, 'temperature': 99}).status_code, 422)
        self.assertEqual(self.client.post('/api/batch-run', json={'prompt_template': 'hello', 'test_cases': [{'id': '1'}, {'id': '1'}]}).status_code, 422)

    def test_malformed_evaluator_uses_fallback(self):
        for raw in ('[1, null, "bad"]', '{"candidate_id":"1","score":999}', 'not json'):
            with patch.object(main, 'evaluate_outputs', new=AsyncMock(return_value=raw)):
                response = self.client.post('/api/evaluate', json={'task_description': 'test', 'reference': 'answer', 'candidates': [{'id': '1', 'output': ''}]})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()['scores'][0]['score'], 0)

    def test_browser_script(self):
        script = main.render('index.html').split('<script>')[1].split('</script>')[0]
        result = subprocess.run(['node', '--check'], input=script, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    unittest.main()
