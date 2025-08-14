import type { ReactNode } from "react";
import {
  Box,
  Button,
  Chip,
  InputAdornment,
  Stack,
  TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

interface SearchAndTagsProps {
  placeholder: string;
  query: string;
  onQueryChange: (value: string) => void;
  tags: string[];
  selectedTag: string | null;
  onSelectTag: (value: string | null) => void;
  searchIcon?: ReactNode;
  rightAction?: ReactNode;
}

export default function SearchAndTags({
  placeholder,
  query,
  onQueryChange,
  tags,
  selectedTag,
  onSelectTag,
  searchIcon,
  rightAction,
}: SearchAndTagsProps) {
  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          fullWidth
          size="small"
          placeholder={placeholder}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          slotProps={{
            input: {
              endAdornment: searchIcon ?? (
                <InputAdornment position="end">/</InputAdornment>
              ),
            },
          }}
        />
        <Box sx={{ whiteSpace: "nowrap" }}>
          <Button variant="contained" color="primary" sx={{ py: 0.9 }}>
            <AddIcon sx={{ mr: 0.5 }} /> ADD
          </Button>
        </Box>
      </Stack>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Chip
          label="All"
          color={!selectedTag ? "primary" : "default"}
          variant={!selectedTag ? "filled" : "outlined"}
          onClick={() => onSelectTag(null)}
        />
        {!!tags.length &&
          tags.map((t) => (
            <Chip
              key={t}
              label={t}
              color={selectedTag === t ? "primary" : "default"}
              variant={selectedTag === t ? "filled" : "outlined"}
              onClick={() => onSelectTag(t)}
            />
          ))}
      </Stack>
    </Stack>
  );
}
