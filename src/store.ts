import { Contact } from "./types";

export let contacts: Contact[] = [];
export let nextId = 1;

export function incrementId(): number {
  return nextId++;
}

export function resetStore(): void {
  contacts = [];
  nextId = 1;
}
