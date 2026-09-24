export type AuthUser = {
  id: number;
  email: string;
  displayName: string;
  role: 'LEARNER' | 'ADMIN';
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = LoginInput & {
  displayName: string;
};
