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

const MenuPanel: React.FC<MenuPanelProps> = ({ drawerOpen, drawerWidth, children }) => {

  const collapsedWidth = 0;
  const DrawerBox = styled(Box, {
      shouldForwardProp: (prop) => prop !== "open",
    })<{ open?: boolean }>(({ theme, open }) => ({
      // width: open ? drawerWidth : '1px',
      overflowX: "hidden",
      height: "100%",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      borderRight: `1px solid ${theme.palette.white.contrastText}`,
      backgroundColor: theme.palette.white.main,
      color: theme.palette.white.contrastText,
      transition: 'width 0.5s ease-in-out',
      zIndex: 1200
  }));

  return (
    <DrawerBox open={drawerOpen}>
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