export const ukupnoProdajno = (kolicina: number, prodajna: number) =>
  kolicina * prodajna;

export const ukupnoNabavno = (kolicina: number, nabavna: number) =>
  kolicina * nabavna;

export const profit = (prodajnoUkupno: number, nabavnoUkupno: number, transportCost = 0) =>
  prodajnoUkupno - nabavnoUkupno - transportCost;

export const myProfitShare = (profitValue: number, percent: number) =>
  profitValue * (Math.min(Math.max(percent, 0), 100) / 100);
