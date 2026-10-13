"use client";

import { motion } from "framer-motion";
import { Container, Box, Typography, Button } from "@mui/material";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import { useApp } from "@/lib/store";
import { formatTaler } from "@/lib/german";
import { motionPresets } from "@/lib/theme";

export function LandingScreen() {
  const { navigate, prefs } = useApp();

  return (
    <Container maxWidth="md" sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", py: 4 }}>
      <Box component={motion.div} {...motionPresets.pageEnter}>
        <Typography variant="h1" fontWeight={800} color="text.primary" sx={{ fontSize: { xs: "2.5rem", sm: "3.5rem" } }}>
          Wissensgipfel
        </Typography>
        <Typography variant="overline" color="text.secondary" sx={{ display: "block", mt: 1, letterSpacing: "0.15em" }}>
          Besteige den Berg des Wissens
        </Typography>
      </Box>

      <Box component={motion.div} {...motionPresets.itemEnter(0.15)} sx={{ mt: 4, maxWidth: 480 }}>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Eine Lern-Plattform für die Klassen 5–8. Beantworte 15 Fragen,
          nutze Joker und erreiche den Gipfel —{" "}
          <Box component="span" fontWeight={600} color="text.primary">
            {formatTaler(500000)} Taler Spielgeld
          </Box>{" "}
          warten.
        </Typography>
      </Box>

      <Box component={motion.div} {...motionPresets.itemEnter(0.3)} sx={{ mt: 6, maxWidth: 400, width: "100%" }}>
        <Button
          variant="contained"
          size="large"
          color="primary"
          fullWidth
          startIcon={<RocketLaunchIcon />}
          onClick={() => navigate("onboarding")}
          sx={{
            height: 56,
            borderRadius: 999,
            fontSize: "1.1rem",
            fontWeight: 700,
            boxShadow: "0 8px 32px rgba(139, 108, 255, 0.3)",
            "&:hover": {
              boxShadow: "0 12px 40px rgba(139, 108, 255, 0.45)",
              transform: "translateY(-2px)",
            },
            transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          Los geht&apos;s
        </Button>
      </Box>
    </Container>
  );
}
