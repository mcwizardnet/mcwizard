import { useEffect, useState } from "react";
import { Snackbar, Alert, Button, LinearProgress, Box } from "@mui/material";

type UpdateState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "available"; info?: any }
  | { kind: "downloading"; percent?: number }
  | { kind: "downloaded" }
  | { kind: "none" }
  | { kind: "error"; error: string };

export default function UpdateSnackbar() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<UpdateState>({ kind: "idle" });

  useEffect(() => {
    const offStatus = window.api.onUpdateStatus((data: any) => {
      if (data?.status === "checking") setState({ kind: "checking" });
      else if (data?.status === "available") {
        setState({ kind: "available", info: data.info });
        setOpen(true);
      } else if (data?.status === "none") {
        setState({ kind: "none" });
      } else if (data?.status === "downloaded") {
        setState({ kind: "downloaded" });
        setOpen(true);
      } else if (data?.status === "error") {
        setState({ kind: "error", error: data.error || "Update failed" });
        setOpen(true);
      }
    });
    const offProgress = window.api.onUpdateProgress((p: any) => {
      setState({ kind: "downloading", percent: p?.percent });
      setOpen(true);
    });
    return () => {
      offStatus?.();
      offProgress?.();
    };
  }, []);

  const startDownload = async () => {
    setState({ kind: "downloading" });
    await window.api.downloadUpdate();
  };
  const restartNow = async () => {
    await window.api.quitAndInstall();
  };

  const renderContent = () => {
    if (state.kind === "available") {
      return (
        <Alert
          severity="info"
          action={<Button color="inherit" size="small" onClick={startDownload}>Update</Button>}
        >
          Update available
        </Alert>
      );
    }
    if (state.kind === "downloading") {
      return (
        <Box sx={{ px: 2, py: 1, minWidth: 320 }}>
          <Box sx={{ mb: 1, fontSize: 14 }}>Downloading update…</Box>
          <LinearProgress variant={state.percent ? "determinate" : "indeterminate"} value={state.percent} />
        </Box>
      );
    }
    if (state.kind === "downloaded") {
      return (
        <Alert
          severity="success"
          action={<Button color="inherit" size="small" onClick={restartNow}>Restart</Button>}
        >
          Update ready
        </Alert>
      );
    }
    if (state.kind === "error") {
      return <Alert severity="error">{state.error}</Alert>;
    }
    return null;
  };

  return (
    <Snackbar
      open={open}
      onClose={() => setOpen(false)}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      autoHideDuration={state.kind === "error" ? 6000 : null as any}
    >
      <Box>{renderContent()}</Box>
    </Snackbar>
  );
}


