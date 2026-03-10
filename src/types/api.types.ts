export interface CompanyResponse {
  id: string;
  name: string;
}

export interface EmployeeResponse {
  id: string;
  name: string;
  email: string;
  companyId: string;
}

export interface EmployeeSummaryResponse {
  id: string;
  name: string;
}

export interface CardResponse {
  id: string;
  status: string;
  market: string;
  currency: string;
  creditLimit: number;
  amountSpent: number;
  remainingSpend: number;
  employee?: EmployeeSummaryResponse;
}

export interface InvoiceResponse {
  id: string;
  amount: number;
  dueDate: string;
  status: string;
  market: string;
  currency: string;
}

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
