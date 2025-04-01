'use client';
import Header from "../ui/dashboard/Header"

import { Container } from "@mui/material"
import { ThemeProvider } from '@mui/material/styles'

import { appTheme } from "../ui/theme";


export default function DashboardLayout({children}){
    const appRoutes = [
        {
            link: "/dashboard/explore",
            name: "Explore"
        },
        {
            link: "/dashboard/safety",
            name: "Safety"
        },
        // {
        //     link: "/equity",
        //     name: "Equity"
        // },
        // {
        //     link: "/infrastructure",
        //     name: "Infrastructure"
        // }
        
    ]
    return (
        <ThemeProvider theme={appTheme}>
            <Container maxWidth={false} disableGutters={true}>
                <Header apps={appRoutes}/>
                {children}
            </Container>
        </ThemeProvider>

    )

}