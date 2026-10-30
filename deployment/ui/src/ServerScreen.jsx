import { Fragment, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { monoFont } from './theme';

function lastUsed(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `Last used ${date.toLocaleString()}`;
}

export default function ServerScreen({ servers, connecting, error, onConnect, onForget }) {
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [remember, setRemember] = useState(true);

  const submit = (event) => {
    event.preventDefault();
    onConnect(address, { remember, name });
  };

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" component="form" onSubmit={submit} sx={{ p: 3.5 }}>
        <Stack spacing={2.5}>
          <Typography variant="subtitle2" component="h2" sx={{ letterSpacing: '.06em', textTransform: 'uppercase' }}>
            Server
          </Typography>
          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
            <TextField
              id="server-address" label="Server address" required autoFocus value={address}
              onChange={(event) => setAddress(event.target.value)} disabled={connecting}
              placeholder="http://10.0.0.5:8888"
              helperText="The address of the Telematics web UI. http:// is added if you leave it out."
              inputProps={{ style: { fontFamily: monoFont }, spellCheck: false }}
            />
            <TextField
              id="server-name" label="Name (optional)" value={name}
              onChange={(event) => setName(event.target.value)} disabled={connecting || !remember}
              placeholder="Lab NUC" helperText="Shown in the saved servers list."
            />
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <FormControlLabel
              control={<Checkbox checked={remember} onChange={(event) => setRemember(event.target.checked)} />}
              label={<>Remember this server <Typography component="span" variant="body2" color="text.secondary">(name and address only, never your login)</Typography></>}
            />
            <Box sx={{ flexGrow: 1 }} />
            <Button type="submit" variant="contained" disabled={connecting || !address.trim()}>
              {connecting ? 'Checking…' : 'Connect'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3.5 }}>
        <Typography variant="subtitle2" component="h2" sx={{ letterSpacing: '.06em', textTransform: 'uppercase', mb: 1 }}>
          Saved servers
        </Typography>
        {servers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No saved servers yet. Tick &quot;Remember this server&quot; when you connect.
          </Typography>
        ) : (
          <List disablePadding>
            {servers.map((server, index) => (
              <Fragment key={server.url}>
                {index > 0 && <Divider component="li" />}
                <ListItem
                  disableGutters
                  secondaryAction={(
                    <Stack direction="row" spacing={1}>
                      <Button onClick={() => onForget(server.url)} disabled={connecting} aria-label={`Forget ${server.name}`}>
                        Forget
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => onConnect(server.url, { remember: false })}
                        disabled={connecting}
                        aria-label={`Connect to ${server.name}`}
                      >
                        Connect
                      </Button>
                    </Stack>
                  )}
                  sx={{ pr: 24 }}
                >
                  <ListItemText
                    primary={server.name}
                    secondary={(
                      <>
                        <Box component="span" sx={{ fontFamily: monoFont }}>{server.url}</Box>
                        {' · '}{lastUsed(server.lastUsedUtc)}
                      </>
                    )}
                  />
                </ListItem>
              </Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Stack>
  );
}
