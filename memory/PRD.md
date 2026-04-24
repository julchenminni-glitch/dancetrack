# DanceTrack - PRD

## Overview
DanceTrack ist eine umfassende Tanzverwaltungs-App für Trainer. Sie verwaltet Workspaces (Tanzkontexte), Gruppen, Schüler, Anwesenheit, Belohnungen und Trainerstunden – alles persistent gespeichert.

## Tech Stack
- **Frontend**: Expo SDK 54 (React Native), Expo Router, AsyncStorage, expo-image-picker, axios
- **Backend**: FastAPI, MongoDB (motor), JWT (PyJWT), bcrypt
- **Fonts**: DM Serif Display (Überschriften), DM Sans (Body)
- **Farben**: Pastell-Rosa Palette (#fef5f5 BG, #d4719d Primär, #c9a8d4 Sekundär)

## Features (alle MVP V1)
1. **Auth**: Login/Register mit JWT Bearer Token (30-Tage gültig), Demo-User auto-seeded
2. **Workspaces**: Mehrere Tanzkontexte pro Trainer; auto-gesät mit 11 Standard-Reward-Levels; Cascade-Delete
3. **Gruppen**: Name, Wochentag, Zeit, Farbe (8 Auswahl), Reward-System-Toggle
4. **Schüler**: Name, Geburtstag, Telefon, Foto (base64 via Kamera/Galerie), Gruppe, Anmeldestatus, auto-berechnetes Alter
5. **Anwesenheit**: Events (Training/Auftritt/Event) mit Datum, Status-Toggle (🪩 Anwesend / 🌴 Entschuldigt / 👻 Fehlend), auto-erstellte Trainer-Session, auto Level-Up bei Training
6. **Anmeldungen**: Tap-to-Toggle Checkbox pro Schüler
7. **Stunden-Planung**: Wochenkalender mit Vor/Zurück-Navigation, Lesson-Planning (Choreo, Musik, Übungen, Checkliste, Status)
8. **Trainer-Stunden**: Stats (Gesamt/Bezahlt/Offen), manuelle Eingabe, Paid-Toggle
9. **Awards**: Top Achievers, alle 11 Levels mit Fortschrittsbalken (% Schüler erreicht)
10. **Einstellungen**: Trainername, eigene Custom-Levels erstellen, Farbpalette, Abmelden
11. **Benachrichtigungen**: Bell-Icon zeigt Gruppen ohne heutige Anwesenheit
12. **Dashboard**: Stats-Cards, Level-Up-Warnungen (1 Training bis Level), Top 3 Achievers, Wochenübersicht

## Belohnungs-System (11 Standard Levels)
🌱 Samen (0) → 🌿 Spross (5) → 🍃 Mini Blatt (10) → 🍀 Kleeblatt (15) → 🌱 Knospe (20) → 🌼 Blüte (25) → 🌻 Blume (30) → 🐝 Biene (35) → 🐞 Marienkäfer (40) → 🐛 Raupe (45) → 🦋 Schmetterling (50+)

## API (alle /api prefixed, JWT Bearer außer /auth/login|register)
`/auth/*`, `/workspaces`, `/workspaces/{id}/{groups|students|events|attendance|lessons|trainer-sessions|reward-levels}`

## Demo-Zugang
Email: `demo@dancetrack.app` | Password: `demo12345`
