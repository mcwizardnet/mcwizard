import { Box, Stack, Typography } from "@mui/material";

export default function Settings() {
  return (
    <Box sx={{ p: 2, maxWidth: 720, mx: "auto" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}>
        <Typography variant="h6">Settings</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        The app uses an environment variable named{" "}
        <code>CURSEFORGE_API_KEY</code> (in the main process) to access the
        CurseForge API.
      </Typography>
    </Box>
  );
}
