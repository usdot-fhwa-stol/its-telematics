import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { monoFont } from './theme';

const api = window.deployApi;

// Adds the AWS default profile to the shared credentials file, which setup.py
// reads for the cloud target. The keys never go to setup.py itself, whose
// --aws-access-key-id and --aws-secret-access-key would show them in ps.
export default function AwsCredentialsDialog({ open, file, onClose, onSaved }) {
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setAccessKeyId('');
    setSecretAccessKey('');
    setError(null);
    onClose();
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const outcome = await api.saveAwsProfile({ accessKeyId, secretAccessKey });
      if (outcome.error) {
        setError(outcome.error);
      } else {
        close();
        onSaved(outcome.status);
      }
    } catch (failure) {
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      aria-labelledby="aws-credentials-title"
      PaperProps={{ component: 'form', onSubmit: submit }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle id="aws-credentials-title">Add AWS credentials</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText>
            The app adds a [default] profile to <span style={{ fontFamily: monoFont }}>{file}</span>, readable
            only by you, as setup.py does with --aws-access-key-id. The keys are not passed to setup.py or saved
            anywhere else. Other AWS tools that use the default profile will use these keys too.
          </DialogContentText>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            id="aws-access-key-id"
            label="Access key ID"
            value={accessKeyId}
            onChange={(event) => setAccessKeyId(event.target.value)}
            autoFocus
            autoComplete="off"
            inputProps={{ maxLength: 128, spellCheck: false, style: { fontFamily: monoFont } }}
          />
          <TextField
            id="aws-secret-access-key"
            label="Secret access key"
            type="password"
            value={secretAccessKey}
            onChange={(event) => setSecretAccessKey(event.target.value)}
            autoComplete="new-password"
            inputProps={{ maxLength: 128, style: { fontFamily: monoFont } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={saving || !accessKeyId || !secretAccessKey}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
