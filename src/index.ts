import express, { Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

const app = express();
app.use(express.json());

// Constants
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);

// Types
type ContactType = "wallet" | "pda";

interface Contact {
  id: number;
  name: string;
  address: string;
  type: ContactType;
  createdAt: string;
}

// In-memory storage
let contacts: Contact[] = [];
let nextId = 1;

// Utility Functions

/**
 * Validates if a string is a valid Solana public key (base58-encoded 32-byte address)
 */
function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== "string") {
    return false;
  }

  try {
    // Attempt to decode base58
    const decoded = bs58.decode(address);

    // Must be exactly 32 bytes
    if (decoded.length !== 32) {
      return false;
    }

    // Try creating PublicKey to validate further
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Determines if an address is a wallet (on-curve) or PDA (off-curve)
 */
function detectAddressType(address: string): ContactType {
  try {
    const pubkey = new PublicKey(address);
    // Check if the public key is on the Ed25519 curve
    const isOnCurve = PublicKey.isOnCurve(pubkey.toBytes());
    return isOnCurve ? "wallet" : "pda";
  } catch (error) {
    throw new Error("Invalid address for type detection");
  }
}

/**
 * Validates contact name
 */
function isValidName(name: any): boolean {
  return typeof name === "string" && name.trim().length > 0;
}

/**
 * Finds a contact by address
 */
function findContactByAddress(address: string): Contact | undefined {
  return contacts.find((c) => c.address === address);
}

/**
 * Finds a contact by ID
 */
function findContactById(id: number): Contact | undefined {
  return contacts.find((c) => c.id === id);
}

// API Endpoints

/**
 * POST /api/contacts — Add a contact
 */
app.post("/api/contacts", (req: Request, res: Response) => {
  try {
    const { name, address } = req.body;

    // Validate required fields
    if (!name || !address) {
      return res
        .status(400)
        .json({ error: "Missing required fields: name and address" });
    }

    // Validate name
    if (!isValidName(name)) {
      return res
        .status(400)
        .json({ error: "Invalid name: must be a non-empty string" });
    }

    // Validate address
    if (!isValidSolanaAddress(address)) {
      return res
        .status(400)
        .json({
          error:
            "Invalid address: must be a valid base58-encoded 32-byte Solana public key",
        });
    }

    // Check for duplicate address
    if (findContactByAddress(address)) {
      return res.status(409).json({ error: "Address already exists" });
    }

    // Auto-detect type
    const type = detectAddressType(address);

    // Create contact
    const contact: Contact = {
      id: nextId++,
      name: name.trim(),
      address,
      type,
      createdAt: new Date().toISOString(),
    };

    contacts.push(contact);

    return res.status(201).json(contact);
  } catch (error) {
    return res.status(400).json({ error: "Invalid request" });
  }
});

/**
 * GET /api/contacts — List all contacts
 */
app.get("/api/contacts", (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    let result = contacts;

    // Filter by type if provided
    if (type) {
      if (type !== "wallet" && type !== "pda") {
        return res
          .status(400)
          .json({ error: "Invalid type: must be 'wallet' or 'pda'" });
      }
      result = contacts.filter((c) => c.type === type);
    }

    // Sort by id ascending
    result = [...result].sort((a, b) => a.id - b.id);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: "Invalid request" });
  }
});

/**
 * GET /api/contacts/:id — Get a contact by ID
 */
app.get("/api/contacts/:id", (req: Request, res: Response) => {
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
  } catch (error) {
    return res.status(404).json({ error: "Contact not found" });
  }
});

/**
 * PUT /api/contacts/:id — Update a contact's name
 */
app.put("/api/contacts/:id", (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body;

    if (isNaN(id) || id < 1) {
      return res.status(404).json({ error: "Contact not found" });
    }

    // Validate name
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

    // Update name
    contact.name = name.trim();

    return res.status(200).json(contact);
  } catch (error) {
    return res.status(400).json({ error: "Invalid request" });
  }
});

