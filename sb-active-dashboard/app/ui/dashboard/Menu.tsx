import React, {useRef} from "react";
import "@arcgis/map-components/dist/components/arcgis-legend";
import "@arcgis/map-components/dist/components/arcgis-layer-list";
import { CalciteIcon } from "@esri/calcite-components-react";
import { ArcgisLayerList, ArcgisLegend } from "@arcgis/map-components-react";
import addCensusRenderPanel from "./CensusRenderer";

import { styled, useTheme, Theme, CSSObject } from '@mui/material/styles'
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';
import { CssBaseline, Box, Toolbar, List, Typography, Divider, IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import MuiDrawer from '@mui/material/Drawer'


const drawerWidth = 180;

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
}));



const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    variants: [
      {
        props: ({ open }) => open,
        style: {
          ...openedMixin(theme),
          '& .MuiDrawer-paper': openedMixin(theme),
        },
      },
      {
        props: ({ open }) => !open,
        style: {
          ...closedMixin(theme),
          '& .MuiDrawer-paper': closedMixin(theme),
        },
      },
    ],
  }),
);

export default function Menu(props) {
    const { open, handleDrawerClose, setShowLegend, showLegend, setShowLayerList, showLayerList } = props
    const theme = useTheme()
  
    return (

      <Drawer variant="permanent" open={open}>
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === 'rtl' ? <CalciteIcon icon="chevron-right" /> : <CalciteIcon icon="chevron-left" />}
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
            <ListItem  disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                onClick={() => {
                  setShowLegend(false)
                  setShowLayerList(!showLayerList)
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
                    mr: open ? 3 : 'auto'
                  }}
                >
                  <CalciteIcon icon="layers" />
                </ListItemIcon>
                <ListItemText
                  primary="Layers"
                  sx={{opacity: open ? 1: 0}}
                />
              </ListItemButton>
            </ListItem>
            <ListItem  disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                onClick={() => {
                  setShowLayerList(false)
                  setShowLegend(!showLegend)
                  
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
                      mr: open ? 3 : 'auto'
                    }}
                >
                  <CalciteIcon icon="legend" />
                </ListItemIcon>
                <ListItemText
                  primary="Legend"
                  sx={{opacity: open ? 1: 0}}
                />
              </ListItemButton>
            </ListItem>
            <ListItem  disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                onClick={() => {
                  setShowLayerList(false)
                  setShowLegend(false)
                  
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
                      mr: open ? 3 : 'auto'
                    }}
                >
                  <CalciteIcon icon="filter" />
                </ListItemIcon>
                <ListItemText
                  primary="Filters"
                  sx={{opacity: open ? 1: 0}}
                />
              </ListItemButton>
            </ListItem>
        </List>
        
      </Drawer>
      
    
  );
}
    // <CalciteShell contentBehind={true} >
    //     <CalciteActionBar slot="action-bar">
    //         <CalciteAction icon="layers" text="Layers" />
    //         <CalciteAction icon="legend" text="Layers" />

    //     </CalciteActionBar>
    //     <CalcitePanel heading="Layers">
    //         <div id="layer-list-container"></div>
    //         {/* <ArcgisLayerList  /> */}
    //     </CalcitePanel>
    //     <CalcitePanel heading="Legend" >
    //         <div id="legend-container"></div>
    //         {/* <ArcgisLegend  onArcgisReady={(event) => addVisualizationOptions(event.target)} /> */}
    //     </CalcitePanel>
                
    // </CalciteShell>
 