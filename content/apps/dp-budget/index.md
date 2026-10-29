---
title: DP Budget Calculator
weight: 4
group: Privacy
app: dp-budget
summary: Add up the privacy cost of several differentially private steps on the same data, and find the noise a Gaussian mechanism needs.
steps: [List the steps, Compare the compositions, Pick the noise]
---

Enter the ε and δ of each differentially private step and how many times it runs; the page gives the total (ε, δ) by basic composition, advanced composition and zCDP.
For repeated Gaussian noise, as in DP-SGD, it gives ε exactly and by Rényi DP, or the noise needed for a target ε.
