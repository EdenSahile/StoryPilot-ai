// e2e/navigation.spec.js
//
// Navigation : le bouton retour du navigateur fonctionne entre les écrans
// de l'app et dans la vue détail de l'historique.
//
// L'app est une SPA sans react-router : la navigation repose sur pushState/popstate
// (src/App.jsx + src/screens/Library.jsx). Ces tests vérifient que le contrat est
// tenu pour chaque transition.

import { test, expect } from '@playwright/test';

const BRIEF = 'Permettre à un client de suivre sa commande en temps réel depuis son compte.';

const FAKE_STORY = `**User Story 1** En tant que client, je veux suivre ma commande en temps réel afin de savoir quand elle arrive.

**Description :**
Le client doit pouvoir consulter le statut de sa commande sans contacter le support.

**Critères d'acceptation :**
- Le statut de la commande est visible depuis la page compte

**Scénarios Gherkin :** (MAXIMUM 2 scénarios, 4 lignes chacun — ne pas dépasser)

Scénario 1 : Consultation du statut
- Étant donné une commande en cours
- Quand le client ouvre la page de suivi
- Alors le statut actuel s'affiche
- Et l'heure de dernière mise à jour est visible

**Complexité :** M`;

function sseBody() {
  const events = [
    { text: FAKE_STORY },
    { stop: true },
  ];
  const lines = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
  return `${lines}data: [DONE]\n\n`;
}

test.describe('Navigation — bouton retour du navigateur', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/list-docs', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ documents: [] }),
      }),
    );
    await page.route('**/api/retrieve-context', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, chunks: [], totalMatches: 0 }),
      }),
    );
    await page.route('**/api/generate-stories', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sseBody(),
      }),
    );
  });

  test('retour navigateur entre écrans ramène à l\'écran précédent', async ({ page }) => {
    await page.goto('/');

    // Forge (écran initial sans localStorage)
    await expect(page.getByPlaceholder(/Décris ton besoin métier ici/)).toBeVisible();

    // Forge → Historique
    await page.locator('aside nav button', { hasText: 'Historique' }).click();
    await expect(page.getByRole('heading', { name: 'Historique' })).toBeVisible();

    // Historique → Réglages
    await page.locator('aside nav button', { hasText: 'Réglages' }).click();
    await expect(page.getByRole('heading', { name: 'Réglages' })).toBeVisible();

    // Retour navigateur : Réglages → Historique
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Historique' })).toBeVisible();

    // Retour navigateur : Historique → Forge
    await page.goBack();
    await expect(page.getByPlaceholder(/Décris ton besoin métier ici/)).toBeVisible();
  });

  test('navigation après un retour navigateur pousse bien une entrée dans l\'historique', async ({ page }) => {
    await page.goto('/');

    // Forge → Historique → retour → Forge
    await page.locator('aside nav button', { hasText: 'Historique' }).click();
    await expect(page.getByRole('heading', { name: 'Historique' })).toBeVisible();
    await page.goBack();
    await expect(page.getByPlaceholder(/Décris ton besoin métier ici/)).toBeVisible();

    // Forge → Réglages (après le retour, cette navigation doit pousser une entrée)
    await page.locator('aside nav button', { hasText: 'Réglages' }).click();
    await expect(page.getByRole('heading', { name: 'Réglages' })).toBeVisible();

    // Retour navigateur : Réglages → Forge (et pas un saut d'écran)
    await page.goBack();
    await expect(page.getByPlaceholder(/Décris ton besoin métier ici/)).toBeVisible();
  });

  test('retour navigateur depuis le détail historique ramène à la liste', async ({ page }) => {
    await page.goto('/');

    // Générer une story pour qu'il y ait une entrée dans l'historique
    await page.locator('aside nav button', { hasText: 'Brief' }).click();
    await page.getByPlaceholder(/Décris ton besoin métier ici/).fill(BRIEF);
    await page.getByRole('button', { name: /Générer les user stories/ }).click();
    await expect(page.getByRole('heading', { name: 'Backlog de Génération' })).toBeVisible();

    // Aller dans l'historique
    await page.locator('aside nav button', { hasText: 'Historique' }).click();
    const entryTitle = page.getByText(/^Permettre à un client de suivre sa commande/);
    await expect(entryTitle).toBeVisible();

    // Ouvrir le détail
    await entryTitle.click();
    await expect(page.getByRole('button', { name: /Retour/ })).toBeVisible();
    await expect(page.getByText(/suivre ma commande en temps réel/)).toBeVisible();

    // Retour navigateur : détail → liste historique
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Historique' })).toBeVisible();
    await expect(entryTitle).toBeVisible();
  });

  test('le bouton Retour dans le détail historique ramène à la liste', async ({ page }) => {
    await page.goto('/');

    // Générer une story
    await page.locator('aside nav button', { hasText: 'Brief' }).click();
    await page.getByPlaceholder(/Décris ton besoin métier ici/).fill(BRIEF);
    await page.getByRole('button', { name: /Générer les user stories/ }).click();
    await expect(page.getByRole('heading', { name: 'Backlog de Génération' })).toBeVisible();

    // Historique → détail
    await page.locator('aside nav button', { hasText: 'Historique' }).click();
    await page.getByText(/^Permettre à un client de suivre sa commande/).click();
    await expect(page.getByRole('button', { name: /Retour/ })).toBeVisible();

    // Clic sur le bouton Retour dans la top bar
    await page.getByRole('button', { name: /Retour/ }).click();
    await expect(page.getByRole('heading', { name: 'Historique' })).toBeVisible();
    await expect(page.getByText(/^Permettre à un client de suivre sa commande/)).toBeVisible();
  });
});
