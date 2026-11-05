import {test,expect} from '@playwright/test';
test('hosts and joins by code',async({browser,page})=>{
 await page.goto('/');await page.getByLabel('Your name').fill('Avery');await page.getByRole('button',{name:'Host game'}).click();
 const code=await page.locator('.game-code').innerText();expect(code).toMatch(/^\d{6}$/);
 const friend=await browser.newPage({viewport:{width:375,height:812}});await friend.goto('/');await friend.getByLabel('Your name').fill('Morgan');await friend.getByLabel('Game code').fill(code);await friend.getByRole('button',{name:'Join game'}).click();
 for(const phone of [page,friend]){await expect(phone.locator('.players')).toContainText('Avery');await expect(phone.locator('.players')).toContainText('Morgan');}
 await page.screenshot({path:'docs/screenshots/lobby.png',fullPage:true});await friend.close();
});
test('disables join without a name',async({page})=>{await page.goto('/');await page.getByLabel('Game code').fill('123456');await expect(page.getByRole('button',{name:'Join game'})).toBeDisabled();await page.getByLabel('Your name').fill('   ');await expect(page.getByRole('button',{name:'Join game'})).toBeDisabled();});
test('rejects unknown code',async({page})=>{await page.goto('/');await page.getByLabel('Your name').fill('Avery');await page.getByLabel('Game code').fill('000000');await page.getByRole('button',{name:'Join game'}).click();await expect(page.getByRole('alert')).toHaveText('No game with that code');});
