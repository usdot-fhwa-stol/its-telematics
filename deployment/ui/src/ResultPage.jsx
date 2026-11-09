import { useState } from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { OutputToggle, StepList } from './RunOutput';
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

const ROLE_LABELS = { all: 'All services', ui: 'UI', processing: 'Processing', database: 'Database' };

function CloudInstances({ result }) {
  const { summary, instances = [], awsRegion } = result;
  if (result.target !== 'cloud') return null;
  if (summary.rollback === 'complete') {
    return <Alert severity="info">Provisioning failed, so deploy.py destroyed the AWS resources it had created.</Alert>;
  }
  if (summary.rollback === 'failed') {
    return (
      <Alert severity="error">
        <AlertTitle>AWS resources may still exist</AlertTitle>
        Provisioning failed and deploy.py could not destroy what it had created. AWS charges for anything left.
        {summary.rollbackCommand && <Mono>{summary.rollbackCommand}</Mono>}
      </Alert>
    );
  }
  if (instances.length === 0) return null;
  return (
    <Field label={`AWS instances${awsRegion ? ` · ${awsRegion}` : ''}`}>
      <Box
        component="table"
        sx={{
          borderCollapse: 'collapse', width: '100%', maxWidth: 640, fontSize: 14,
          '& th, & td': { textAlign: 'left', py: 0.75, pr: 3, borderBottom: 1, borderColor: 'divider' },
          '& th': { color: 'text.secondary', fontWeight: 600 },
          '& td.mono': { fontFamily: monoFont },
        }}
      >
        <thead><tr><th>Role</th><th>Public IP</th><th>Private IP</th></tr></thead>
        <tbody>
          {instances.map((instance) => (
            <tr key={instance.address}>
              <td>{ROLE_LABELS[instance.role] || instance.role}</td>
              <td className="mono">{instance.address}</td>
              <td className="mono">{instance.privateIp}</td>
            </tr>
          ))}
        </tbody>
      </Box>
      <Alert severity="warning" sx={{ mt: 1 }}>
        {result.ok ? 'These instances' : 'The instances were created and'} keep running, and AWS charges for them,
        until you stop or terminate them in the AWS console (EC2, Instances, names starting with telematics-).
      </Alert>
      {summary.sshCommand && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Connect to the first instance:</Typography>
          <Mono>{summary.sshCommand}</Mono>
        </>
      )}
    </Field>
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

export default function ResultPage({ result, onBack, onOpenServer }) {
  const [copied, setCopied] = useState(false);
  const { summary } = result;
  const diagnostics = summary.execution?.diagnostics;
  const uiUrl = result.ok ? summary.execution?.ui_url || summary.uiUrl : null;
  const services = (result.ok && summary.execution?.active_services) || [];
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

        {services.length > 0 && (
          <Field label="Active services">
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {services.map((service) => (
                <Box
                  key={service}
                  component="span"
                  sx={{
                    fontFamily: monoFont, fontSize: 13, px: 1.25, py: 0.625, borderRadius: '6px',
                    bgcolor: '#16281f', color: '#9fe3bf', border: '1px solid #25533a',
                  }}
                >
                  {service}
                </Box>
              ))}
            </Box>
          </Field>
        )}

        {uiUrl && (
          <Box
            sx={{
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2,
              bgcolor: '#12151c', border: 1, borderColor: 'divider', borderRadius: 1, px: 2, py: 1.5,
            }}
          >
            <Stack spacing={0.25} sx={{ flex: '1 1 240px', minWidth: 0 }}>
              <Typography variant="body2" color="text.secondary">Telematics UI</Typography>
              <Box component="span" sx={{ fontFamily: monoFont, fontSize: 15, color: '#9fb4ff', wordBreak: 'break-all' }}>{uiUrl}</Box>
            </Stack>
            <Button variant="contained" onClick={() => onOpenServer(uiUrl)} sx={{ flexShrink: 0 }}>Open in app</Button>
          </Box>
        )}

        <CloudInstances result={result} />

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

        <Field label="Command">
          <Mono>{result.command}</Mono>
        </Field>

        {summary.steps.length > 0 && (
          <Field label="Pipeline steps">
            <StepList steps={summary.steps} />
          </Field>
        )}

        <OutputToggle text={output} />

        <Stack direction="row" spacing={1.5}>
          <Button variant="contained" onClick={onBack}>Back to configure</Button>
          <Button variant="outlined" onClick={copyOutput}>{copied ? 'Copied' : 'Copy output'}</Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
