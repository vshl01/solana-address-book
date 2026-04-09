import { Router, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { contacts, incrementId } from "../store";
import {
  isValidSolanaAddress,
  isValidName,
  detectAddressType,
  findContactByAddress,
  findContactById,
} from "../utils";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "../constants";
import { Contact } from "../types";

const router = Router();

// POST /api/contacts — Add a contact
router.post("/", (req: Request, res: Response) => {
  try {
    const { name, address } = req.body;

    if (!name || !address) {
      return res
        .status(400)
        .json({ error: "Missing required fields: name and address" });
    }

    if (!isValidName(name)) {
      return res
        .status(400)
        .json({ error: "Invalid name: must be a non-empty string" });
    }

    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({
        error:
          "Invalid address: must be a valid base58-encoded 32-byte Solana public key",
      });
    }

    if (findContactByAddress(address)) {
      return res.status(409).json({ error: "Address already exists" });
    }

    const type = detectAddressType(address);

    const contact: Contact = {
      id: incrementId(),
      name: name.trim(),
      address,
      type,
      createdAt: new Date().toISOString(),
    };

    contacts.push(contact);

    return res.status(201).json(contact);
  } catch {
    return res.status(400).json({ error: "Invalid request" });
  }
});

// GET /api/contacts — List all contacts
router.get("/", (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    let result = contacts;

    if (type) {
      if (type !== "wallet" && type !== "pda") {
        return res
          .status(400)
          .json({ error: "Invalid type: must be 'wallet' or 'pda'" });
      }
      result = contacts.filter((c) => c.type === type);
    }

    result = [...result].sort((a, b) => a.id - b.id);

    return res.status(200).json(result);
  } catch {
    return res.status(400).json({ error: "Invalid request" });
  }
});

// GET /api/contacts/:id — Get a contact by ID
router.get("/:id", (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id < 1) {
      return res.status(404).json({ error: "Contact not found" });
    }

    const contact = findContactById(id);

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    return res.status(200).json(contact);
  } catch {
    return res.status(404).json({ error: "Contact not found" });
  }
});

// PUT /api/contacts/:id — Update a contact's name
router.put("/:id", (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body;

    if (isNaN(id) || id < 1) {
      return res.status(404).json({ error: "Contact not found" });
    }

    if (!name) {
      return res.status(400).json({ error: "Missing required field: name" });
    }

    if (!isValidName(name)) {
      return res
        .status(400)
        .json({ error: "Invalid name: must be a non-empty string" });
    }

    const contact = findContactById(id);

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    contact.name = name.trim();

    return res.status(200).json(contact);
  } catch {
    return res.status(400).json({ error: "Invalid request" });
  }
});

// DELETE /api/contacts/:id — Delete a contact
router.delete("/:id", (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id < 1) {
      return res.status(404).json({ error: "Contact not found" });
    }

    const index = contacts.findIndex((c) => c.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Contact not found" });
    }

    contacts.splice(index, 1);

    return res.status(200).json({ message: "Contact deleted" });
  } catch {
    return res.status(404).json({ error: "Contact not found" });
  }
});

// POST /api/contacts/:id/derive-ata — Derive Associated Token Account
router.post("/:id/derive-ata", (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { mintAddress } = req.body;

    if (isNaN(id) || id < 1) {
      return res.status(404).json({ error: "Contact not found" });
    }

    const contact = findContactById(id);

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    if (!mintAddress) {
      return res
        .status(400)
        .json({ error: "Missing required field: mintAddress" });
    }

    if (!isValidSolanaAddress(mintAddress)) {
      return res.status(400).json({ error: "Invalid mint address" });
    }

    const ownerPubkey = new PublicKey(contact.address);
    const mintPubkey = new PublicKey(mintAddress);

    const [ata] = PublicKey.findProgramAddressSync(
      [
        ownerPubkey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintPubkey.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    return res.status(200).json({
      ata: ata.toBase58(),
      owner: contact.address,
      mint: mintAddress,
    });
  } catch {
    return res.status(400).json({ error: "Invalid mint address" });
  }
});

export default router;
