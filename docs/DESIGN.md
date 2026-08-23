# Siege design

Implement against this file, not folklore.

## Identity

- Product: **Siege**
- Repo: `computerpets-siege`
- Idea: Desktop Pet Siege
- Genre: Tower defense overlay
- Engine: C# / WinForms (or WPF)
- Surface: `desktop overlay`

## Loop

The flagship pet is already a living sticker on Windows. Siege is the combat skin of that sticker: creeps climb the taskbar, Rui swats them. Close Siege, the pet still walks.

## Play beats

- Start from desktop.ps1 extra flag or siege.exe.
- Place up to 3 owned pets as towers on screen edges.
- Creeps are abstract (paperclips, popups), not horror.
- Defeat = overlay hides 30s, then walks back. No permadeath.

## Neighbors

- computerpets desktop overlay
- computerpets-motion
- computerpets-dojo
- computerpets-horde (wave DNA)

## Failure doctrine

Game crash → overlay process is separate, pet remains. Multi-monitor → defend the focused screen only. Accessibility: motion can be reduced.

## Hard rules

1. Minigames cannot mint or burn NFTs by themselves (Minter is the write path).
2. Stats come from lived overlay care + Dojo caps, not cash shop.
3. Species kits stay inside Lore. Illegal hybrids never spawn.
4. Fail soft: the desktop overlay process is not this process.
