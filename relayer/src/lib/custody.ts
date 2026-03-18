import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { keccak256, encodePacked, type Hex } from "viem";

// --- Wallet generation ---

export function generateWallet(): { privateKey: Hex; address: Hex } {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { privateKey, address: account.address };
}

// --- Signing ---

export async function signComment(
  privateKey: Hex,
  author: Hex,
  postId: Hex,
  username: string,
  content: string,
): Promise<Hex> {
  const account = privateKeyToAccount(privateKey);
  const messageHash = keccak256(
    encodePacked(
      ["address", "bytes32", "string", "string"],
      [author, postId, username, content],
    ),
  );
  return account.signMessage({ message: { raw: messageHash } });
}

// --- AES-256-GCM encryption ---

async function deriveKey(keyHex: string): Promise<CryptoKey> {
  const keyBytes = hexToBytes(keyHex);
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function encryptPrivateKey(
  privateKey: string,
  encryptionKey: string,
): Promise<string> {
  const key = await deriveKey(encryptionKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(privateKey);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded),
  );

  // Combine iv + ciphertext, base64 encode
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv);
  combined.set(ciphertext, iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptPrivateKey(
  encrypted: string,
  encryptionKey: string,
): Promise<string> {
  const key = await deriveKey(encryptionKey);
  const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(decrypted);
}
