import React, { useState } from "react";
import { Box, IconButton } from "@mui/material";
import { styled, Theme } from "@mui/material/styles";
import { CalciteIcon } from "@esri/calcite-components-react";
import { appTheme } from "../../theme";



interface MenuPanelProps {
  children: React.ReactNode;
  drawerOpen: boolean
  drawerWidth: number

}

const DrawerBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== "open" && prop !== "drawerWidth",
})<{ open?: boolean, drawerWidth: number }>(({ theme, open, drawerWidth }) => ({
  width: open ? drawerWidth : `calc(${theme.spacing(7)} + 1px)`,
  visibility: open ? "visible" : "hidden",
  overflowX: "hidden",
  height: "100%",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "space-between",
  borderRight: `1px solid ${theme.palette.white.contrastText}`,
  backgroundColor: theme.palette.white.main,
  color: theme.palette.white.contrastText,
  transition: 'width 0.5s ease-in-out',
  zIndex: 1200
}));

const MenuPanel: React.FC<MenuPanelProps> = ({ drawerOpen, drawerWidth, children }) => {
  

  return (
    <DrawerBox open={drawerOpen} drawerWidth={drawerWidth}>
      {/* Toggle Button */}
      {/* <ToggleButton onClick={handleDrawer}>
        <CalciteIcon icon={drawerOpen ? "chevron-left" : "chevron-right"} />
      </ToggleButton> */}

      {/* Menu content */}
     
      <Box sx={{ flexGrow: 1, width: "100%", overflow: "auto", mt: 2 }}>
        {children}
      </Box>
      
      
    </DrawerBox>
  );
};

export default MenuPanel;