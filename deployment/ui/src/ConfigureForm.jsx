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
import Typography from '@mui/material/Typography';
import AwsCredentialsDialog, { ACCESS_KEYS_TIP } from './AwsCredentialsDialog';
import InfoTip from './InfoTip';
import { OutputToggle, StepList } from './RunOutput';
import { monoFont } from './theme';

const api = window.deployApi;

const TARGET_HELP = {
  'on-premise': 'Deploys to this machine.',
  cloud: 'Creates AWS instances with Terraform, then deploys the stack to them.',
};

export const EMPTY_PARAMS = {
  target: '',
  keyPath: '',
  awsRegion: '',
};

const KEY_FILE_TIP = (
  <>
    Don&apos;t have a key? In the AWS console, open EC2, then Key Pairs, and choose Create key pair with the
    .pem format. Save the file it downloads; AWS lets you download it only once.
  </>
);

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

function KeyField({ id, label, value, helperText, tip, onBrowse, onClear, disabled }) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <TextField
        id={id} label={label} value={value} fullWidth
        placeholder="No file chosen" helperText={helperText}
        inputProps={{ readOnly: true, style: { fontFamily: monoFont } }}
      />
      <Button variant="outlined" onClick={onBrowse} disabled={disabled} sx={{ height: 56 }}>Browse</Button>
      {value && <Button onClick={onClear} disabled={disabled} sx={{ height: 56 }}>Clear</Button>}
      {tip && <InfoTip title={tip} label={`About the ${label}`} sx={{ mt: 1.75 }} />}
    </Stack>
  );
}

const PROFILE_KINDS = { keys: 'access keys', sso: 'SSO', role: 'role', process: 'credential process' };

// Whether deploy.py will find credentials in the default profile, which cloud
// runs always use. The status never includes a key. `onEdit(replace)` opens the
// access keys dialog: replace is true when the default profile already exists.
function AwsCredentialsStatus({ status, onEdit, disabled }) {
  if (!status) return <Typography variant="body2" color="text.secondary">Checking AWS credentials…</Typography>;
  const mono = (text) => <Box component="span" sx={{ fontFamily: monoFont }}>{text}</Box>;
  const file = mono(status.file);
  const editKeys = (label) => (
    <Button color="inherit" size="small" onClick={() => onEdit(true)} disabled={disabled}>{label}</Button>
  );
  if (status.ready && status.kind === 'sso') {
    return (
      <Alert severity="success">
        The default profile uses AWS SSO. deploy.py does not check the sign-in, so if your session has
        expired, run {mono('aws sso login')} before Launch.
      </Alert>
    );
  }
  if (status.ready && status.kind !== 'keys') {
    return (
      <Alert severity="success">
        The default profile gets credentials from a {PROFILE_KINDS[status.kind]} in {mono(status.configFile)}.
      </Alert>
    );
  }
  if (status.ready) {
    return (
      <Alert severity="success" action={editKeys('Edit keys')}>
        Your profile has access keys.
      </Alert>
    );
  }
  if (status.incomplete) {
    return (
      <Alert severity="warning" action={editKeys('Edit keys')}>
        Your profile is missing its access key ID or secret access key. Enter both with Edit keys.
      </Alert>
    );
  }
  return (
    <Alert
      severity="warning"
      action={<Button color="inherit" size="small" onClick={() => onEdit(false)} disabled={disabled}>Add credentials</Button>}
    >
      No access keys for the default profile.
    </Alert>
  );
}


// What --target localhost does to this machine, from
// deployment/config/ansible/playbooks/host_preparation.yml and deploy.py.
function LocalhostSteps() {
  return (
    <DialogContentText component="div">
      Running this deployment requires your password in order to prepare this machine and start the stack in Docker.
    </DialogContentText>
  );
}

// The pipeline steps deploy.py has reached while it runs, and the end of its output behind a toggle.
function RunProgress({ progress }) {
  const tail = progress.lines.slice(-12).map((line) => line.text).join('\n');
  return (
    <Stack spacing={1.5} sx={{ mx: 3.5, mb: 2 }}>
      {progress.steps.length > 0 && <StepList steps={progress.steps} active />}
      <OutputToggle text={tail} placeholder="Starting deploy.py…" />
    </Stack>
  );
}

