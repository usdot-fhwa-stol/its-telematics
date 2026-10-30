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
import AwsCredentialsDialog from './AwsCredentialsDialog';
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
  awsRegion: '',
  awsProfile: 'default',
  topology: '',
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

function KeyField({ id, label, value, helperText, onBrowse, onClear, disabled }) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <TextField
        id={id} label={label} value={value} fullWidth
        placeholder="No file chosen" helperText={helperText}
        inputProps={{ readOnly: true, style: { fontFamily: monoFont } }}
      />
      <Button variant="outlined" onClick={onBrowse} disabled={disabled} sx={{ height: 56 }}>Browse</Button>
      {value && <Button onClick={onClear} disabled={disabled} sx={{ height: 56 }}>Clear</Button>}
    </Stack>
  );
}

const PROFILE_KINDS = { keys: 'access keys', sso: 'SSO', role: 'role', process: 'credential process' };

// The profile choices: every profile in the AWS files when setup.py takes
// --aws-profile, otherwise only the default profile.
function profileOptions(cloud, status) {
  if (!cloud.namedProfiles || !status?.profiles) return cloud.PROFILES;
  const listed = status.profiles.map(({ name, kind }) => ({
    value: name, label: `${name} (${PROFILE_KINDS[kind] || 'no credentials'})`,
  }));
  return listed.some((option) => option.value === 'default')
    ? listed : [{ value: 'default', label: 'default (not set up)' }, ...listed];
}

// Whether setup.py will find credentials for the chosen profile. The status
// never includes a key.
function AwsCredentialsStatus({ status, onAdd, disabled }) {
  if (!status) return <Typography variant="body2" color="text.secondary">Checking AWS credentials…</Typography>;
  const mono = (text) => <Box component="span" sx={{ fontFamily: monoFont }}>{text}</Box>;
  const file = mono(status.file);
  if (status.ready && status.kind === 'sso') {
    return (
      <Alert severity="success">
        The {status.profile} profile uses AWS SSO. setup.py does not check the sign-in, so if your session has
        expired, run {mono(`aws sso login --profile ${status.profile}`)} before Launch.
      </Alert>
    );
  }
  if (status.ready && status.kind !== 'keys') {
    return (
      <Alert severity="success">
        The {status.profile} profile gets credentials from a {PROFILE_KINDS[status.kind]} in {mono(status.configFile)}.
      </Alert>
    );
  }
  if (status.ready) {
    return (
      <Alert severity="success">
        The {status.profile} profile has access keys. setup.py and Terraform use them.
      </Alert>
    );
  }
  if (status.incomplete && status.namedProfiles) {
    return (
      <Alert severity="warning">
        The {status.profile} profile has no credentials setup.py can use: it needs both access keys, SSO, a role
        or a credential process. Fix it with aws configure, or choose another profile.
      </Alert>
    );
  }
  if (status.incomplete) {
    return (
      <Alert severity="warning">
        The [default] profile in {file} is missing aws_access_key_id or aws_secret_access_key. Fix it there,
        or with aws configure.
      </Alert>
    );
  }
  return (
    <Alert
      severity="warning"
      action={<Button color="inherit" size="small" onClick={onAdd} disabled={disabled}>Add credentials</Button>}
    >
      {status.namedProfiles
        ? 'The default profile is not set up. Add access keys for it, set it up with aws configure sso, or choose another profile.'
        : <>No access keys for the default profile in {file}. setup.py needs them for the cloud target.</>}
      {status.inConfigFile && ` The default profile in ${status.configFile}, such as one set up for AWS SSO, is not enough: setup.py only reads access keys from the credentials file.`}
    </Alert>
  );
}


function LocalhostSteps({ hostPreparation, prunesVolumes }) {
  if (hostPreparation === 'local.setup.sh') {
    return (
      <DialogContentText component="div">
        With --target localhost, setup.py runs local.setup.sh with sudo. That script:
        <ul>
          <li>adds the cav-telematics.com host names to /etc/hosts</li>
          <li>deletes and recreates /opt/grafana, /opt/apache2 and /opt/influxdb2, discarding any data in them</li>
          <li>creates /opt/telematics/upload and changes permissions under /opt/telematics</li>
        </ul>
      </DialogContentText>
    );
  }
  if (hostPreparation === 'ansible') {
    return (
      <DialogContentText component="div">
        With --target localhost, setup.py prepares this machine with an Ansible playbook run with sudo, then
        starts the stack in Docker. The playbook is skipped if everything below is already in place. It:
        <ul>
          <li>adds the local.cav-telematics.com host names to /etc/hosts, pointing to 127.0.0.1</li>
          <li>
            installs docker.io, the Docker Compose plugin, ca-certificates, curl, gnupg and apt-transport-https,
            and starts the Docker service and enables it at boot
          </li>
          <li>adds you to the docker group, so you can run Docker without sudo</li>
          <li>
            creates /opt/telematics, /opt/grafana, /opt/apache2 and /opt/influxdb2 and their subfolders, owned by
            you and writable by every user on this machine, and an empty /opt/apache2/grafana_htpasswd. Existing
            files are kept.
          </li>
        </ul>
        Then setup.py stops the stack it deployed before
        {prunesVolumes ? ' and deletes its Docker volumes, so the databases start empty, ' : ' '}
        and starts it again on the latest images. A stack started another way, for example with docker compose
        in telematic_system/, is not stopped, and its ports will conflict.
      </DialogContentText>
    );
  }
  return (
    <DialogContentText>
      With --target localhost, setup.py prepares this machine with sudo. This checkout has neither
      local.setup.sh nor the host preparation playbook, so review deployment/scripts before you continue.
    </DialogContentText>
  );
}

