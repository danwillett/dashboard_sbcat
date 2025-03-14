import React, { useState } from "react";
import { Box, IconButton } from "@mui/material";
import { styled, Theme } from "@mui/material/styles";
import { CalciteIcon } from "@esri/calcite-components-react";

const drawerWidth = 180;

const DrawerFooter = styled('div')(({ theme }) => ({
  display: 'flex',
  width: '100%',
  alignItems: 'center',
  justifyContent: 'end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const DrawerBox = styled(Box, { shouldForwardProp: (prop) => prop !== "open" })<
  { open?: boolean; color?: keyof Theme["palette"] }
>(({ theme, open, color = "primary" }) => ({
  width: open ? drawerWidth : `calc(${theme.spacing(7)} + 1px)`,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.standard,
  }),
  overflowX: "hidden",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "space-between",

  // Colors
  borderRight: `1px solid ${theme.palette[color].contrastText}`,
  backgroundColor: theme.palette[color].main,
  color: theme.palette[color].contrastText,
}));

interface MenuPanelProps {
  children: (drawerOpen: boolean) => React.ReactNode;
}

const MenuPanel: React.FC<MenuPanelProps> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(true);

  const handleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <DrawerBox open={drawerOpen} color="white">
      {/* Dynamic List Items will be passed as children */}

      {children(drawerOpen)}

      {/* Drawer Toggle Button */}
      <DrawerFooter>
        <IconButton onClick={handleDrawer} color={drawerOpen ? "secondary" : "primary"}>
          {drawerOpen ? <CalciteIcon icon="chevron-left" /> : <CalciteIcon icon="chevron-right" />}
        </IconButton>
      </DrawerFooter>
    </DrawerBox>
  );
};

export default MenuPanel;
