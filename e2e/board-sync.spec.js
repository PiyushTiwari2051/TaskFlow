import { test, expect } from '@playwright/test';

test('Multiplayer Real-Time Board Sync E2E Test', async ({ browser }) => {
  // 1. Create two separate browser contexts to represent concurrent users
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // --- USER A Setup ---
  // Register User A
  await pageA.goto('/register');
  await pageA.fill('placeholder="John Doe"', 'User Alice');
  await pageA.fill('placeholder="you@domain.com"', 'alice@example.com');
  await pageA.fill('placeholder="Minimum 6 characters"', 'password123');
  await pageA.click('button:has-text("Create Account")');
  await expect(pageA).toHaveURL('/app');

  // Alice creates a new board
  await pageA.click('button:has-text("Create Board")');
  await pageA.fill('placeholder="e.g. Q3 Roadmap Planning"', 'Alice Multiplayer Board');
  await pageA.fill('placeholder="Summarize board targets..."', 'Alice collaborative board for testing E2E');
  await pageA.click('button:has-text("Create Board")');

  // Verify Alice is inside the board view
  await expect(pageA).toHaveURL(/\/app\/boards\/.+/);
  const aliceBoardUrl = pageA.url();
  const boardId = aliceBoardUrl.split('/').pop();

  // Alice opens settings modal to grab inviteCode or gets it from board data
  // We can just query inviteCode by clicking Invite, which copies it. Or since we know the url pattern:
  // Alice clicks Invite to trigger copy (we can mock or grab invite code from DOM if displayed)
  // Let's copy invite link. Since navigator.clipboard is active in chromium, we can fetch clipboard text:
  await pageA.click('button:has-text("Invite")');
  const inviteLink = await pageA.evaluate(() => navigator.clipboard.readText());
  expect(inviteLink).toContain('/invite/');

  // --- USER B Setup ---
  // Register User B
  await pageB.goto('/register');
  await pageB.fill('placeholder="John Doe"', 'User Bob');
  await pageB.fill('placeholder="you@domain.com"', 'bob@example.com');
  await pageB.fill('placeholder="Minimum 6 characters"', 'password123');
  await pageB.click('button:has-text("Create Account")');
  await expect(pageB).toHaveURL('/app');

  // Bob visits the invite link copied by Alice
  await pageB.goto(inviteLink);
  
  // Accept invite and redirect should land Bob on the exact same board view
  await pageB.waitForURL(`/app/boards/${boardId}`);
  await expect(pageB).toHaveURL(aliceBoardUrl);

  // --- COLLABORATION TESTING ---
  
  // 1. Alice creates a task card
  await pageA.locator('text="To Do"').locator('..').locator('button:has-text("Add Card")').click();
  await pageA.fill('placeholder="Type card name..."', 'Multiplayer Card');
  await pageA.keyboard.press('Enter');

  // Verify Alice sees the task card
  await expect(pageA.locator('text="Multiplayer Card"')).toBeVisible();

  // ASSERT: Bob sees the newly created task card appear on his screen without refresh!
  await expect(pageB.locator('text="Multiplayer Card"')).toBeVisible({ timeout: 5000 });

  // 2. Alice drags the card to "In Progress"
  // Locate card handle and drag to the target column container
  const cardLocator = pageA.locator('text="Multiplayer Card"');
  const inProgressCol = pageA.locator('text="In Progress"').locator('..');
  
  await cardLocator.dragTo(inProgressCol);

  // Verify Alice sees the card in "In Progress"
  const aliceProgressCard = inProgressCol.locator('text="Multiplayer Card"');
  await expect(aliceProgressCard).toBeVisible();

  // ASSERT: Bob sees the card move to "In Progress" automatically!
  const bobProgressCard = pageB.locator('text="In Progress"').locator('..').locator('text="Multiplayer Card"');
  await expect(bobProgressCard).toBeVisible({ timeout: 5000 });

  // Close contexts
  await contextA.close();
  await contextB.close();
});
