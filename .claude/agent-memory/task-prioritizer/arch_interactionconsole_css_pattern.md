---
name: arch_interactionconsole_css_pattern
description: Known anti-pattern in InteractionConsole/LaptopInteractionConsole — inline css prop object — identified as a priority refactor target
type: project
---

`InteractionConsole.jsx` accepts a `css` prop that is a raw object of inline style values (e.g., `{ height: "1.4rem", textColor: "white", hoverBg: "none", hoverTextColor: "oklch(70.7% 0.165 254.624)", fontSize: "12px", likeSize: "1rem", ... }`).

`LaptopInteractionConsole.jsx` is a thin hover-state wrapper around `InteractionConsole` that passes this object to configure appearance at different breakpoints.

This pattern predates the Tailwind design token system and is the primary target for:
- CSS consolidation task (replace with named Tailwind variants or CSS custom properties)
- Component modularization task (collapse LaptopInteractionConsole into InteractionConsole with a `variant` or `context` prop)

The two components together are the single most maintenance-intensive part of the shared component layer.
