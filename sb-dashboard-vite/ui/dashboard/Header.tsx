import React from "react";

import { Toolbar, Box, Typography, Button, AppBar } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function Header(props: any) {
  const { apps } = props;
  const theme = useTheme();
  return (
    <AppBar
      position="sticky"
      style={{ backgroundColor: theme.palette.navy.main, width: "100vw" }}
    >
      <Toolbar sx={{ height: "70px" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            width: "100vw",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" noWrap component="div">
            ACTIVE SB
          </Typography>

          <Box
            sx={{
              width: "50%",
              flexShrink: 1,
              textAlign: "end",
              display: "flex",
              gap: 2,
              flexDirection: "row",
              justifyContent: "end",
              alignItems: "center",
            }}
          >
            {apps?.map((appInfo: any, index: any) => (
              <Button
                key={index}
                href={appInfo["link"]}
                // sx={{
                //   backgroundColor: dashboardTheme.palette.mist.main,
                //   color: dashboardTheme.palette.mist.contrastText, // Ensures text is readable
                //   '&:hover': {
                //     backgroundColor: dashboardTheme.palette.mist.light || '#4a148c', // Optional hover color
                //   },
                // }}
                variant="text"
                style={{ backgroundColor: theme.palette.mist.main }}
              >
                {appInfo["name"]}
              </Button>
            ))}
          </Box>
        </Box>
      </Toolbar>
      {/* render second toolbar to make AppBar fixed positioning to not cover Map content  */}
      {/* <Toolbar />  */}
    </AppBar>
  );
}
