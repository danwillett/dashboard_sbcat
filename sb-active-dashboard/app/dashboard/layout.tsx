'use client';
import { ReactNode } from "react";

// import layer provider
import MapProvider from "@/app/lib/context/MapContext"

// import components
import Header from "../ui/dashboard/Header"

// import mui components
import { Container } from "@mui/material"
import { ThemeProvider } from '@mui/material/styles'
import { appTheme } from "../ui/theme";

interface DashboardLayoutProps {
    children: ReactNode;
}

export default function DashboardLayout({children}: DashboardLayoutProps){
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
        <MapProvider>
            <ThemeProvider theme={appTheme}>
                <Container maxWidth={false} disableGutters={true}>
                    <Header apps={appRoutes}/>
                    {children}
                </Container>
            </ThemeProvider>
        </MapProvider>

    )

}