const NO_SUDO = { needed: null, installs: [], password: '', error: null, checking: false };

export default function ConfigureForm({
  setup, params, onChange, remember, onRememberChange, running, progress, launchErrors, onLaunch,
}) {
  const { options, saved } = setup;
  const [preview, setPreview] = useState({ validationErrors: [] });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [awsStatus, setAwsStatus] = useState(null);
  // The access keys dialog: null when closed, { replace } when open.
  const [credentialsDialog, setCredentialsDialog] = useState(null);
  // The administrator password for a localhost run. It stays in this dialog
  // until Continue, then goes to the main process for that run only.
  const [sudo, setSudo] = useState(NO_SUDO);

  // On-premise deploys to this machine (deploy.py --target localhost).
  const isLocal = params.target === 'on-premise';
  // The cloud fields need deploy.py's cloud options.
  const isCloud = params.target === 'cloud' && Boolean(options.CLOUD);

  useEffect(() => {
    let current = true;
    if (isCloud) api.awsProfileStatus().then((status) => { if (current) setAwsStatus(status); });
    return () => { current = false; };
  }, [isCloud]);

  // awsStatus: saving credentials can clear a validation error.
  useEffect(() => {
    let current = true;
    api.previewCommand(params).then((value) => { if (current) setPreview(value); });
    return () => { current = false; };
  }, [params, awsStatus]);

  const set = (field) => (value) => onChange({ ...params, [field]: value });
  const pickTarget = (target) => {
    const next = { ...EMPTY_PARAMS, ...params, ...(saved[target] || {}), target };
    if (target === 'cloud' && options.CLOUD) {
      next.awsRegion = next.awsRegion || options.CLOUD.defaultRegion;
    }
    onChange(next);
  };
  const browseKey = async () => {
    const keyPath = await api.pickKeyFile();
    if (keyPath) onChange({ ...params, keyPath });
  };

  const ready = Boolean(preview.command);

  // Localhost runs always use sudo; cloud runs only to install Terraform or Ansible here.
  const asksSudo = isLocal || isCloud;
  const requestLaunch = () => {
    if (asksSudo) {
      setSudo(NO_SUDO);
      api.sudoStatus(isLocal ? 'localhost' : 'cloud').then(({ passwordNeeded, installs }) => (
        setSudo((current) => ({ ...current, needed: passwordNeeded, installs }))
      ));
      setConfirmOpen(true);
    } else {
      onLaunch();
    }
  };
  const closeConfirm = () => {
    setConfirmOpen(false);
    setSudo(NO_SUDO);
  };
  const confirmLaunch = async () => {
    if (!asksSudo || !sudo.needed) {
      closeConfirm();
      onLaunch();
      return;
    }
    setSudo((current) => ({ ...current, checking: true, error: null }));
    const { error } = await api.checkSudoPassword(sudo.password);
    if (error) {
      setSudo((current) => ({ ...current, checking: false, error }));
      return;
    }
    const sudoPassword = sudo.password;
    closeConfirm();
    onLaunch({ sudoPassword });
  };

  return (
    <Paper variant="outlined" component="form" onSubmit={(event) => event.preventDefault()}>
      <Section title="Deployment" note="Required">
        {options.notice && <Alert severity="info">{options.notice}</Alert>}
        <OptionSelect
          id="target" label="Deployment Mode" value={params.target} options={options.TARGETS}
          onChange={pickTarget} disabled={running}
          helperText={TARGET_HELP[params.target] || 'Where the stack runs.'}
        />
      </Section>

      {isCloud && (
        <>
          <Divider />
          <Section title="AWS" note="Required">
            <TextField
              id="aws-region" label="Region" required value={params.awsRegion}
              onChange={(event) => set('awsRegion')(event.target.value)} disabled={running}
              placeholder={options.CLOUD.defaultRegion}
              inputProps={{ spellCheck: false, style: { fontFamily: monoFont } }}
            />
            <KeyField
              id="cloud-key-path" label="SSH key for the instances" value={params.keyPath}
              helperText="A public key, or an unencrypted private key such as a .pem." tip={KEY_FILE_TIP}
              onBrowse={browseKey} onClear={() => set('keyPath')('')} disabled={running}
            />
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <AwsCredentialsStatus
                  status={awsStatus} onEdit={(replace) => setCredentialsDialog({ replace })} disabled={running}
                />
              </Box>
              <InfoTip title={ACCESS_KEYS_TIP} label="About AWS access keys" sx={{ mt: 1 }} />
            </Stack>
            <AwsCredentialsDialog
              open={Boolean(credentialsDialog)} replace={Boolean(credentialsDialog?.replace)}
              file={awsStatus?.file} onClose={() => setCredentialsDialog(null)} onSaved={setAwsStatus}
            />
          </Section>
        </>
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
          Runs on this computer, from the repository the app is in.
        </Typography>
      </Section>

      {running && (
        <>
          <Alert severity="info" sx={{ mx: 3.5, mb: 2 }}>
            {isCloud
              ? 'Terraform is creating the AWS instances, then Ansible and Docker Compose start the stack. This can take '
                + 'several minutes or longer. The result appears when the run ends. Closing the app stops the run, and AWS '
                + 'resources it already created stay.'
              : 'Running deploy.py. Pulling images can take several minutes. The result appears when the run ends; '
                + 'closing the app stops the run.'}
          </Alert>
          <RunProgress progress={progress} />
        </>
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
          label="Remember this configuration"
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

      <Dialog open={confirmOpen} onClose={closeConfirm} aria-labelledby="confirm-title">
        <DialogTitle id="confirm-title">{isCloud ? 'Create AWS resources?' : 'Prepare this machine?'}</DialogTitle>
        <DialogContent>
          {isCloud ? (
            <DialogContentText component="div">
              With --target cloud, deploy.py runs Terraform in {params.awsRegion} with the{' '}
              default AWS profile. It creates:
              <ul>
                <li>a VPC with a public subnet, internet gateway, security groups and a CloudWatch log group</li>
                <li>an IAM role for the instances, and a key pair from the SSH key you chose</li>
                <li>
                  EC2 instances with 100 GiB gp3 volumes.{' '}
                  {options.CLOUD.TOPOLOGIES.find((option) => option.value === options.CLOUD.deployTopology)?.details}
                </li>
              </ul>
              AWS charges for these until they are removed, which this app does not do: stop or terminate the
              instances in the AWS console when you are done. If provisioning fails, deploy.py destroys what it
              created; if a later step fails, the instances keep running.
              {sudo.installs.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  First it installs {sudo.installs.join(' and ')} on this machine with apt
                  {sudo.needed ? ', which needs your administrator password.' : '.'}
                </Box>
              )}
            </DialogContentText>
          ) : (
            <LocalhostSteps />
          )}
          {sudo.needed === null && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Checking sudo…</Typography>
          )}
          {sudo.needed && (
            <TextField
              id="sudo-password" label="Administrator password" type="password" autoComplete="current-password"
              fullWidth autoFocus sx={{ mt: 2.5 }} value={sudo.password}
              disabled={sudo.checking} error={Boolean(sudo.error)}
              onChange={(event) => setSudo({ ...sudo, password: event.target.value, error: null })}
              onKeyDown={(event) => { if (event.key === 'Enter' && sudo.password) confirmLaunch(); }}
              helperText={sudo.error
                || (isCloud ? `To install ${sudo.installs.join(' and ')}` : 'To run the deployment')}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm}>Cancel</Button>
          <Button
            variant="contained" color="warning" onClick={confirmLaunch}
            disabled={asksSudo && (sudo.needed === null || sudo.checking || (sudo.needed && !sudo.password))}
          >
            {sudo.checking ? 'Checking…' : 'Continue'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
