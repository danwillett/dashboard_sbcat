import React from "react";
import IconButton, { IconButtonProps } from "@mui/material/IconButton";
import { styled } from "@mui/material/styles";

interface ToggleButtonProps extends IconButtonProps {
  open: boolean;
  menuWidth: number;
  children: React.ReactNode;
}

const StyledIconButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== "open" && prop !== "menuWidth",
})<ToggleButtonProps>(({ theme, open, menuWidth }) => ({
  position: "absolute",
  top: "50%",
  left: open ? `${menuWidth - 21}px` : "5px",
  transform: "translateY(-50%)",
  zIndex: 4000,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: theme.shadows[3],
  transition: "left 0.5s ease-in-out",
  "&:hover": {
    backgroundColor: theme.palette.background.paper,
    opacity: 1,
    boxShadow: theme.shadows[4],
  },
}));

const ToggleButton: React.FC<ToggleButtonProps> = ({
  open,
  menuWidth,
  children,
  ...rest
}) => {
  return (
    <StyledIconButton open={open} menuWidth={menuWidth} {...rest}>
      {children}
    </StyledIconButton>
  );
};

export default ToggleButton;
