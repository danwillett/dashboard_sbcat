import { useState } from "react";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CloseIcon from "@mui/icons-material/Close";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";

interface EquityDatasetDescriptionHelpProps {
  title: string;
  description: string;
}

export default function EquityDatasetDescriptionHelp({
  title,
  description,
}: EquityDatasetDescriptionHelpProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton
        type="button"
        size="small"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={`About ${title}`}
        title="View dataset description"
        sx={{ color: "#6b7280", p: 0.25, flexShrink: 0 }}
      >
        <HelpOutlineIcon sx={{ fontSize: 18 }} />
      </IconButton>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="equity-dataset-description-title"
      >
        <DialogTitle
          id="equity-dataset-description-title"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            pr: 1,
          }}
        >
          <span className="text-base font-semibold text-gray-900">{title}</span>
          <IconButton
            aria-label="Close description"
            onClick={() => setOpen(false)}
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <p className="text-sm leading-relaxed text-gray-700">{description}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
