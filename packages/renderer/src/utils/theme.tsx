import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import type { ReactNode } from "react";

// Add Shiki code block styles

const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: true,
    dark: true,
  },
  palette: {
    mode: "dark",
    primary: {
      main: "#4caf50",
    },
  },
  components: {
    MuiTab: {
      styleOverrides: {
        root: {
          py: 0,
          px: 0,
          minHeight: 54,
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 54,
          "@media (min-width:0px)": {
            minHeight: 54,
          },
          "@media (min-width:600px)": {
            minHeight: 54,
          },
        },
      },
    },
  },
});

interface AppThemeProps {
  children: ReactNode;
}

export default function AppTheme({ children }: AppThemeProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
