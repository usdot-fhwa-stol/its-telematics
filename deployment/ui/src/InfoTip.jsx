import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

// A small ⓘ button that shows `title` on hover, focus or tap.
export default function InfoTip({ title, label = 'More information', sx }) {
  return (
    <Tooltip title={title} arrow enterTouchDelay={0} leaveTouchDelay={8000} slotProps={{ tooltip: { sx: { fontSize: 13, lineHeight: 1.5, maxWidth: 340, p: 1.25 } } }}>
      <IconButton size="small" aria-label={label} sx={{ color: 'text.secondary', ...sx }}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm-1-5h2v2h-2v-2Zm0-8h2v6h-2V7Z" transform="rotate(180 12 12)" />
        </svg>
      </IconButton>
    </Tooltip>
  );
}
