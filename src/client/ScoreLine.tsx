import React from 'react';
import type { Player, RowColor } from '../shared/rules';
import {scoreRow} from '../shared/score';
const colors: RowColor[] = ['red','yellow','blue','green'];
export function ScoreLine({player}: {player: Player}) {
 const points=colors.map(c=>scoreRow(player.board[c],c));
 const total=points.reduce((a,b)=>a+b,0)-player.penalties*5;
 return <div className="score-line" aria-label={`Score ${total}`}>{points.map((p,i)=><React.Fragment key={colors[i]}>{i>0&&<span> + </span>}<span className={`points ${colors[i]}`}>{p}</span></React.Fragment>)}{player.penalties>0&&<span> − {player.penalties*5}</span>}<span> = </span><strong>{total}</strong></div>
}
