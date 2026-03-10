export interface TransactionResponse {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  currency: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}
