import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { monoFont } from './theme';

const api = window.deployApi;

export const EMPTY_PARAMS = {
  target: '',
  environment: '',
  useCase: '',
  deployTo: 'local',
  remoteIo: '',
  remoteUser: '',
  keyPath: '',
  // Held in memory only: never saved and never on the command line.
  secretOverrides: {},
};

function Section({ title, note, children }) {
  return (
    <Stack spacing={2.5} sx={{ p: 3.5 }} component="section">
      <Stack direction="row" spacing={1.5} alignItems="baseline">
        <Typography variant="subtitle2" component="h2" sx={{ letterSpacing: '.06em', textTransform: 'uppercase' }}>
          {title}
        </Typography>
        {note && <Typography variant="body2" color="text.secondary">{note}</Typography>}
      </Stack>
      {children}
    </Stack>
  );
}

function OptionSelect({ id, label, value, options, onChange, helperText, disabled }) {
  return (
    <TextField
      id={id}
      select
      required
      fullWidth
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      helperText={helperText}
      disabled={disabled}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
      ))}
    </TextField>
  );
}

export default function ConfigureForm({
  setup, params, onChange, remember, onRememberChange, running, launchErrors, onLaunch,
}) {
  const { options, saved, repoRoot } = setup;
  const [preview, setPreview] = useState({ validationErrors: [] });
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let current = true;
    api.previewCommand(params).then((value) => { if (current) setPreview(value); });
    return () => { current = false; };
  }, [params]);

  const set = (field) => (value) => onChange({ ...params, [field]: value });
  const pickTarget = (target) => onChange({ ...EMPTY_PARAMS, ...params, ...(saved[target] || {}), target });
  const browseKey = async () => {
    const keyPath = await api.pickKeyFile();
    if (keyPath) onChange({ ...params, keyPath });
  };

  const secrets = params.secretOverrides || {};
  const overrideCount = Object.values(secrets).filter(Boolean).length;
  const isOnPrem = params.target === 'on-premise';
  const isLocal = isOnPrem && params.deployTo === 'local';
  const isRemote = isOnPrem && params.deployTo === 'remote';
  const ready = Boolean(preview.command);

  const requestLaunch = () => {
    if (isLocal) setConfirmOpen(true);
    else onLaunch();
  };

  return (
    <Paper variant="outlined" component="form" onSubmit={(event) => event.preventDefault()}>
      <Section title="Deployment" note="Required">
        {options.notice && <Alert severity="info">{options.notice}</Alert>}
        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <OptionSelect
            id="target" label="Target" value={params.target} options={options.TARGETS}
            onChange={pickTarget} disabled={running}
            helperText="From deployment/targets/. Remote targets ask for connection details below."
          />
          <OptionSelect
            id="environment" label="Environment" value={params.environment} options={options.ENVIRONMENTS}
            onChange={set('environment')} disabled={running}
            helperText="From deployment/environment/. Picks the image organization and tag."
          />
        </Box>
        <OptionSelect
          id="use-case" label="Use case" value={params.useCase} options={options.USE_CASES}
          onChange={set('useCase')} disabled={running}
          helperText="From deployment/use_cases/. Decides which services come up."
        />
      </Section>

      {isOnPrem && (
        <>
          <Divider />
          <Section title="On-premise connection" note="Where the stack runs">
            <ToggleButtonGroup
              exclusive
              color="primary"
              value={params.deployTo}
              onChange={(_event, value) => value && set('deployTo')(value)}
              aria-label="Deploy to"
              disabled={running}
              sx={{ maxWidth: 520 }}
            >
              {options.DEPLOY_TO.map((option) => (
                <ToggleButton key={option.value} value={option.value} sx={{ flex: 1 }}>{option.label}</ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="body2" color="text.secondary">
              {isLocal
                ? 'Runs setup.py with --target localhost. It prepares this machine, so it asks for your administrator password.'
                : 'Runs setup.py with --target remote. It generates the configuration for that host; deploying to it is not built yet.'}
            </Typography>
            {isRemote && (
              <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1.4fr' } }}>
                <TextField
                  id="remote-io" label="Host address" required value={params.remoteIo}
                  onChange={(event) => set('remoteIo')(event.target.value)} disabled={running}
                  placeholder="192.168.1.50" helperText="--remote-io"
                  inputProps={{ style: { fontFamily: monoFont } }}
                />
                <TextField
                  id="remote-user" label="SSH user" required value={params.remoteUser}
                  onChange={(event) => set('remoteUser')(event.target.value)} disabled={running}
                  placeholder="ubuntu" helperText="--remote-user"
                  inputProps={{ style: { fontFamily: monoFont } }}
                />
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <TextField
                    id="key-path" label="SSH private key (optional)" value={params.keyPath} fullWidth
                    placeholder="No file chosen" helperText="--key-path"
                    inputProps={{ readOnly: true, style: { fontFamily: monoFont } }}
                  />
                  <Button variant="outlined" onClick={browseKey} disabled={running} sx={{ height: 56 }}>Browse</Button>
                  {params.keyPath && (
                    <Button onClick={() => set('keyPath')('')} disabled={running} sx={{ height: 56 }}>Clear</Button>
                  )}
                </Stack>
              </Box>
            )}
          </Section>
        </>
      )}

      {params.target === 'cloud' && (
        <>
          <Divider />
          <Section title="AWS">
            <Alert severity="info">
              The cloud pipeline is not built yet. setup.py accepts --target cloud and generates the cloud
              configuration only. AWS profile, region and key pair fields will be added with the pipeline.
            </Alert>
          </Section>
        </>
      )}

      <Divider />
      {options.SECRET_KEYS.length > 0 ? (
        <Section title="Secret overrides" note="Optional">
          <Typography variant="body2" color="text.secondary">
            Every run overwrites telematic_system/.env and the secret files in telematic_system/secrets/. An
            empty field uses its .example file. Values you enter go to setup.py on standard input, never on the
            command line, and the app does not save them.
          </Typography>
          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            {options.SECRET_KEYS.map((key) => (
              <TextField
                key={key}
                id={`secret-${key}`}
                label={key}
                type="password"
                autoComplete="new-password"
                value={secrets[key] || ''}
                onChange={(event) => onChange({ ...params, secretOverrides: { ...secrets, [key]: event.target.value } })}
                disabled={running}
                placeholder={`${key}.txt.example`}
                inputProps={{ style: { fontFamily: monoFont } }}
              />
            ))}
          </Box>
        </Section>
      ) : (
        <Section title="Secret overrides" note="Not available">
          <Typography variant="body2" color="text.secondary">
            Every run overwrites telematic_system/.env and the secret files in telematic_system/secrets/, using
            the .example files. This setup.py cannot read overrides from standard input, and passing them as
            command-line arguments would let any user on this machine read them.
          </Typography>
        </Section>
      )}

      <Divider />
      <Section title="Command">
        <Box
          component="pre"
          aria-label="Command that Launch runs"
          sx={{
            m: 0, p: 2, borderRadius: 1, bgcolor: '#0a0c10', border: 1, borderColor: 'divider',
            fontFamily: monoFont, fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            color: ready ? 'text.primary' : 'text.secondary',
          }}
        >
          {ready ? preview.command : 'Fill in the required fields to see the command.'}
        </Box>
        <Typography variant="body2" color="text.secondary">
          Runs from {repoRoot}
          {overrideCount > 0 && `. ${overrideCount === 1 ? '1 secret override goes' : `${overrideCount} secret overrides go`} to setup.py on standard input.`}
        </Typography>
      </Section>

      {running && (
        <Alert severity="info" sx={{ mx: 3.5, mb: 2 }}>
          Running setup.py. {isLocal && 'If it asks for your administrator password, the dialog comes from Ubuntu and the app never sees the password. '}
          The result appears when the run ends. Closing the app stops the run.
        </Alert>
      )}
      {launchErrors.length > 0 && (
        <Alert severity="error" sx={{ mx: 3.5, mb: 2 }}>{launchErrors.join(' ')}</Alert>
      )}

      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ px: 3.5, py: 2.5, borderTop: 1, borderColor: 'divider', bgcolor: '#141820', borderRadius: '0 0 8px 8px' }}
      >
        <FormControlLabel
          control={<Checkbox checked={remember} onChange={(event) => onRememberChange(event.target.checked)} />}
          label={<>Remember for this target <Typography component="span" variant="body2" color="text.secondary">(no secrets are saved)</Typography></>}
        />
        <Box sx={{ flexGrow: 1, textAlign: 'right' }}>
          {!ready && preview.validationErrors?.length > 0 && (
            <Typography variant="body2" color="warning.main">{preview.validationErrors.join(' ')}</Typography>
          )}
        </Box>
        <Button onClick={() => onChange(EMPTY_PARAMS)} disabled={running}>Clear</Button>
        <Button variant="contained" onClick={requestLaunch} disabled={!ready || running}>
          {running ? 'Running…' : 'Launch'}
        </Button>
      </Stack>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} aria-labelledby="confirm-title">
        <DialogTitle id="confirm-title">Prepare this machine?</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            With --target localhost, setup.py runs local.setup.sh with sudo. That script:
            <ul>
              <li>adds the cav-telematics.com host names to /etc/hosts</li>
              <li>deletes and recreates /opt/grafana, /opt/apache2 and /opt/influxdb2, discarding any data in them</li>
              <li>creates /opt/telematics/upload and changes permissions under /opt/telematics</li>
            </ul>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={() => { setConfirmOpen(false); onLaunch(); }}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
