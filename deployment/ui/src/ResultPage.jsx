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
  const failedTask = summary.execution?.diagnostics?.failed_task_id;
  if (result.spawnError) return result.spawnError;
  if (result.ok) return 'Deployment finished';
  if (failedTask) return `Failed at step: ${failedTask}`;
  if (summary.failedStep) return `Failed at step: ${summary.failedStep}`;
  if (result.signal) return `deploy.py was stopped (${result.signal})`;
  return `deploy.py exited with code ${result.exitCode}`;
}

const STEP_STATUS = { OK: 'done', FAILED: 'failed', running: 'did not finish' };

export default function ResultPage({ result, onBack, onOpenServer }) {
  const [copied, setCopied] = useState(false);
  const { summary } = result;
  const diagnostics = summary.execution?.diagnostics;
  const uiUrl = result.ok ? summary.execution?.ui_url || summary.uiUrl : null;
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

        {uiUrl && (
          <Field label="Web UI">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box component="code" sx={{ fontFamily: monoFont }}>{uiUrl}</Box>
              <Button variant="contained" onClick={() => onOpenServer(uiUrl)}>Open in app</Button>
            </Stack>
            {summary.execution?.active_services?.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                Running: {summary.execution.active_services.join(', ')}
              </Typography>
            )}
          </Field>
        )}

        {summary.errors.length > 0 && (
          <Field label="Errors">
            <Mono color="error.light">{summary.errors.join('\n')}</Mono>
          </Field>
        )}

        {diagnostics && (
          <>
            <Field label={`Why ${diagnostics.failed_task_id} failed`}>
              <Mono color="error.light">{diagnostics.error_stderr}</Mono>
            </Field>
            {diagnostics.remediation_hints?.length > 0 && (
              <Field label="What to check">
                <Box component="ul" sx={{ m: 0, pl: 2.5, lineHeight: 1.9 }}>
                  {diagnostics.remediation_hints.map((hint) => <li key={hint}>{hint}</li>)}
                </Box>
              </Field>
            )}
            {diagnostics.container_logs?.log_payload && (
              <Field label="Container logs">
                <Mono color="text.secondary">{diagnostics.container_logs.log_payload}</Mono>
              </Field>
            )}
          </>
        )}

        {summary.steps.length > 0 && (
          <Field label="Pipeline steps">
            <Box component="ol" sx={{ m: 0, pl: 3, lineHeight: 1.9 }}>
              {summary.steps.map((step) => (
                <li key={step.name}>
                  {step.name}:{' '}
                  <Box component="strong" sx={{ color: step.status === 'FAILED' ? 'error.main' : 'inherit' }}>
                    {STEP_STATUS[step.status]}
                  </Box>
                </li>
              ))}
            </Box>
          </Field>
        )}

        <Field label="Command">
          <Mono>{result.command}</Mono>
        </Field>

        {(summary.checks.length > 0 || summary.configuredSecrets.length > 0 || summary.generatedEnv) && (
          <Field label="What deploy.py reported">
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
