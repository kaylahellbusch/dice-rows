import {test,expect,type Browser,type Page} from '@playwright/test';
async function table(browser:Browser,page:Page){
 await page.goto('/');await page.getByLabel('Your name').fill('Avery');await page.getByRole('button',{name:'Host game'}).click();const code=await page.locator('.game-code').innerText();
 const friend=await browser.newPage({viewport:{width:375,height:812}});await friend.goto('/');await friend.getByLabel('Your name').fill('Morgan');await friend.getByLabel('Game code').fill(code);await friend.getByRole('button',{name:'Join game'}).click();
 await expect(page.locator('.players')).toContainText('Morgan');await page.getByRole('button',{name:'Start game'}).click();await expect(friend.getByRole('heading',{name:'Avery’s turn.'})).toBeVisible();return friend;
}
test('waits for every player before next turn',async({browser,page})=>{
 const friend=await table(browser,page);await expect(friend.getByRole('button',{name:'Waiting for the roll…'})).toBeDisabled();await page.getByRole('button',{name:'Roll dice'}).click();await page.getByRole('button',{name:'No number'}).click();
 await expect(page.getByRole('button',{name:'Waiting for everyone…'})).toBeDisabled();await expect(friend.getByRole('button',{name:'No number'})).toBeVisible();await expect(page.getByRole('heading',{name:'Your turn to roll.'})).toBeVisible();await friend.getByRole('button',{name:'No number'}).click();await expect(friend.getByRole('button',{name:'Roll dice'})).toBeEnabled();await expect(page.locator('.your-card .section-label')).toContainText('1/4 penalties');await expect(friend.locator('.your-card .section-label')).toContainText('0/4 penalties');await friend.close();
});
test('shows end screen',async({browser,page})=>{
 const friend=await table(browser,page);await page.getByRole('button',{name:'Roll dice'}).click();await expect(friend.getByRole('button',{name:'No number'})).toBeVisible();await page.screenshot({path:'docs/screenshots/scorecard-start.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.locator('.row-scroll').evaluateAll(rows=>rows.forEach(row=>{row.scrollLeft=row.scrollWidth}));await page.screenshot({path:'docs/screenshots/scorecard-end.png',fullPage:true});
 for(let turn=0;turn<7;turn++){const active=turn%2===0?page:friend;if(turn>0)await active.getByRole('button',{name:'Roll dice'}).click();await page.getByRole('button',{name:'No number'}).click();await friend.getByRole('button',{name:'No number'}).click();}
 for(const phone of [page,friend])await expect(phone.getByRole('heading',{name:'That’s a wrap.'})).toBeVisible();await page.screenshot({path:'docs/screenshots/end.png',fullPage:true});await friend.close();
});
test('marks on second tap and shows server rejection without changing boards',async({browser,page})=>{
 const friend=await table(browser,page);await page.getByRole('button',{name:'Roll dice'}).click();
 const legal=page.locator('.number:enabled').first();
 // A roll containing only a last number is rare; the active color combinations still offer legal choices.
 await expect(legal).toBeEnabled();const label=await legal.getAttribute('aria-label');
 await legal.click();await expect(legal).toHaveAttribute('aria-pressed','true');await expect(page.locator('.number.marked')).toHaveCount(0);
 await legal.click();await expect(page.getByRole('button',{name:`${label} marked`,exact:true})).toBeVisible();await expect(page.locator('.score-footer')).toContainText('= 1');
 await page.getByRole('button',{name:'Confirm marks'}).click();await friend.getByRole('button',{name:'No number'}).click();await friend.getByRole('button',{name:'Roll dice'}).click();
 const beforeHost=await page.locator('.your-card').textContent(),beforeFriend=await friend.locator('.your-card').textContent();
 await friend.route('**/api/action',async route=>{const body=route.request().postDataJSON();await route.continue({postData:JSON.stringify(body.type==='mark'?{...body,number:99}:body)});});
 const target=friend.locator('.number:enabled').first();await target.click();await target.click();await expect(friend.getByRole('alert')).toBeVisible();
 await expect(page.locator('.your-card')).toHaveText(beforeHost!);await expect(friend.locator('.your-card')).toHaveText(beforeFriend!);await friend.close();
});
