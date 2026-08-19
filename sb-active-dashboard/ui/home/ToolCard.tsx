"use client";

import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  Typography,
} from "@mui/material";

interface Props {
  title: string;
  description: string;
  image: string;
  /** Optional route. Cards without a link are visual placeholders for now. */
  link?: string;
}

export default function ToolCard({ title, description, image, link }: Props) {
  const content = (
    <>
      <CardMedia
        component="img"
        height="160"
        image={image}
        alt=""
        sx={{ objectFit: "cover" }}
      />
      <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
          <Typography component="h3" variant="h6" sx={{ color: "navy.main", fontWeight: 700, lineHeight: 1.3 }}>
            {title}
          </Typography>
          {!link && (
            <Chip
              label="Coming soon"
              size="small"
              sx={{
                flexShrink: 0,
                backgroundColor: "mist.light",
                color: "navy.main",
                fontWeight: 600,
              }}
            />
          )}
        </Box>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {description}
        </Typography>
      </CardContent>
    </>
  );

  return (
    <Card
      elevation={2}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        overflow: "hidden",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: 4,
        },
      }}
    >
      {link ? (
        <CardActionArea
          component={RouterLink}
          to={link}
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
          }}
        >
          {content}
        </CardActionArea>
      ) : (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>{content}</Box>
      )}
    </Card>
  );
}
