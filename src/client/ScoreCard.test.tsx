// @vitest-environment jsdom
import React from 'react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {cleanup,render,screen,fireEvent,within} from '@testing-library/react';
import {createGame,joinGame,startGame,rollDice} from '../shared/rules';
import {ScoreCard} from './ScoreCard';
afterEach(cleanup);
function game(){return rollDice(startGame(joinGame(createGame('123456',{id:'a',name:'Alice'}),{id:'b',name:'Bob'}),'a'),'a',()=>.4)}
describe('ScoreCard',()=>{
 it('renders rows in order and direction',()=>{render(<ScoreCard game={game()} playerId="a" onMark={()=>{}}/>);const rows=screen.getAllByRole('region');expect(rows.map(r=>r.getAttribute('aria-label'))).toEqual(['red row','yellow row','blue row','green row']);expect(within(rows[0]).getAllByRole('button').map(x=>x.textContent)).toEqual(['2','3','4','5','6','7','8','9','10','11','12']);expect(within(rows[2]).getAllByRole('button').map(x=>x.textContent)).toEqual(['12','11','10','9','8','7','6','5','4','3','2']);expect(screen.getByLabelText('red lock').parentElement).toBe(screen.getByLabelText('red 12').parentElement)});
 it('marks on second tap',()=>{const mark=vi.fn();render(<ScoreCard game={game()} playerId="a" onMark={mark}/>);const button=screen.getByRole('button',{name:'red 6'});fireEvent.click(button);expect(mark).not.toHaveBeenCalled();expect(button.getAttribute('aria-pressed')).toBe('true');fireEvent.click(button);expect(mark).toHaveBeenCalledWith('red',6,'white')});
 it('cancels on outside tap',()=>{const mark=vi.fn();render(<ScoreCard game={game()} playerId="a" onMark={mark}/>);const button=screen.getByRole('button',{name:'red 6'});fireEvent.click(button);fireEvent.click(document.body);expect(button.getAttribute('aria-pressed')).toBe('false');fireEvent.click(button);expect(mark).not.toHaveBeenCalled()});
});
