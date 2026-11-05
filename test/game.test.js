import test from 'node:test';
import assert from 'node:assert/strict';
import { player, room, act, legal, options, score, points, COLORS } from '../game.js';
function setup(count = 2) { const g = room('123456', player('a', 'Alice')); if (count === 2) g.players.push(player('b', 'Bob')); act(g, 'a', { type: 'start' }); return g; }
function roll(g, dice = [2,5,6,3,4,1]) { let i = 0; act(g, g.players[g.active].id, { type: 'roll' }, () => dice[i++]); }
const pass = (g, id) => act(g, id, { type: 'choose', skip: true });
test('white sum available to everyone; colored pair only to active player afterward', () => {
  const g = setup(); roll(g);
  assert.ok(options(g, g.players[1]).some(o => o.value === 7 && o.color === 'red'));
  assert.throws(() => act(g, 'a', { type:'choose', color:'red', value:8 }));
  act(g,'a',{type:'choose',color:'yellow',value:7});
  assert.equal(g.phase,'white'); assert.throws(() => pass(g,'a'));
  pass(g,'b'); assert.equal(g.phase,'color');
  assert.deepEqual(options(g,g.players[0]).filter(o=>o.color==='red').map(o=>o.value),[8,11]);
  assert.throws(() => pass(g,'b'));
  act(g,'a',{type:'choose',color:'red',value:11}); assert.equal(g.active,1); assert.equal(g.players[0].penalties,0);
});
test('left-to-right works in ascending and descending rows; final needs five earlier marks', () => {
  const g=setup();const p=g.players[0];p.rows.red.marks=[5];p.rows.blue.marks=[9];
  assert.equal(legal(g,p,'red',4),false);assert.equal(legal(g,p,'red',6),true);
  assert.equal(legal(g,p,'blue',10),false);assert.equal(legal(g,p,'blue',8),true);
  assert.equal(legal(g,p,'red',12),false);p.rows.red.marks=[2,3,4,5,6];assert.equal(legal(g,p,'red',12),true);
  assert.equal(legal(g,p,'blue',2),false);p.rows.blue.marks=[12,11,10,9,8];assert.equal(legal(g,p,'blue',2),true);
});
test('white locks settle after every response; terminal and lock both score and die retires', () => {
 const g=setup();g.players.forEach(p=>p.rows.red.marks=[2,3,4,5,6]);roll(g,[6,6,3,2,2,2]);
 act(g,'a',{type:'choose',color:'red',value:12});assert.equal(g.locked.length,0);
 act(g,'b',{type:'choose',color:'red',value:12});assert.deepEqual(g.locked,['red']);assert.equal(score(g.players[0]),28);
 pass(g,'a');roll(g);assert.equal(g.dice.red,undefined);assert.equal(options(g,g.players[0]).some(o=>o.color==='red'),false);
});
test('only active player takes penalty; any one mark avoids it', () => {
 const g=setup();roll(g);pass(g,'a');pass(g,'b');pass(g,'a');assert.equal(g.players[0].penalties,1);assert.equal(g.players[1].penalties,0);
 roll(g);pass(g,'a');pass(g,'b');act(g,'b',{type:'choose',color:'red',value:8});assert.equal(g.players[1].penalties,0);
});
test('four penalties finish game and reject further rolls',()=>{
 const g=setup(1);for(let i=0;i<4;i++){roll(g);pass(g,'a');pass(g,'a');}
 assert.equal(g.status,'finished');assert.equal(score(g.players[0]),-20);assert.throws(()=>roll(g));
});
test('second global lock ends at turn completion, ties and scoring remain intact',()=>{
 const g=setup(1);g.players[0].rows.red={marks:[2,3,4,5,6,12],locked:true};g.locked=['red'];g.players[0].rows.blue.marks=[12,11,10,9,8];
 roll(g,[1,1,1,1,1]);act(g,'a',{type:'choose',color:'blue',value:2});assert.equal(g.status,'playing');pass(g,'a');assert.equal(g.status,'finished');assert.equal(score(g.players[0]),56);
});
test('all triangular scores and example total',()=>{
 assert.deepEqual(Array.from({length:12},(_,i)=>points(i+1)),[1,3,6,10,15,21,28,36,45,55,66,78]);
 const p=player('a','A');[2,6,3,4].forEach((n,i)=>p.rows[COLORS[i]].marks=Array.from({length:n},(_,j)=>j+2));assert.equal(score(p),40);
});
test('host, turn ownership, invalid choices and double submission are guarded',()=>{
 const g=room('123456',player('a','A'));g.players.push(player('b','B'));assert.throws(()=>act(g,'b',{type:'start'}));act(g,'a',{type:'start'});
 assert.throws(()=>act(g,'b',{type:'roll'}));roll(g);assert.throws(()=>act(g,'a',{type:'choose',color:'pink',value:7}));assert.throws(()=>act(g,'nobody',{type:'choose',skip:true}));
});
