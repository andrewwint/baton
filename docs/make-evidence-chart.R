#!/usr/bin/env Rscript
# Regenerate docs/evidence.png — "where Baton's edge shows up, and where it doesn't."
#
# Honesty geometry (this matters more than the caption):
#   - X axis is STAKES / cost-of-being-wrong, NOT complexity. Our own
#     complex-workflow eval washed, so "edge tracks complexity" is false; the
#     evidence is stakes, not step-count.
#   - NO fitted trend line. We have 4 washes at one end and 2 field runs at the
#     other, nothing in between. A curve would assert a relationship we have not
#     measured. We plot only the real points and mark the middle as unmeasured.
#   - The green points are high because independent verification + real execution
#     caught defects a green suite missed, not because the work was large.
#
# Run from the repo root:  Rscript docs/make-evidence-chart.R
suppressMessages(library(ggplot2))

here <- tryCatch(dirname(sub("^--file=", "",
  grep("^--file=", commandArgs(FALSE), value = TRUE))), error = function(e) "docs")
out <- file.path(if (length(here) == 1 && nzchar(here)) here else "docs", "evidence.png")

# The only real anchors. No interpolation between them.
bench <- data.frame(x = c(0.05, 0.11, 0.17, 0.23), y = -0.13)
field <- data.frame(x = c(0.80, 0.90), y = c(0.84, 0.96))

red <- "#b00020"; green <- "#1b7a3d"; ink <- "grey25"

p <- ggplot() +
  geom_hline(yintercept = 0, linewidth = 0.4, colour = "grey60") +
  # real points only
  geom_point(data = bench, aes(x, y), size = 3.2, colour = red) +
  geom_point(data = field, aes(x, y), size = 4.2, colour = green) +
  # the middle is unmeasured; say so where a curve would otherwise be
  annotate("text", x = 0.5, y = 0.30, label = "between the ends:\nunmeasured",
           hjust = 0.5, size = 3.6, colour = "grey55", fontface = "italic",
           lineheight = 0.95) +
  # finding callouts
  annotate("text", x = 0.14, y = -0.30,
           label = "bench x4: wash\n(ties a bare model, costs more)",
           hjust = 0.5, size = 3.5, colour = red, lineheight = 0.95) +
  annotate("text", x = 0.85, y = 0.55,
           label = "field runs (N=2): independent review +\nrunning for real caught defects a\ngreen suite passed",
           hjust = 1, size = 3.5, colour = green, lineheight = 0.95) +
  # endpoint labels anchored INSIDE the panel so they never clip
  annotate("text", x = 0.0, y = -0.50, label = "low stakes",
           hjust = 0, size = 3.8, colour = ink) +
  annotate("text", x = 1.0, y = -0.50, label = "high stakes (production, real infra)",
           hjust = 1, size = 3.8, colour = ink) +
  scale_x_continuous(limits = c(0, 1), expand = expansion(mult = 0.02),
                     breaks = NULL) +
  scale_y_continuous(breaks = 0, labels = "none", limits = c(-0.55, 1.08)) +
  labs(
    title = "Where Baton's edge shows up, and where it doesn't",
    subtitle = "Real points only, no fitted trend. 4 washed benches + 2 field runs (N=2, private code).",
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
