export const ukupnoProdajno = (kolicina: number, prodajna: number) =>
  kolicina * prodajna;

export const ukupnoNabavno = (kolicina: number, nabavna: number) =>
  kolicina * nabavna;

export const profit = (prodajnoUkupno: number, nabavnoUkupno: number) =>
  prodajnoUkupno - nabavnoUkupno;
