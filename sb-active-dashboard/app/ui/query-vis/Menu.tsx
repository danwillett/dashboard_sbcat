import React, {useRef, useState} from "react";
import "@arcgis/map-components/dist/components/arcgis-legend";
import "@arcgis/map-components/dist/components/arcgis-layer-list";
import { CalciteIcon } from "@esri/calcite-components-react";

import { styled, useTheme, Theme, CSSObject } from '@mui/material/styles'

import { Box, List, Typography, Divider, IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";


const drawerWidth = 180;

interface MenuItemProps {
  open: boolean,
  showWidget: boolean,
  setShowWidget: any,
  iconName: string,
  label: string
}

function MenuItem(props: MenuItemProps) {

  const { open, showWidget, setShowWidget, iconName, label } = props

  return (
      <ListItem  disablePadding sx={{ display: 'block' }}>
        <ListItemButton
          selected={showWidget}
          onClick={() => {
            // setShowLegend(false)
            setShowWidget(!showWidget)
          }}
          sx={
            {
              minHeight: 48,
              px: 2.5,
              justifyContent: open ? 'initial' : 'center'
            }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              justifyContent: 'center',
              mr: open ? 3 : 0
            }}
          >
            <CalciteIcon icon={iconName} />
          </ListItemIcon>
          {open && (
              <ListItemText
              primary={label}
              sx={{opacity: open ? 1: 0}}
            />
          ) 
          }
          
        </ListItemButton>
      </ListItem>
  )
  
} 

const DrawerFooter = styled('div')(({ theme }) => ({
  display: 'flex',
  width: '100%',
  alignItems: 'center',
  justifyContent: 'end',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
}));

const DrawerBox = styled(Box, { shouldForwardProp: (prop) => prop !== "open" && prop !== "color"})<
  { open?: boolean; color?: keyof Theme["palette"]  }
>(({ theme, open, color = "primary"}) => ({
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

  // color
  borderRight: `1px solid ${theme.palette[color].contrastText}`,
  backgroundColor: theme.palette[color].main, // Use theme-based background color
  color: theme.palette[color].contrastText,
}));

export default function Menu(props) {

    const [drawerOpen, setDrawerOpen] = useState(true)
    const handleDrawer = () => {
      setDrawerOpen(!drawerOpen)
    }
    const { setShowLegend, showLegend, setShowLayerList, showLayerList, setShowFilter, showFilter } = props
  
    return (

      <DrawerBox open={drawerOpen} color="white">

        <List>
            <MenuItem open={drawerOpen} showWidget={showLayerList} setShowWidget={setShowLayerList} iconName="layers" label="Layers" />
            <MenuItem open={drawerOpen} showWidget={showFilter} setShowWidget={setShowFilter} iconName="filter" label="Filters" />
            <MenuItem open={drawerOpen} showWidget={showLegend} setShowWidget={setShowLegend} iconName="legend" label="Legend" />
            
        </List>
        
        <DrawerFooter>
          <IconButton 
              onClick={handleDrawer}
              color = {drawerOpen ? "secondary" : "primary"}>
              {drawerOpen ? <CalciteIcon icon="chevron-left" /> : <CalciteIcon icon="chevron-right"  />}
          </IconButton>
        </DrawerFooter>

      </DrawerBox>

      
      
    
  );
}

 