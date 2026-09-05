# WOMATE Canopy deep route repair

This package replaces the active Canopy source set with one internally consistent version.

Fixes included:
- participant Classroom runtime helper crash
- restores missing Course, Lesson, Quiz, Progress, Resources, Profile and Help route components
- keeps Assignments, CanopyCanvas, Notifications and Certificates on their current dedicated components
- preserves the 20 Sep learner access / 21 Sep Module 01 and five-module pacing schedule
- keeps manager/admin operations routes
- keeps Google OAuth button/API integration
- repairs common UTF-8 mojibake including `Opening Canopyâ€¦` -> `Opening Canopy…`
- adds a static route audit script

Apply from project root, then run the audit and build. No npm install is required.
