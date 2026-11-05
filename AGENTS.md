# dice-rows

A small roll-and-cross dice game for the web, built by AI agents Kayla directs. It's also a public example of
how she works with AI: every piece of work starts as a ticket with checkable acceptance criteria (`define-work`
skill), and results are measured.

This repo is **public**. Never write ideas, plans, private details, or employer or client names here.
The game is original: its own name, look and wording. Don't copy another game's name, art or rulebook text.

## How to work here

- Nothing is built yet. The stack and the first outcome come from Kayla's first ticket.
- Start each piece of work from a ticket with acceptance criteria. Check each criterion before calling it done.
- Never merge without Kayla.

## README

Write the README with `~/Dev/kayla-hq/docs/guides/great-readme.md`. Before marking a PR with a substantial
README change ready (new or rewritten sections, feature, status or architecture claims; not link, typo or
formatting fixes), run the README reviewer subagent if you have it (`readme-reviewer` in Claude,
`readme_reviewer` in Codex) and fix what it finds.

## Kayla HQ
This project is managed by Kayla HQ. Its status file is `kaylahellbusch/kayla-hq` : `projects/dice-rows/PROJECT.md`
(private, because this repo is public; read and write it with `~/Dev/kayla-hq/bin/pf`). Whenever you change what
Kayla needs to do here, update it with the `pm-status` skill (~/Dev/kayla-hq/skills/pm-status/SKILL.md). Never
notify Kayla directly. Kayla HQ decides when she sees each item. Ideas she tells you go there too (`capture` skill).
