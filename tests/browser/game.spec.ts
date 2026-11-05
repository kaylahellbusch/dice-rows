import { test, expect } from "@playwright/test";
import { gameServer } from "../../server/index";
test("two windows host, join, reconnect, mark, lock and finish on mobile", async ({
  browser,
}) => {
  const sums = [2, 3, 4, 5, 6, 12, 2, 3, 4, 5, 6, 12];
  let turn = 0;
  const server = gameServer(3001, () => {
    const sum = sums[turn++];
    return sum === 12 ? [6, 6, 1, 1, 1, 1] : [1, sum - 1, 1, 1, 1, 1];
  });
  const mobile = await browser.newContext({
      viewport: { width: 375, height: 812 },
    }),
    desktop = await browser.newContext({
      viewport: { width: 1100, height: 850 },
    });
  const a = await mobile.newPage(),
    b = await desktop.newPage();
  const shots = "docs/screenshots/";
  try {
    await a.goto("/");
    await b.goto("/");
    await a.getByLabel("Your name").fill("River");
    await a.getByRole("button", { name: "Host game" }).click();
    await expect(a.locator(".game-code")).toBeVisible();
    await a.screenshot({ path: shots + "lobby-before.png", fullPage: true });
    const code = await a.locator(".game-code").innerText();
    await b.getByLabel("Your name").fill("Sky");
    await b.getByLabel("Game code").fill(code);
    await b.getByRole("button", { name: "Join game" }).click();
    await expect(a.getByText("Sky", { exact: true })).toBeVisible();
    await a.screenshot({ path: shots + "lobby-after.png", fullPage: true });
    await a.reload();
    await expect(a.getByText("Sky", { exact: true })).toBeVisible();
    await a.getByRole("button", { name: "Start game" }).click();
    for (let i = 0; i < 12; i++) {
      const active = i % 2 === 0 ? a : b;
      await expect(
        active.getByRole("button", { name: "Roll dice" }),
      ).toBeEnabled();
      await expect(
        (i % 2 === 0 ? b : a).getByRole("button", { name: "Roll dice" }),
      ).toBeDisabled();
      await active.getByRole("button", { name: "Roll dice" }).click();
      const color = i < 6 ? "red" : "yellow",
        n = sums[i];
      await expect(
        a.getByRole("button", { name: `${color} ${n}`, exact: true }),
      ).toBeEnabled();
      if (i === 0) {
        await a.screenshot({ path: shots + "turn-before.png", fullPage: true });
        const box = a.getByRole("button", { name: "red 2", exact: true });
        await box.click();
        await expect(a.locator(".selected")).toHaveCount(1);
        await a.locator(".turn-heading").click();
        await expect(a.locator(".selected")).toHaveCount(0);
      }
      for (const page of [a, b]) {
        const box = page.getByRole("button", {
          name: `${color} ${n}`,
          exact: true,
        });
        await box.scrollIntoViewIfNeeded();
        await box.click();
        await page
          .getByRole("button", {
            name: `${color} ${n} tap again to confirm`,
            exact: true,
          })
          .click();
        await expect(
          page.getByRole("button", {
            name: `${color} ${n} marked`,
            exact: true,
          }),
        ).toBeVisible();
      }
      if (i === 0)
        await a.screenshot({ path: shots + "turn-after.png", fullPage: true });
      if (i === 11)
        await a.screenshot({ path: shots + "end-before.png", fullPage: true });
      await a.getByRole("button", { name: "Confirm marks" }).click();
      await expect(
        a.getByText("Your choices are confirmed. Waiting for the table."),
      ).toBeVisible();
      await b.getByRole("button", { name: "Confirm marks" }).click();
      if (i === 5) {
        await expect(a.locator(".row.red")).toHaveClass(/locked/);
        await (i % 2 === 0 ? b : a)
          .getByRole("button", { name: "Roll dice" })
          .waitFor();
      }
    }
    await expect(a.getByText("Every mark")).toBeVisible();
    await expect(b.getByText("Every mark")).toBeVisible();
    await expect(a.locator(".winner")).toHaveCount(2);
    await expect(a.locator(".equation").first()).toContainText("56");
    await a.screenshot({ path: shots + "end-after.png", fullPage: true });
    expect(
      await a.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await mobile.close();
    await desktop.close();
    server.close();
  }
});