/**
 * DELETE /api/contacts/:id — Delete a contact
 */
app.delete("/api/contacts/:id", (req: Request, res: Response) => {
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
  } catch (error) {
    return res.status(404).json({ error: "Contact not found" });
  }
});

/**
 * POST /api/contacts/:id/derive-ata — Derive Associated Token Account
 */
app.post("/api/contacts/:id/derive-ata", (req: Request, res: Response) => {
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

    // Validate mint address
    if (!mintAddress) {
      return res
        .status(400)
        .json({ error: "Missing required field: mintAddress" });
    }

    if (!isValidSolanaAddress(mintAddress)) {
      return res.status(400).json({ error: "Invalid mint address" });
    }

    // Derive ATA
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
  } catch (error) {
    return res.status(400).json({ error: "Invalid mint address" });
  }
});

/**
 * POST /api/verify-ownership — Verify ed25519 signature
 */
app.post("/api/verify-ownership", (req: Request, res: Response) => {
  try {
    const { address, message, signature } = req.body;

    // Validate required fields
    if (!address || !message || !signature) {
      return res
        .status(400)
        .json({
          error: "Missing required fields: address, message, and signature",
        });
    }

    // Validate types
    if (
      typeof address !== "string" ||
      typeof message !== "string" ||
      typeof signature !== "string"
    ) {
      return res.status(400).json({ error: "Invalid input types" });
    }

    // Validate address
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ error: "Invalid address" });
    }

    // Decode address and signature
    let publicKeyBytes: Uint8Array;
    let signatureBytes: Uint8Array;

    try {
      publicKeyBytes = bs58.decode(address);
    } catch (error) {
      return res.status(400).json({ error: "Invalid address encoding" });
    }

    try {
      signatureBytes = bs58.decode(signature);
    } catch (error) {
      return res.status(400).json({ error: "Invalid signature encoding" });
    }

    // Signature must be 64 bytes for ed25519
    if (signatureBytes.length !== 64) {
      return res.status(200).json({ valid: false });
    }

    // Convert message to UTF-8 bytes
    const messageBytes = new TextEncoder().encode(message);

    // Verify signature
    const valid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes,
    );

    return res.status(200).json({ valid });
  } catch (error) {
    return res.status(400).json({ error: "Invalid inputs" });
  }
});

/**
 * POST /api/derive-pda — Derive a PDA
 */
app.post("/api/derive-pda", (req: Request, res: Response) => {
  try {
    const { programId, seeds } = req.body;

    // Validate required fields
    if (!programId) {
      return res
        .status(400)
        .json({ error: "Missing required field: programId" });
    }

    if (!seeds) {
      return res.status(400).json({ error: "Missing required field: seeds" });
    }

    // Validate programId
    if (!isValidSolanaAddress(programId)) {
      return res.status(400).json({ error: "Invalid programId" });
    }

    // Validate seeds array
    if (!Array.isArray(seeds)) {
      return res.status(400).json({ error: "Seeds must be an array" });
    }

    if (seeds.length === 0) {
      return res.status(400).json({ error: "Seeds array cannot be empty" });
    }

    // Convert seeds to buffers and validate
    const seedBuffers: Buffer[] = [];

    for (const seed of seeds) {
      if (typeof seed !== "string") {
        return res.status(400).json({ error: "All seeds must be strings" });
      }

      const seedBuffer = Buffer.from(seed, "utf-8");

      // Each seed must not exceed 32 bytes
      if (seedBuffer.length > 32) {
        return res.status(400).json({ error: "Seed exceeds 32 bytes" });
      }

      seedBuffers.push(seedBuffer);
    }

    // Derive PDA
    const programPubkey = new PublicKey(programId);
    const [pda, bump] = PublicKey.findProgramAddressSync(
      seedBuffers,
      programPubkey,
    );

    return res.status(200).json({
      pda: pda.toBase58(),
      bump,
    });
  } catch (error) {
    return res.status(400).json({ error: "Invalid programId" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