export default function ConfigureForm({
  setup, params, onChange, remember, onRememberChange, running, launchErrors, onLaunch,
}) {
  const { options, saved, hostPreparation } = setup;
  const [preview, setPreview] = useState({ validationErrors: [] });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [awsStatus, setAwsStatus] = useState(null);
  const [credentialsOpen, setCredentialsOpen] = useState(false);

  const isOnPrem = params.target === 'on-premise';
  const isLocal = isOnPrem && params.deployTo === 'local';
  const isRemote = isOnPrem && params.deployTo === 'remote';
  // The cloud fields need setup.py's cloud options.
  const isCloud = params.target === 'cloud' && Boolean(options.CLOUD);

  useEffect(() => {
    let current = true;
    if (isCloud) api.awsProfileStatus(params.awsProfile).then((status) => { if (current) setAwsStatus(status); });
    return () => { current = false; };
  }, [isCloud, params.awsProfile]);

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
      next.topology = next.topology || options.CLOUD.defaultTopology;
    }
    onChange(next);
  };
  const browseKey = async () => {
    const keyPath = await api.pickKeyFile();
    if (keyPath) onChange({ ...params, keyPath });
  };

  const secrets = params.secretOverrides || {};
  const overrideCount = Object.values(secrets).filter(Boolean).length;
  const ready = Boolean(preview.command);

  const requestLaunch = () => {
    if (isLocal || isCloud) setConfirmOpen(true);
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
            helperText="Remote targets ask for connection details below."
          />
          <OptionSelect
            id="environment" label="Environment" value={params.environment} options={options.ENVIRONMENTS}
            onChange={set('environment')} disabled={running}
            helperText="Picks the image organization and tag."
          />
        </Box>
        <OptionSelect
          id="use-case" label="Use case" value={params.useCase} options={options.USE_CASES}
          onChange={set('useCase')} disabled={running}
          helperText="Decides which services come up (full or partial)."
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
                <KeyField
                  id="key-path" label="SSH private key (optional)" value={params.keyPath} helperText="--key-path"
                  onBrowse={browseKey} onClear={() => set('keyPath')('')} disabled={running}
                />
              </Box>
            )}
          </Section>
        </>
      )}

      {isCloud && (
        <>
          <Divider />
          <Section title="AWS" note="Required">
            <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <TextField
                id="aws-region" label="Region" required value={params.awsRegion}
                onChange={(event) => set('awsRegion')(event.target.value)} disabled={running}
                placeholder={options.CLOUD.defaultRegion} helperText="--aws-region"
                inputProps={{ spellCheck: false, style: { fontFamily: monoFont } }}
              />
              <OptionSelect
                id="aws-profile" label="AWS profile" value={params.awsProfile || 'default'}
                options={profileOptions(options.CLOUD, awsStatus)} onChange={set('awsProfile')} disabled={running}
                helperText={options.CLOUD.namedProfiles
                  ? `--aws-profile. From ${awsStatus?.file || '~/.aws/credentials'} and ${awsStatus?.configFile || '~/.aws/config'}.`
                  : 'This setup.py has no --aws-profile option and always uses the default profile.'}
              />
            </Box>
            <OptionSelect
              id="topology" label="Topology" value={params.topology} options={options.CLOUD.TOPOLOGIES}
              onChange={set('topology')} disabled={running}
              helperText="--centralized or --distributed. Decides how many EC2 instances are created, and their cost."
            />
            <KeyField
              id="cloud-key-path" label="SSH key for the instances" value={params.keyPath}
              helperText="--key-path. A public key, or an unencrypted private key such as a .pem. Terraform registers it as the instances' key pair."
              onBrowse={browseKey} onClear={() => set('keyPath')('')} disabled={running}
            />
            <AwsCredentialsStatus status={awsStatus} onAdd={() => setCredentialsOpen(true)} disabled={running} />
            <AwsCredentialsDialog
              open={credentialsOpen} file={awsStatus?.file} onClose={() => setCredentialsOpen(false)}
              onSaved={setAwsStatus}
            />
          </Section>
        </>
      )}

      <Divider />
      {options.SECRET_KEYS.length > 0 ? (
        <Section title="Secret overrides" note="Optional">
          <Typography variant="body2" color="text.secondary">
            Overwrites secret files. An empty field uses defaults.
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
          Runs on this computer, from the repository the app is in.
          {overrideCount > 0 && ` ${overrideCount === 1 ? '1 secret override goes' : `${overrideCount} secret overrides go`} to setup.py on standard input.`}
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
        <DialogTitle id="confirm-title">{isCloud ? 'Create AWS resources?' : 'Prepare this machine?'}</DialogTitle>
        <DialogContent>
          {isCloud ? (
            <DialogContentText component="div">
              With --target cloud, setup.py runs Terraform in {params.awsRegion} with the{' '}
              {params.awsProfile || 'default'} AWS profile. It creates:
              <ul>
                <li>a VPC with a public subnet, internet gateway, security groups and a CloudWatch log group</li>
                <li>an IAM role for the instances, and a key pair from the SSH key you chose</li>
                <li>
                  EC2 instances with 100 GiB gp3 volumes.{' '}
                  {options.CLOUD.TOPOLOGIES.find((option) => option.value === params.topology)?.label}
                </li>
              </ul>
              AWS charges for these until they are destroyed. If provisioning fails, setup.py destroys what it
              created; if a later step fails, the instances keep running.
            </DialogContentText>
          ) : (
            <LocalhostSteps hostPreparation={hostPreparation} prunesVolumes={options.prunesVolumes} />
          )}
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
