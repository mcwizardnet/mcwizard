import { Box } from "@mui/material";
import { Outlet } from "react-router";
import Appbar from "@/components/appbar/Appbar";
import UpdateSnackbar from "@/components/common/UpdateSnackbar";

export default function DefaultLayout() {
  return (
    <Box component="main">
      <Appbar />
      <Box sx={{ mt: "54px" }}>
        <Outlet />
      </Box>
      <UpdateSnackbar />
    </Box>
  );
}
