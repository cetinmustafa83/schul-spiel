"use client";

import { motion } from "framer-motion";
import { Container, Box, Typography, IconButton, Card, CardContent, Avatar } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import QuizIcon from "@mui/icons-material/Quiz";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useApp } from "@/lib/store";
import { SCHOOL_TYPE_LABELS } from "@/lib/german";
import { motionPresets } from "@/lib/theme";

export function HomeScreen() {
  const { player, navigate } = useApp();

  return (
    <Container
      maxWidth="md"
      sx={{ minHeight: "100vh", py: 4, display: "flex", flexDirection: "column" }}
    >
      {/* Header */}
      <Box
        component={motion.div}
        {...motionPresets.itemEnter(0)}
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 5 }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar sx={{ bgcolor: "rgba(139, 108, 255, 0.18)", border: "1px solid", borderColor: "divider" }}>
            <QuizIcon sx={{ color: "secondary.light" }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800} color="text.primary">
              Hallo, {player?.name}!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {SCHOOL_TYPE_LABELS[player?.schoolType ?? ""] ?? player?.schoolType} · Klasse {player?.grade}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={() => navigate("settings")}
          sx={{
            bgcolor: "rgba(245, 243, 255, 0.05)",
            border: "1px solid",
            borderColor: "divider",
            "&:hover": { bgcolor: "rgba(139, 108, 255, 0.15)", borderColor: "primary.main" },
          }}
          aria-label="Einstellungen"
        >
          <SettingsIcon />
        </IconButton>
      </Box>

      {/* Klassenarbeit card — the only mode */}
      <Box component={motion.div} {...motionPresets.cardEnter(0.1)}>
        <Card
          onClick={() => navigate("klassenarbeit-setup")}
          sx={{
            cursor: "pointer",
            p: 3,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
            "&:hover": {
              borderColor: "primary.main",
              transform: "translateY(-2px)",
              boxShadow: "0 12px 40px rgba(139, 108, 255, 0.18)",
            },
          }}
        >
          <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, mb: 2 }}>
              <Avatar
                variant="rounded"
                sx={{
                  bgcolor: "rgba(255, 200, 61, 0.12)",
                  border: "1px solid",
                  borderColor: "divider",
                  width: 56,
                  height: 56,
                }}
              >
                <QuizIcon sx={{ fontSize: 28, color: "secondary.main" }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" fontWeight={800} color="text.primary">
                  Klassenarbeit
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Prüfung simulieren — Fach & Themen wählen
                </Typography>
              </Box>
              <ChevronRightIcon sx={{ color: "text.secondary", transition: "transform 0.2s" }} />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
