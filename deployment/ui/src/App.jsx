import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ConfigureForm, { EMPTY_PARAMS } from './ConfigureForm';
import ResultPage from './ResultPage';
import ServerScreen from './ServerScreen';
import SignInDialog from './SignInDialog';
import StartScreen from './StartScreen';
import TelematicsStrip from './TelematicsStrip';

const api = window.deployApi;

const HEADINGS = {
  start: ['Telematics Deploy', 'Deploy a new Telematics instance, or connect to one that is already running.'],
  configure: ['Configure deployment', 'Pick the target, environment and use case, then launch setup.py.'],
  result: ['Result', 'Output of the last run of setup.py.'],
  servers: ['Connect to a server', 'Enter a server address or pick a saved server. The app checks that it responds first.'],
};

export default function App() {
  // start | deploy | servers | telematics
  const [screen, setScreen] = useState('start');

  // Deploy path. Kept here so the form survives a trip to the start screen.
  const [setup, setSetup] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [params, setParams] = useState(EMPTY_PARAMS);
  const [remember, setRemember] = useState(true);
  const [running, setRunning] = useState(false);
  const [launchErrors, setLaunchErrors] = useState([]);
  const [result, setResult] = useState(null);

  // Connect path.
  const [servers, setServers] = useState([]);
  const [connecting, setConnecting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [connectedUrl, setConnectedUrl] = useState(null);
  const [signInPrompt, setSignInPrompt] = useState(null);

  useEffect(() => {
    api.getOptions().then(setSetup, (error) => setLoadError(error.message));
    api.listServers().then(setServers);
    const stopLoadFailed = api.onTelematicsLoadFailed((message) => {
      setConnectedUrl(null);
      setServerError(message);
      setScreen('servers');
    });
    const stopSignIn = api.onTelematicsSignIn(setSignInPrompt);
    return () => {
      stopLoadFailed();
      stopSignIn();
    };
  }, []);

  const launch = async () => {
    setLaunchErrors([]);
    setRunning(true);
    try {
      const outcome = await api.launch(params, { remember });
      if (outcome.validationErrors) setLaunchErrors(outcome.validationErrors);
      else setResult(outcome);
    } catch (error) {
      setLaunchErrors([error.message]);
    } finally {
      setRunning(false);
    }
  };

  const connect = async (address, connectOptions) => {
    setServerError(null);
    setConnecting(true);
    try {
      const outcome = await api.connect(address, connectOptions);
      if (outcome.error) {
        setServerError(outcome.error);
      } else {
        setServers(outcome.servers);
        setConnectedUrl(outcome.url);
        setScreen('telematics');
      }
    } catch (error) {
      setServerError(error.message);
    } finally {
      setConnecting(false);
    }
  };

  const forget = async (url) => setServers(await api.forgetServer(url));

  const backToServers = async () => {
    await api.closeTelematicsView();
    setConnectedUrl(null);
    setScreen('servers');
  };

  if (screen === 'telematics') {
    return (
      <>
        <TelematicsStrip url={connectedUrl} onBack={backToServers} />
        <SignInDialog prompt={signInPrompt} onAnswer={api.answerSignIn} />
      </>
    );
  }

  let content;
  let heading = HEADINGS[screen];
  if (screen === 'start') {
    content = <StartScreen onChoose={(choice) => { setServerError(null); setScreen(choice); }} />;
  } else if (screen === 'servers') {
    content = (
      <ServerScreen servers={servers} connecting={connecting} error={serverError} onConnect={connect} onForget={forget} />
    );
  } else if (loadError) {
    content = <Alert severity="error">Could not load the deployment options: {loadError}</Alert>;
  } else if (!setup) {
    content = <CircularProgress aria-label="Loading" />;
  } else if (result) {
    heading = HEADINGS.result;
    content = <ResultPage result={result} onBack={() => setResult(null)} />;
  } else {
    heading = HEADINGS.configure;
    content = (
      <ConfigureForm
        setup={setup}
        params={params}
        onChange={setParams}
        remember={remember}
        onRememberChange={setRemember}
        running={running}
        launchErrors={launchErrors}
        onLaunch={launch}
      />
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', px: { xs: 2, md: 6 }, py: 4 }}>
      <Stack spacing={3} sx={{ maxWidth: 1040, mx: 'auto' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            aria-hidden
            sx={{
              width: 44, height: 44, borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0,
            }}
          >
            TD
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" component="h1" fontWeight={700}>{heading[0]}</Typography>
            <Typography variant="body2" color="text.secondary">{heading[1]}</Typography>
          </Box>
          {screen !== 'start' && (
            <Button
              variant="outlined"
              onClick={() => setScreen('start')}
              disabled={running || connecting}
              title={running ? 'Available when the run ends' : undefined}
            >
              Start screen
            </Button>
          )}
        </Stack>
        {content}
      </Stack>
    </Box>
  );
}
