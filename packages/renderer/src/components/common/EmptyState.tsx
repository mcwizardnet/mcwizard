import { Stack, Typography } from "@mui/material";

interface EmptyStateProps {
  title: string;
}

export default function EmptyState({ title }: EmptyStateProps) {
  return (
    <Stack
      spacing={2}
      alignItems="center"
      justifyContent="center"
      sx={{ py: 6, textAlign: "center" }}>
      <Typography variant="body1" color="text.secondary">
        {title}
      </Typography>
    </Stack>
  );
}
