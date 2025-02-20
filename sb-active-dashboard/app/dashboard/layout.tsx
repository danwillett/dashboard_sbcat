'use client';
import Header from "../ui/dashboard/Header"

import { Container } from "@mui/material"
import { ThemeProvider } from '@mui/material/styles'

import { dashboardTheme } from "../ui/dashboard/theme";


export default function DashboardLayout({children}){
    const appRoutes = [
        {
            link: "/explore",
            name: "Explore"
        },
        {
            link: "/safety",
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
        <ThemeProvider theme={dashboardTheme}>
            <Container maxWidth={false} disableGutters={true}>
                <Header apps={appRoutes}/>
                {children}
            </Container>
        </ThemeProvider>

    )

}