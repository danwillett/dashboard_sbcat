"use client";

import React from "react";
import { Box, Container, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import Header from "@/ui/dashboard/Header";
import Footer from "@/ui/dashboard/Footer";
import ToolCard from "./ToolCard";
import landingContent from "./landingContent.json";

const headerApps = [
  { name: "About", link: "/about" },
  { name: "Contact", link: "/contact" },
];

export default function HomePage() {
  const { heroImage, platformDescription, cardImage, categories } = landingContent;

  return (
    <Box
      id="landing-page"
      sx={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "white.main",
      }}
    >
      {/* Full-bleed header + hero */}
      <Header apps={headerApps} />

      <Box
        id="landing-hero"
        component="section"
        sx={{
          position: "relative",
          width: "100%",
          minHeight: { xs: 280, md: 420 },
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          backgroundColor: "navy.main",
        }}
      >
        <Box
          component="img"
          src={heroImage}
          alt=""
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(0,54,96,0.75) 0%, rgba(0,54,96,0.45) 55%, rgba(0,54,96,0.25) 100%)",
          }}
        />
        <Container
          maxWidth="xl"
          sx={{
            position: "relative",
            zIndex: 1,
            py: { xs: 6, md: 8 },
          }}
        >
          <Typography
            component="h1"
            variant="h2"
            sx={{
              color: "white.main",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              fontSize: { xs: "2.25rem", sm: "3rem", md: "3.75rem" },
              textShadow: "0 2px 16px rgba(0,0,0,0.35)",
            }}
          >
            Active Santa Barbara County
          </Typography>
        </Container>
      </Box>

      {/* Constrained content column */}
      <Box
        id="landing-description"
        component="section"
        sx={{
          width: "100%",
          backgroundColor: "white.main",
          borderBottom: (theme) => `4px solid ${theme.palette.coral.dark}`,
        }}
      >
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
          <Typography
            variant="h5"
            sx={{ color: "navy.main", fontWeight: 700, mb: 2 }}
          >
            About this platform
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "navy.main",
              fontSize: { xs: "1rem", md: "1.125rem" },
              lineHeight: 1.7,
            }}
          >
            {platformDescription}
          </Typography>
        </Container>
      </Box>

      <Box id="landing-tools" component="section" sx={{ flex: 1, width: "100%" }}>
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
          {categories.map((category) => (
            <Box
              key={category.id}
              id={`landing-category-${category.id}`}
              sx={{ mb: { xs: 5, md: 7 } }}
            >
              <Typography
                component="h2"
                variant="h4"
                sx={{
                  color: "navy.main",
                  fontWeight: 800,
                  mb: 3,
                  pb: 1,
                  borderBottom: (theme) => `2px solid ${theme.palette.mist.main}`,
                }}
              >
                {category.title}
              </Typography>

              <Grid container spacing={3} columns={12}>
                {category.tools.map((tool) => (
                  <Grid key={tool.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <ToolCard
                      title={tool.title}
                      description={tool.description}
                      image={cardImage}
                      link={(tool as { link?: string }).link}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Container>
      </Box>

      <Footer />
    </Box>
  );
}
