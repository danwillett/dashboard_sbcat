"use client";
import { ReactNode } from "react";
import { Container } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";

import { appTheme } from "../ui/theme";

interface HomeLayoutProps {
  children: ReactNode;
}

export default function HomeLayout({ children }: HomeLayoutProps) {
  return (
    <ThemeProvider theme={appTheme}>
      <Container maxWidth={false} disableGutters={true}>
        {children}
      </Container>
    </ThemeProvider>
  );
}
