export type ContactType = "wallet" | "pda";

export interface Contact {
  id: number;
  name: string;
  address: string;
  type: ContactType;
  createdAt: string;
}
