import React from "react";
import { CalciteIcon } from "@esri/calcite-components-react";
import { ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";


interface MenuItemProps {
    open: boolean,
    showWidget: boolean,
    setShowWidget: any,
    iconName: string,
    label: string
  }
  
export default function MenuItem(props: MenuItemProps) {

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