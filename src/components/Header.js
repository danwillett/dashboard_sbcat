import React, {useEffect, useRef, useState} from "react";
import {Typography, AppBar, Toolbar, IconButton, Grid} from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu'
import {createTheme, ThemeProvider} from '@mui/material/styles'

const theme = createTheme({
  palette: {
    purple: {
      main: "#000F1A",
      contrastText: '#AF8ACB'
    }
  }
})

export default function Header() {

    return (
     <ThemeProvider theme={theme}>
      <AppBar position="static" color="purple">
        <Toolbar variant="regular">
          <Grid container direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" color="inherit" component="div" sx={{ mr: 1, ml: 1 }}>
              Santa Barbara County ATP Dashboard
            </Typography>

            <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 1, ml: 1 }}>
              <MenuIcon />
            </IconButton>
          </Grid>
        </Toolbar>
    </AppBar>
    </ThemeProvider>

        
    )

}