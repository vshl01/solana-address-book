import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { Contact, ContactType } from "./types";
import { contacts } from "./store";

export function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== "string") {
    return false;
  }
  try {
    const decoded = bs58.decode(address);
    if (decoded.length !== 32) {
      return false;
    }
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export function detectAddressType(address: string): ContactType {
  try {
    const pubkey = new PublicKey(address);
    const isOnCurve = PublicKey.isOnCurve(pubkey.toBytes());
    return isOnCurve ? "wallet" : "pda";
  } catch {
    throw new Error("Invalid address for type detection");
  }
}

export function isValidName(name: any): boolean {
  return typeof name === "string" && name.trim().length > 0;
}

export function findContactByAddress(address: string): Contact | undefined {
  return contacts.find((c) => c.address === address);
}

export function findContactById(id: number): Contact | undefined {
  return contacts.find((c) => c.id === id);
}
