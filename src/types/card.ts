import { EmployeeSummaryResponse } from './employee';

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
