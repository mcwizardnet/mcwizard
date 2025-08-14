import {
  Box,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { Link } from "react-router";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

export interface SidebarSection {
  id: string;
  label: string;
}

interface SidebarProps {
  title: string;
  sections: SidebarSection[];
  activeSectionId?: string;
  onSelectSection?: (sectionId: string) => void;
}

const Sidebar = ({
  title,
  sections,
  activeSectionId,
  onSelectSection,
}: SidebarProps) => {
  return (
    <Box
      sx={{
        width: 260,
        borderRight: 1,
        borderColor: "divider",
        height: "calc(100vh - 54px)",
        position: "sticky",
        top: 54,
        overflowY: "auto",
      }}>
      <Box sx={{ display: "flex", alignItems: "center", pr: 2, py: 1 }}>
        <IconButton sx={{ ml: 2 }} component={Link} to="/mods">
          <ChevronLeftIcon />
        </IconButton>
        <Typography
          variant="subtitle2"
          sx={{
            textTransform: "uppercase",
            letterSpacing: 1,
            display: "block",
            flexGrow: 1,
            textAlign: "center",
          }}>
          {title}
        </Typography>
      </Box>
      <Divider />
      <List dense disablePadding>
        {sections.map((section) => (
          <ListItemButton
            key={section.id}
            selected={section.id === activeSectionId}
            onClick={() => onSelectSection?.(section.id)}>
            <ListItemText primary={section.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};

export default Sidebar;
