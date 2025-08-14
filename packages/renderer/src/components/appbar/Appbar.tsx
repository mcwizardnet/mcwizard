import {
  AppBar,
  Box,
  Tabs,
  Tab,
  Toolbar,
  ButtonBase,
  IconButton,
} from "@mui/material";
import DNSIcon from "@mui/icons-material/Dns";
import WorldIcon from "@mui/icons-material/Public";
import ExtensionIcon from "@mui/icons-material/Extension";
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";
import { Link, useLocation } from "react-router";

const Appbar = () => {
  const location = useLocation();
  const activeValue = () => {
    if (location.pathname.startsWith("/servers")) {
      return "/servers";
    }
    if (location.pathname.startsWith("/mods")) {
      return "/mods";
    }
    if (location.pathname.startsWith("/worlds")) {
      return "/worlds";
    }
    return false;
  };

  return (
    <AppBar position="fixed" sx={{ px: 0, py: 0 }}>
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
        }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            gap: 1,
          }}>
          {/* ICON (LEFT) */}
          <Box>
            <ButtonBase
              sx={{ borderRadius: "50% 50%" }}
              component={Link}
              to="/">
              <img src={"/icon.png"} alt="icon" height={36} width={36} />
            </ButtonBase>
          </Box>
          {/* TABS (CENTER) */}
          <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
            <Tabs value={activeValue()} centered>
              <Tab
                label="worlds"
                iconPosition="start"
                component={Link}
                to="/worlds"
                value="/worlds"
                icon={<WorldIcon />}
              />
              <Tab
                label="servers"
                iconPosition="start"
                component={Link}
                to="/servers"
                value="/servers"
                icon={<DNSIcon />}
              />
              <Tab
                label="mods"
                iconPosition="start"
                component={Link}
                to="/mods"
                value="/mods"
                icon={<ExtensionIcon />}
              />
            </Tabs>
          </Box>
          {/* RIGHT CONTROLS (SEARCH + SETTINGS) */}
          <Box sx={{ ml: 1, display: "flex", alignItems: "center", gap: 1 }}>
            {/* <IconButton aria-label="search" component={Link} to="/settings">
              <SearchIcon />
            </IconButton> */}
            <IconButton aria-label="settings" component={Link} to="/settings">
              <SettingsIcon />
            </IconButton>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Appbar;
