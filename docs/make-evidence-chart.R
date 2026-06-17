#!/usr/bin/env Rscript
# Regenerate docs/evidence.png — the "where Baton's value shows up" chart.
#
# Honesty note: the dashed curve is ILLUSTRATIVE, not a plotted measurement.
# The only real anchors are the four washed benches (left) and two field runs
# (right, N=2, private code). Everything else is the shape of the claim, not data.
#
# Run from the repo root:  Rscript docs/make-evidence-chart.R
suppressMessages(library(ggplot2))

here <- tryCatch(dirname(sub("^--file=", "",
  grep("^--file=", commandArgs(FALSE), value = TRUE))), error = function(e) "docs")
out <- file.path(if (length(here) == 1 && nzchar(here)) here else "docs", "evidence.png")

# Illustrative trend: edge rises with development complexity (NOT measured).
curve <- data.frame(x = seq(0, 1, length.out = 200))
curve$y <- -0.15 + 1.18 * (curve$x^2.2)

# The only real anchors.
bench <- data.frame(x = c(0.05, 0.11, 0.17, 0.23), y = -0.13)
field <- data.frame(x = c(0.82, 0.91), y = c(0.84, 0.96))

red <- "#b00020"; green <- "#1b7a3d"; ink <- "grey25"

p <- ggplot() +
  geom_hline(yintercept = 0, linewidth = 0.4, colour = "grey60") +
  geom_line(data = curve, aes(x, y), linetype = "dashed",
            linewidth = 0.9, colour = "grey45") +
  geom_point(data = bench, aes(x, y), size = 3.2, colour = red) +
  geom_point(data = field, aes(x, y), size = 4.2, colour = green) +
  # finding callouts
  annotate("text", x = 0.14, y = -0.30,
           label = "bench x4: wash\n(ties a bare model, costs more)",
           hjust = 0.5, size = 3.5, colour = red, lineheight = 0.95) +
  annotate("text", x = 1.0, y = 0.30,
           label = "field runs (N=2): caught defects a\ngreen suite passed; live-deploy bugs",
           hjust = 1, size = 3.5, colour = green, lineheight = 0.95) +
  # endpoint labels anchored INSIDE the panel so they never clip
  annotate("text", x = 0.0, y = -0.47, label = "trivial / low-stakes",
           hjust = 0, size = 3.7, colour = ink) +
  annotate("text", x = 1.0, y = -0.47, label = "complex development efforts",
           hjust = 1, size = 3.7, colour = ink) +
  scale_x_continuous(limits = c(0, 1), expand = expansion(mult = 0.02),
                     breaks = NULL) +
  scale_y_continuous(breaks = 0, labels = "none", limits = c(-0.5, 1.08)) +
  labs(
    title = "Baton's edge tracks development complexity",
    subtitle = "Illustrative, not a plotted measurement. Only real points: 4 washed benches + 2 field runs (N=2, private code).",
    x = NULL,
    y = "Baton's edge over a bare model") +
  theme_minimal(base_size = 13) +
  theme(
    plot.title = element_text(face = "bold"),
    plot.subtitle = element_text(colour = "grey35", size = 9.5),
    panel.grid.minor = element_blank(),
    panel.grid.major.x = element_blank(),
    axis.text.x = element_blank(),
    axis.text.y = element_text(colour = ink),
    plot.margin = margin(10, 16, 10, 10))

ggsave(out, p, width = 8, height = 4.6, dpi = 150, bg = "white")
cat("wrote", out, "\n")
