export type ApiUser = {
  id: number | string;
  email?: string;
  username?: string; // server may still return it
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  national_id?: string;
  status?: string; // "active" | "inactive" | "suspended" | ...
  groups?: Array<{ name: string } | string>;
  created_at?: string;
  date_joined?: string;
};

export type UserRow = {
  id: number | string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationalId: string;
  roles: string[];
  status: string;
};

export type EditForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  national_id: string;
  status: string;
  group: string;
};

export type NewUserForm = {
  first_name: string;
  last_name: string;
  email: string; // used as username
  password?: string; // optional password for login account
  phone_number: string;
  national_id: string;
  group: string; // single-select for create
  createLoginAccount?: boolean; // whether to create a login account
};

