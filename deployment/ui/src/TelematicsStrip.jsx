import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { monoFont } from './theme';

// The server's pages are drawn by the main process directly below this strip.
// Must match STRIP_HEIGHT in electron/telematicsView.js.
export const STRIP_HEIGHT = 56;

export default function TelematicsStrip({ url, onBack }) {
  return (
    <Box
      component="header"
      sx={{
        height: STRIP_HEIGHT, boxSizing: 'border-box', px: 2, gap: 1.5,
        display: 'flex', alignItems: 'center',
        bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider',
      }}
    >
      <Chip label="Connected" color="success" size="small" variant="outlined" />
      <Typography
        sx={{ fontFamily: monoFont, fontSize: 14, flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        title={url}
      >
        {url}
      </Typography>
      <Button variant="outlined" size="small" onClick={onBack}>Back to servers</Button>
    </Box>
  );
}
