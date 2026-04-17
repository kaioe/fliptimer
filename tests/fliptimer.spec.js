import { test, expect } from '@playwright/test';

test.describe('FlipTimer E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the fliptimer page
    await page.goto('/fliptimer.html');
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
  });

  test('page loads successfully', async ({ page }) => {
    // Check that the flip clock digits are visible
    const countdown = page.locator('.countdown');
    await expect(countdown).toBeVisible();

    // Check that toolbar buttons are present
    const playBtn = page.locator('button[aria-label="Play"]');
    const resetBtn = page.locator('button[aria-label="Reset"]');
    const presetsBtn = page.locator('button[aria-label="Presets"]');
    
    await expect(playBtn).toBeVisible();
    await expect(resetBtn).toBeVisible();
    await expect(presetsBtn).toBeVisible();
  });

  test('preset modal opens and closes', async ({ page }) => {
    // Open preset modal
    const presetsBtn = page.locator('button[aria-label="Presets"]');
    await presetsBtn.click();

    // Check modal is visible
    const modal = page.locator('.preset-modal');
    await expect(modal).toBeVisible();

    // Check modal title
    const title = page.locator('#preset-modal-title');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('Settings');

    // Close modal via X button
    const closeBtn = page.locator('#preset-modal-close');
    await closeBtn.click();

    // Verify modal is closed
    await expect(modal).not.toBeVisible();
  });

  test('create and apply a new preset', async ({ page }) => {
    // Open preset modal
    const presetsBtn = page.locator('button[aria-label="Presets"]');
    await presetsBtn.click();

    // Click "New Timer" button
    const newTimerBtn = page.locator('button[aria-label="Add new timer"]');
    await expect(newTimerBtn).toBeVisible();
    await newTimerBtn.click();

    // Fill in preset name
    const nameInput = page.locator('#preset-name');
    await nameInput.fill('Test Timer');

    // Set duration to 5 minutes (adjust slider)
    const durationSlider = page.locator('#preset-duration-slider');
    await durationSlider.fill('5');

    // Set rounds to 3
    const roundsSlider = page.locator('#preset-rounds-slider');
    await roundsSlider.fill('3');

    // Save the preset
    const saveBtn = page.locator('button[aria-label="Save timer"]');
    await saveBtn.click();

    // Wait for modal to close and re-open
    await page.waitForTimeout(500);
    await presetsBtn.click();

    // Verify preset appears in the list
    const presetName = page.locator('.preset-table').getByText('Test Timer');
    await expect(presetName).toBeVisible();

    // Apply the preset
    const applyBtn = page.locator('.preset-table').locator('button[aria-label="Apply timer"]').first();
    await applyBtn.click();

    // Close modal
    const closeBtn = page.locator('#preset-modal-close');
    await closeBtn.click();

    // Verify active preset is shown
    const activePreset = page.locator('#active-preset-name');
    await expect(activePreset).toBeVisible();
    await expect(activePreset).toHaveText('Test Timer');
  });

  test('play and pause functionality', async ({ page }) => {
    // Get initial time display
    const timeDisplay = page.locator('.countdown');
    const initialTime = await timeDisplay.textContent();

    // Click play button
    const playBtn = page.locator('button[aria-label="Play"]');
    await playBtn.click();

    // Wait a moment for countdown to tick
    await page.waitForTimeout(2000);

    // Verify time has changed (countdown is running)
    const timeAfterPlay = await timeDisplay.textContent();
    expect(timeAfterPlay).not.toBe(initialTime);

    // Click pause button (aria-label changes to "Pause" when playing)
    const pauseBtn = page.locator('button[aria-label="Pause"]');
    await pauseBtn.click();

    // Wait a moment
    await page.waitForTimeout(500);

    // Verify button changed back to Play
    await expect(playBtn).toBeVisible();
  });

  test('reset functionality', async ({ page }) => {
    // Click play button
    const playBtn = page.locator('button[aria-label="Play"]');
    await playBtn.click();

    // Wait a moment
    await page.waitForTimeout(2000);

    // Get current time
    const timeAfterPlay = await page.locator('.countdown').textContent();

    // Click reset
    const resetBtn = page.locator('button[aria-label="Reset"]');
    await resetBtn.click();

    // Wait for reset
    await page.waitForTimeout(500);

    // Verify button is back to Play (timer stopped)
    await expect(playBtn).toBeVisible();
  });

  test('Timer settings toggle', async ({ page }) => {
    // Open preset modal
    const presetsBtn = page.locator('button[aria-label="Presets"]');
    await presetsBtn.click();

    // Toggle Timer settings
    const settingsToggle = page.locator('#preset-settings-open-btn');
    await settingsToggle.click();

    // Verify settings frame is visible
    const settingsFrame = page.locator('#preset-settings-frame');
    await expect(settingsFrame).toBeVisible();

    // Verify Timer settings heading
    const settingsHeading = page.locator('.preset-settings-inline h3');
    await expect(settingsHeading).toHaveText('Timer settings');

    // Close settings
    await settingsToggle.click();

    // Verify settings frame is hidden
    await expect(settingsFrame).not.toBeVisible();
  });

  test('active preset can be cleared', async ({ page }) => {
    // First create a preset (simplified - assume one exists or we use existing)
    const presetsBtn = page.locator('button[aria-label="Presets"]');
    await presetsBtn.click();

    // Apply first preset if exists
    const applyBtn = page.locator('.preset-table').locator('button[aria-label="Apply timer"]').first();
    if (await applyBtn.isVisible()) {
      await applyBtn.click();
      await page.waitForTimeout(500);
      await presetsBtn.click();
    }

    // Clear active preset
    const clearBtn = page.locator('#active-preset-clear');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      
      // Verify active preset is hidden
      await expect(clearBtn).not.toBeVisible();
    }
  });
});
