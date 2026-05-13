export interface Employees {
  id?: string;
  email: string;
  name: string;
  password: string;
  image: string | File | null;
  role?: string;
  bankCode?: number | null;
  bank?: string;
  lastLogin?: Date | null;
  isLocked?: boolean;
  hoursWorked?: number;
  hourlyRate?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
