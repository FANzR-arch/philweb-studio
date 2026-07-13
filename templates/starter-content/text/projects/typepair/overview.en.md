---
title: "TypePair"
subtitle: "Pick a body font, get a matching heading font"
problemLine: "Pairing fonts means endless trial and error, and the result never feels quite right"
description: "Enter a body font and get a few well-balanced heading fonts, previewed live with your own copy."
keywords:
  - "Font pairing"
  - "Typography tool"
  - "Side project"
detailImages:
  - "../../../media/projects/typepair/01.svg"
  - "../../../media/projects/typepair/02.svg"
context: "Designers and web builders often get stuck on font pairing: the body font is set, but choosing the heading font drags on with lots of trial and error."
problem:
  - "Font pairing relies on experience and feel, hard for beginners."
  - "Swapping fonts one by one inside a design file is slow."
  - "Online pairing tips rarely let you preview with your own copy."
goal: "Build a tool that suggests a coordinated heading font from a body font, making typography decisions faster and more grounded."
solution: "Matches fonts by weight, shape and character, suggests a few well-contrasted heading fonts, and lets you preview with your own copy live."
design:
  - "One-tap options: enter a body font, get pairings instantly."
  - "Real-copy preview: replace the sample text with your own headings and body."
  - "Clear comparison: pairings shown side by side to pick at a glance."
workflow: "React renders the font previews; pairing logic is built on font-feature annotations and rule matching, with fonts loaded dynamically via web fonts."
reflection:
  pros:
    - "Turned feel-based font pairing into a quick, comparable choice."
  cons:
    - "The font library still needs to grow, especially for Chinese fonts."
---

Write a longer project story, development log or changelog here.
