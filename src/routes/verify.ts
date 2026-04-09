import { Router, Request, Response } from "express";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { isValidSolanaAddress } from "../utils";

const router = Router();

// POST /api/verify-ownership — Verify Ed25519 signature
router.post("/", (req: Request, res: Response) => {
  try {
    const { address, message, signature } = req.body;

    if (!address || !message || !signature) {
      return res.status(400).json({
        error: "Missing required fields: address, message, and signature",
      });
    }

    if (
      typeof address !== "string" ||
      typeof message !== "string" ||
      typeof signature !== "string"
    ) {
      return res.status(400).json({ error: "Invalid input types" });
    }

    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ error: "Invalid address" });
    }

    let publicKeyBytes: Uint8Array;
    let signatureBytes: Uint8Array;

    try {
      publicKeyBytes = bs58.decode(address);
    } catch {
      return res.status(400).json({ error: "Invalid address encoding" });
    }

    try {
      signatureBytes = bs58.decode(signature);
    } catch {
      return res.status(400).json({ error: "Invalid signature encoding" });
    }

    if (signatureBytes.length !== 64) {
      return res.status(200).json({ valid: false });
    }

    const messageBytes = new TextEncoder().encode(message);

    const valid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes,
    );

    return res.status(200).json({ valid });
  } catch {
    return res.status(400).json({ error: "Invalid inputs" });
  }
});

export default router;
