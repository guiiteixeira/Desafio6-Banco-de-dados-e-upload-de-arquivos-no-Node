import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';
import Balance from '../models/Balance';

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    let { income } = await this.createQueryBuilder('transaction')
      .select('SUM(transaction.value)', 'income')
      .where('transaction.type = :type', { type: 'income' })
      .getRawOne();

    let { outcome } = await this.createQueryBuilder('transaction')
      .select('SUM(transaction.value)', 'outcome')
      .where('transaction.type = :type', { type: 'outcome' })
      .getRawOne();

    if (!income) {
      income = 0;
    }
    if (!outcome) {
      outcome = 0;
    }

    const balance = new Balance(parseFloat(income), parseFloat(outcome));

    return balance;
  }
}

export default TransactionsRepository;
