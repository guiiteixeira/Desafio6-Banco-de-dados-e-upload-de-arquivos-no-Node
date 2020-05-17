export default class Balance {
  income: number;

  outcome: number;

  total: number;

  constructor(income: number, outcome: number) {
    this.income = income;
    this.outcome = outcome;
    this.total = income - outcome;
  }
}
