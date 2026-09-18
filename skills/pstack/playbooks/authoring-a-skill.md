# Authoring or modifying a skill

**You own the skill's voice.**

1. Follow the target harness's skill format. Under Pi: a directory with `SKILL.md`, YAML frontmatter carrying `name` (lowercase, hyphens) and a specific `description`, plus optional `references/`, `scripts/`, and `assets/`. Read the harness docs before inventing frontmatter fields.
2. **Validate.** Frontmatter has `name` and `description`. Every referenced file exists. Cross-skill links resolve. Skill names do not collide with another installed skill.
3. **Test cases if the change is structural.** Skip if it is subjective.
4. Finish per [opening-a-pr](opening-a-pr.md) when the user authorized a PR.

When in doubt, delete. Keep only prose that changes a decision. Tell the model to do the thing and skip the reason. Explain only when the rule is confusing without one. Match tone to scope. Point at structural sources (types, readmes, config) per [encode-lessons-in-structure](../references/principles.md#encode-lessons-in-structure). Delegate to other skills by path. Do not restate what they already say. A workflow you keep hitting that no skill captures becomes a proposal for a new skill.

**Reply.** Summary of the skill, key design decisions, validation notes.
