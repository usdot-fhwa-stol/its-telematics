import { useId, useState } from 'react';
import { keyframes } from '@emotion/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import { monoFont } from './theme';

const STEP_MARKS = { OK: '✓', FAILED: '✗', running: '…' };
const STEP_LABELS = { OK: 'done', FAILED: 'failed', running: 'did not finish' };

// Dots 2 and 3 appear a third and two thirds of the way through each cycle: ".", "..", "...", then
// back to ".". step-end holds each keyframe's value until the next one instead of fading.
const DOT_APPEARS = [
  null,
  keyframes({ '0%': { opacity: 0 }, '33.333%': { opacity: 1 } }),
  keyframes({ '0%': { opacity: 0 }, '66.667%': { opacity: 1 } }),
];
const dotSx = (index) => ({
  animation: DOT_APPEARS[index] ? `${DOT_APPEARS[index]} 1.5s step-end infinite` : 'none',
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
});

// Three dots that count up while the step runs, so a long step does not look frozen.
function RunningDots() {
  return (
    <Box component="span" aria-hidden sx={{ display: 'inline-block' }}>
      {[0, 1, 2].map((index) => <Box key={index} component="span" sx={dotSx(index)}>.</Box>)}
    </Box>
  );
}

// The pipeline steps deploy.py has reached, each with a mark for its status. `active` is true while
// the run is going: its running step is in progress and gets animated dots. After the run, a
// running step is one that did not finish.
export function StepList({ steps, active = false }) {
  return (
    <Box component="ol" sx={{ m: 0, pl: 3, lineHeight: 1.9 }} aria-label="Pipeline steps">
      {steps.map((step) => {
        const inProgress = active && step.status === 'running';
        const label = inProgress ? 'in progress' : STEP_LABELS[step.status];
        return (
          <li key={step.name}>
            {step.name}{' '}
            <Box
              component="span"
              title={label}
              aria-label={label}
              sx={{ color: { OK: 'success.main', FAILED: 'error.main' }[step.status] || 'text.secondary', fontWeight: 700 }}
            >
              {inProgress ? <RunningDots /> : STEP_MARKS[step.status]}
            </Box>
          </li>
        );
      })}
    </Box>
  );
}

function Chevron({ open }) {
  return (
    <Box
      component="svg"
      aria-hidden
      viewBox="0 0 16 16"
      sx={{ width: 16, height: 16, transition: 'transform 150ms', transform: open ? 'rotate(90deg)' : 'none' }}
    >
      <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Box>
  );
}

// deploy.py's raw output behind a toggle, closed by default so it stays out of the way
// unless someone asks for it.
export function OutputToggle({ text, placeholder = '(no output)', label = 'terminal output' }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <Stack spacing={1} alignItems="flex-start">
      <Button
        variant="text"
        color="inherit"
        size="small"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        startIcon={<Chevron open={open} />}
        sx={{ color: 'text.secondary', px: 1, ml: -1 }}
      >
        {open ? `Hide ${label}` : `Show ${label}`}
      </Button>
      <Collapse in={open} id={panelId} sx={{ alignSelf: 'stretch' }} unmountOnExit>
        <Box
          component="pre"
          aria-label="Terminal output"
          sx={{
            m: 0, p: 2, borderRadius: 1, bgcolor: '#0a0c10', border: 1, borderColor: 'divider',
            fontFamily: monoFont, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            color: 'text.secondary', maxHeight: 420, overflow: 'auto',
          }}
        >
          {text || placeholder}
        </Box>
      </Collapse>
    </Stack>
  );
}
