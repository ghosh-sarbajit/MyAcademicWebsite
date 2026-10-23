---
# Leave the homepage title empty to use the site title
title: ''
summary: ''
# Browser tab / search result title for the homepage only
seo:
  title: 'Sarbajit Ghosh — PhD Scholar in Computer Science, IIT Kanpur'
date: 2022-10-24
type: landing

design:
  # Default section spacing
  spacing: '6rem'

sections:
  - block: resume-biography-3
    content:
      # Choose a user profile to display (a folder name within `content/authors/`)
      username: me
      text: ''
      # Show a call-to-action button under your biography? (optional)
      button:
        text: Download CV
        url: uploads/resume.pdf
        new_tab: true
      headings:
        about: ''
        education: ''
        interests: ''
    design:
      # Use the new Gradient Mesh which automatically adapts to the selected theme colors
      background:
        gradient_mesh:
          enable: true

      # Name heading sizing to accommodate long or short names
      name:
        size: md # Options: xs, sm, md, lg (default), xl

      # Avatar customization
      avatar:
        size: medium # Options: small (150px), medium (200px, default), large (320px), xl (400px), xxl (500px)
        shape: circle # Options: circle (default), square, rounded
  - block: markdown
    content:
      title: '🔬 My Research'
      subtitle: ''
      text: |-
        My research interest aligns with the interplay between differential privacy and machine learning. I apply my interdisciplinary background in cryptography, statistics, and computer science to find creative solutions to complex problems in privacy-preserving technologies.

        My broader interests lie in:
        - Differential Privacy & Machine Learning
        - Privacy-Preserving Technologies
        - Cryptography & Security
        - Statistical Analysis
        - Computational Linguistics

        I am passionate about making real-world impact through advancing these areas and applying theoretical knowledge to practical problems.
    design:
      columns: '1'
  - block: collection
    id: publications
    content:
      title: Publications
      text: ''
      filters:
        folders:
          - publications
        exclude_featured: false
    design:
      view: citation
---
