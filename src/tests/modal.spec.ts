import { test, expect } from '@chromatic-com/playwright';

test.describe('Modal - Add Entitlement', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page
    await page.goto('http://localhost:3000');
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should open modal when "Add Entitlement" button is clicked', async ({ page }) => {
    // The modal should not be visible initially
    const modal = page.locator('[role="dialog"]');
    await expect(modal).not.toBeVisible();

    // Click the "Add Entitlement" button
    const addButton = page.locator('button:has-text("Add Entitlement")');
    await addButton.click();

    // The modal should now be visible
    await expect(modal).toBeVisible();
  });

  test('should display modal title correctly', async ({ page }) => {
    // Click the "Add Entitlement" button
    const addButton = page.locator('button:has-text("Add Entitlement")');
    await addButton.click();

    // Check the modal title
    const modalTitle = page.locator('h2', { hasText: 'Create New Entitlement' });
    await expect(modalTitle).toBeVisible();
  });

  test('should close modal when close button is clicked', async ({ page }) => {
    // Click the "Add Entitlement" button to open modal
    const addButton = page.locator('button:has-text("Add Entitlement")');
    await addButton.click();

    // Modal should be visible
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Click the close button (×)
    const closeButton = page.locator('button[aria-label="Close modal"]');
    await closeButton.click();

    // Modal should no longer be visible
    await expect(modal).not.toBeVisible();
  });

  test('should close modal when Cancel button is clicked', async ({ page }) => {
    // Click the "Add Entitlement" button to open modal
    const addButton = page.locator('button:has-text("Add Entitlement")');
    await addButton.click();

    // Modal should be visible
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Click the Cancel button
    const cancelButton = page.locator('button', { hasText: 'Cancel' });
    await cancelButton.click();

    // Modal should no longer be visible
    await expect(modal).not.toBeVisible();
  });

  test('should close modal when backdrop is clicked', async ({ page }) => {
    // Click the "Add Entitlement" button to open modal
    const addButton = page.locator('button:has-text("Add Entitlement")');
    await addButton.click();

    // Modal should be visible
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Click on the backdrop (outside the modal)
    const modalBox = await modal.boundingBox();
    
    if (modalBox) {
      // Click outside the modal (on the backdrop)
      await page.click(
        `div[style*="position: fixed"]`,
        { position: { x: 10, y: 10 } }
      );
    }

    // Modal should no longer be visible
    await expect(modal).not.toBeVisible();
  });

  test('should display form inside the modal', async ({ page }) => {
    // Click the "Add Entitlement" button to open modal
    const addButton = page.locator('button:has-text("Add Entitlement")');
    await addButton.click();

    // Check that form elements are visible
    await expect(page.locator('input[name="sku"]')).toBeVisible();
    await expect(page.locator('input[name="product_type"]')).toBeVisible();
    await expect(page.locator('input[name="start_date"]')).toBeVisible();
    await expect(page.locator('input[name="end_date"]')).toBeVisible();
    await expect(page.locator('input[name="quantity"]')).toBeVisible();
    await expect(page.locator('select[name="status"]')).toBeVisible();
  });

  test('should display submit button in the modal', async ({ page }) => {
    // Click the "Add Entitlement" button to open modal
    const addButton = page.locator('button:has-text("Add Entitlement")');
    await addButton.click();

    // Check that the submit button is visible
    const submitButton = page.locator('button', { hasText: 'Create Entitlement' });
    await expect(submitButton).toBeVisible();
  });
});
