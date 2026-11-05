import { COLORS, rowNumbers, type Player, type RowColor } from "./rules";
export function scoreRow(marks: number[] | number, color?: RowColor): number {
  const count =
    typeof marks === "number"
      ? marks
      : marks.length + (color && marks.includes(rowNumbers(color)[10]) ? 1 : 0);
  return (count * (count + 1)) / 2;
}
export function scoreTotal(player: Player): number {
  return (
    COLORS.reduce((s, c) => s + scoreRow(player.board[c], c), 0) -
    player.penalties * 5
  );
}
