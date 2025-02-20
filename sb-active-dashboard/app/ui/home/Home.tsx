import React from "react";
import Link from "next/link";
import { Container, Typography } from "@mui/material";

export default function HomePage() {

    return (

        <Container maxWidth='lg'>
            <Typography variant="h2">
                Welcome! Check out our applications:
            </Typography>
            <Link href="/dashboard/query-vis">Data Query & Visualization</Link>

        </Container>
    )

}