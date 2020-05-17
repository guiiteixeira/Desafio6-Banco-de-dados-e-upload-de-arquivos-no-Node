import fs from 'fs';
import path from 'path';
import csvParse from 'csv-parse';
import { getCustomRepository, getRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import uploadConfig from '../config/uploadConfig';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface Request {
  filename: string;
}

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category_name: string;
}

class ImportTransactionsService {
  async execute({ filename }: Request): Promise<Transaction[]> {
    const csvFilePath = path.resolve(uploadConfig.directory, filename);
    const readCSVStream = fs.createReadStream(csvFilePath);

    const parseStream = csvParse({
      from_line: 2,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    const transactionsRequest: CSVTransaction[] = [];
    const categoriesRequest: string[] = [];

    parseCSV.on('data', line => {
      const [title, type, value, category_name] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      transactionsRequest.push({ title, type, value, category_name });
      categoriesRequest.push(category_name);
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategories = await categoryRepository.find({
      where: {
        title: In(categoriesRequest),
      },
    });

    const existentCategoriesTitle = existentCategories.map(
      existentCategory => existentCategory.title,
    );

    const addCategoryTitles = categoriesRequest.reduce(
      (unico: string[], item) => {
        return unico.includes(item) || existentCategoriesTitle.includes(item)
          ? unico
          : [...unico, item];
      },
      [],
    );

    const categories = categoryRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    const savedCategories = await categoryRepository.save(categories);

    const finalCategories = [...savedCategories, ...existentCategories];

    const createdTransactions = transactionRepository.create(
      transactionsRequest.map(transactionRequest => ({
        title: transactionRequest.title,
        type: transactionRequest.type,
        value: transactionRequest.value,
        category: finalCategories.find(
          category => category.title === transactionRequest.category_name,
        ),
      })),
    );

    const savedTransactions = await transactionRepository.save(
      createdTransactions,
    );

    await fs.promises.unlink(csvFilePath);

    return savedTransactions;
  }
}

export default ImportTransactionsService;
