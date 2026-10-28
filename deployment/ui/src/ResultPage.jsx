import { useState } from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { monoFont } from './theme';

function Field({ label, children }) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="subtitle2" component="h3">{label}</Typography>
      {children}
    </Stack>
  );
}

function Mono({ children, color }) {
  return (
    <Box
      component="pre"
      sx={{
        m: 0, p: 2, borderRadius: 1, bgcolor: '#0a0c10', border: 1, borderColor: 'divider',
        fontFamily: monoFont, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color,
      }}
    >
      {children}
    </Box>
  );
}

function headline(result) {
  const { summary } = result;
  if (result.spawnError) return result.spawnError;
  if (result.ok) return 'Configuration generated';
  if (summary.failedStep) return `Failed at step: ${summary.failedStep}`;
  if (result.signal) return `setup.py was stopped (${result.signal})`;
  return `setup.py exited with code ${result.exitCode}`;
}

function nextStep(result) {
  if (result.target !== 'localhost') {
    return 'setup.py generates configuration only for this target. Deploying to remote and cloud hosts is not built yet.';
  }
  return 'The stack is not started yet. From telematic_system/, run docker compose up -d. COMPOSE_PROFILES in the generated .env selects the services for this use case.';
}

export default function ResultPage({ result, onBack }) {
  const [copied, setCopied] = useState(false);
  const { summary } = result;
  const seconds = Math.round((Date.parse(result.finishedAt) - Date.parse(result.startedAt)) / 1000);
  const output = result.lines.map((line) => line.text).join('\n');

  const copyOutput = async () => {
    await navigator.clipboard.writeText(`$ ${result.command}\n${output}\nExit code: ${result.exitCode}`);
    setCopied(true);
  };

  return (
    <Paper variant="outlined" sx={{ p: 3.5 }}>
      <Stack spacing={3}>
        <Alert severity={result.ok ? 'success' : 'error'} variant="outlined">
          <AlertTitle sx={{ fontWeight: 700 }}>{headline(result)}</AlertTitle>
          {result.exitCode !== null && `Exit code ${result.exitCode} · `}{seconds} s
          {summary.hint && <Box sx={{ mt: 1 }}>{summary.hint}</Box>}
        </Alert>

        {summary.errors.length > 0 && (
          <Field label="Errors">
            <Mono color="error.light">{summary.errors.join('\n')}</Mono>
          </Field>
        )}

        <Field label="Command">
          <Mono>{result.command}</Mono>
        </Field>

        {(summary.checks.length > 0 || summary.configuredSecrets.length > 0 || summary.generatedEnv) && (
          <Field label="What setup.py reported">
            <Box component="ul" sx={{ m: 0, pl: 2.5, lineHeight: 1.9 }}>
              {summary.checks.map((check) => (
                <li key={check.name}>{check.name}: <strong>{check.status}</strong></li>
              ))}
              {summary.configuredSecrets.map((secret) => (
                <li key={secret.key}>Configured <code>{secret.key}</code> from {secret.source}</li>
              ))}
              {summary.generatedEnv && <li>Generated <code>{summary.generatedEnv}</code></li>}
            </Box>
          </Field>
        )}

        {result.ok && (
          <Field label="Next step">
            <Typography variant="body2" color="text.secondary">{nextStep(result)}</Typography>
          </Field>
        )}

        <Field label="Output">
          <Mono color="text.secondary">{output || '(no output)'}</Mono>
        </Field>

        <Stack direction="row" spacing={1.5}>
          <Button variant="contained" onClick={onBack}>Back to configure</Button>
          <Button variant="outlined" onClick={copyOutput}>{copied ? 'Copied' : 'Copy output'}</Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
