---
paths:
  - "src/logic/**"
---

# Export CSV : anti-injection de formule

Tout champ dérivé de contenu utilisateur ou généré par le LLM et exporté en CSV doit neutraliser l'injection de formule (OWASP CSV Injection) : préfixer d'une apostrophe tout champ commençant par `=`, `+`, `-`, `@`, une tabulation ou un retour chariot (`\r`, défense en profondeur), en plus de l'échappement RFC 4180. Voir `escapeCsvField` dans `src/logic/csvExport.js`.
