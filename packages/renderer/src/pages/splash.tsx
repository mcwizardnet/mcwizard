import { useEffect, useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";

const Splash = () => {
  const [version, setVersion] = useState<string>("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let mounted = true;
    window.api
      .getVersion()
      .then((v) => {
        if (mounted) setVersion(v);
      })
      .catch(() => {
        if (mounted) setVersion("");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const onCheckForUpdates = async () => {
    setChecking(true);
    try {
      await window.api.checkForUpdates();
    } finally {
      setChecking(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "calc(100vh - 96px)",
      }}>
      <Stack spacing={2} alignItems="center">
        <Box
          component="img"
          src="/icon.png"
          alt="logo"
          sx={{
            width: 144,
            height: 144,
            filter: "drop-shadow(0 0 10px rgba(174, 255, 162, 0.2))",
          }}
        />
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h5" color="text.primary" sx={{ mt: 1 }}>
            MC Wizard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            v{version || "—"}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};
export default Splash;
