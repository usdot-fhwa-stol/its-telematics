import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

const CHOICES = [
  {
    key: 'deploy',
    title: 'Deploy a new instance',
    description: 'Pick a target, environment and use case, then run setup.py to prepare the host and generate its configuration.',
  },
  {
    key: 'servers',
    title: 'Connect to an existing server',
    description: 'Open the login page of a Telematics server that is already running.',
  },
];

export default function StartScreen({ onChoose }) {
  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
      {CHOICES.map((choice) => (
        <Card key={choice.key} variant="outlined">
          <CardActionArea onClick={() => onChoose(choice.key)} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 4, minHeight: 180 }}>
              <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>{choice.title}</Typography>
              <Typography variant="body1" color="text.secondary">{choice.description}</Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  );
}
