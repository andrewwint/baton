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
# Four field runs (four distinct apps). X is stakes: the NestJS work is the
# highest (a critical RCE reachable from a deploy path), so it sits furthest
# right/up. That point is ONE app across two phases — Run 8's remediation and
# Run 9's rebuild — so it stays a single dot, not two (Run 9 is not an
# independent codebase). Hence the label "NestJS remediation + rebuild".
# Its green height rests on the Baton-vs-plain-AI wins (the independent audit
# caught the incomplete fix's twin; reachability right-sized the backlog), NOT
# on the RCE alone — a dedicated SAST scanner might flag that too.
field <- data.frame(x = c(0.80, 0.85, 0.90, 0.95), y = c(0.66, 0.76, 0.86, 0.96))

red <- "#b00020"; green <- "#1b7a3d"; ink <- "grey25"

p <- ggplot() +
  geom_hline(yintercept = 0, linewidth = 0.4, colour = "grey60") +
  # real points only
  geom_point(data = bench, aes(x, y), size = 3.2, colour = red) +
  geom_point(data = field, aes(x, y), size = 4.2, colour = green) +
  # the middle is unmeasured; say so where a curve would otherwise be
  annotate("text", x = 0.5, y = 0.30, label = "in between:\nwe haven't tested this",
           hjust = 0.5, size = 3.6, colour = "grey55", fontface = "italic",
           lineheight = 0.95) +
  # finding callouts
  annotate("text", x = 0.02, y = -0.30,
           label = "4 small tests:\nno better than plain AI, and Baton costs more",
           hjust = 0, size = 3.5, colour = red, lineheight = 0.95) +
  # name the four anchors (architecture + public tools, not client code)
  annotate("text", x = 0.765, y = 0.66, label = "CQRS service",
           hjust = 1, size = 3.2, colour = green) +
  annotate("text", x = 0.815, y = 0.76, label = "OIDC login service",
           hjust = 1, size = 3.2, colour = green) +
  annotate("text", x = 0.865, y = 0.86, label = "Strands / AgentCore agent",
           hjust = 1, size = 3.2, colour = green) +
  annotate("text", x = 0.915, y = 0.965, label = "NestJS remediation + rebuild",
           hjust = 1, size = 3.2, colour = green) +
  annotate("text", x = 0.94, y = 0.46,
           label = "a separate audit pass and real-world testing\ncaught bugs the unit tests and the dependency scan missed",
           hjust = 1, size = 3.5, colour = green, lineheight = 0.95) +
  # endpoint labels anchored INSIDE the panel so they never clip
  annotate("text", x = 0.0, y = -0.50, label = "basic tasks",
           hjust = 0, size = 3.8, colour = ink) +
  annotate("text", x = 1.0, y = -0.50, label = "end-to-end development",
           hjust = 1, size = 3.8, colour = ink) +
  scale_x_continuous(limits = c(0, 1), expand = expansion(mult = 0.02),
                     breaks = NULL) +
  scale_y_continuous(breaks = 0, labels = "no\ndifference", limits = c(-0.55, 1.08)) +
  labs(
    title = "When Baton helps, and when it doesn't",
    subtitle = "What we actually saw, not a prediction. 4 small tests and 4 projects (private code).",
    x = NULL,
    y = "How much Baton helps (vs. plain AI)") +
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
