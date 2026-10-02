import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should render the login page', async ({ page }) => {
    await page.goto('/');
    
    // Check if critical elements are visible
    await expect(page.getByRole('button', { name: /login|sign in|continue/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    await page.locator('input[type="email"]').fill('invalid@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword123');
    await page.getByRole('button', { name: /login|sign in|continue/i }).click();

    // Since it's a test against a real DB (or missing one), it should either show an error or just fail
    // This expects some sort of generic error message to appear (toast or inline)
    // We wait for either a known error state or navigation to fail
    await expect(page.getByText(/invalid|incorrect|error|failed/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('should respect middleware protected routes', async ({ page }) => {
    // Attempting to go directly to admin dashboard unauthenticated
    const response = await page.goto('/admin');
    
    // Middleware should redirect back to login
    await expect(page).toHaveURL(/.*callbackUrl=%2Fadmin/);
  });
});
