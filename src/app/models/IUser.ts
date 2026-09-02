export interface IUser {
  id?: number;
  role: 'admin' | 'user';
  email: string;
}
