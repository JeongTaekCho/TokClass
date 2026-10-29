/** 피셔-예이츠 셔플 후 순서대로 조에 배정 (인원 차이 최대 1명) */
export function distribute<T>(items: T[], groupCount: number, random: () => number = Math.random): T[][] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  const out: T[][] = Array.from({ length: groupCount }, () => []);
  arr.forEach((item, i) => out[i % groupCount]!.push(item));
  return out;
}
