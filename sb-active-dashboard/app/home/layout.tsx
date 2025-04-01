'use client';

import { Container } from "@mui/material"
import { ThemeProvider } from '@mui/material/styles'

import { appTheme } from "../ui/theme";


export default function DashboardLayout({children}){
    
    return (
        <ThemeProvider theme={appTheme}>
            <Container maxWidth={false} disableGutters={true}>
                {children}
            </Container>
        </ThemeProvider>

    )

}