import { useEffect, useState } from 'react';
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

// Answers an HTTP authentication challenge from the server's pages, as a
// browser's sign-in prompt does. Apache asks this way before it shows Grafana.
export default function SignInDialog({ prompt, onAnswer }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // A new prompt starts empty; a retry keeps the user name.
  useEffect(() => {
    if (!prompt) return;
    if (!prompt.retry) setUsername('');
    setPassword('');
  }, [prompt?.id]);

  const submit = (event) => {
    event.preventDefault();
    onAnswer(prompt.id, { username, password });
  };

  return (
    <Dialog
      open={Boolean(prompt)}
      onClose={() => onAnswer(prompt.id, null)}
      aria-labelledby="sign-in-title"
      PaperProps={{ component: 'form', onSubmit: submit }}
      fullWidth
      maxWidth="xs"
    >
      {prompt && (
        <>
          <DialogTitle id="sign-in-title">Sign in</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <DialogContentText>
                {prompt.isProxy ? 'The proxy ' : ''}
                <span style={{ fontFamily: monoFont }}>{prompt.site}</span>
                {' '}asks for a user name and password
                {prompt.realm ? <> for “{prompt.realm}”</> : null}.
                {prompt.isProxy ? null : ' On a Telematics server, use your Telematics user name and password.'}
              </DialogContentText>
              {prompt.retry && <Alert severity="error">That user name or password was not accepted.</Alert>}
              <TextField
                id="sign-in-username"
                label="User name"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoFocus={!prompt.retry}
                autoComplete="username"
                inputProps={{ maxLength: 1024 }}
              />
              <TextField
                id="sign-in-password"
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoFocus={prompt.retry}
                autoComplete="current-password"
                inputProps={{ maxLength: 1024 }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => onAnswer(prompt.id, null)}>Cancel</Button>
            <Button type="submit" variant="contained">Sign in</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
