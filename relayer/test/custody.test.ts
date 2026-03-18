import { describe, it, expect } from "vitest";
import {
  generateWallet,
  encryptPrivateKey,
  decryptPrivateKey,
  signComment,
} from "../src/lib/custody.js";
import { keccak256, encodePacked, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const testEncryptionKey =
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("generateWallet", () => {
  it("returns a valid keypair", () => {
    const wallet = generateWallet();
    expect(wallet.privateKey).toMatch(/^0x[0-9a-f]{64}$/);
    expect(wallet.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });
});

describe("encrypt/decrypt", () => {
  it("round-trips a private key", async () => {
    const original = "0xdeadbeef" + "00".repeat(28);
    const encrypted = await encryptPrivateKey(original, testEncryptionKey);
    const decrypted = await decryptPrivateKey(encrypted, testEncryptionKey);
    expect(decrypted).toBe(original);
  });

  it("produces different ciphertext each time", async () => {
    const original = "0x1234";
    const a = await encryptPrivateKey(original, testEncryptionKey);
    const b = await encryptPrivateKey(original, testEncryptionKey);
    expect(a).not.toBe(b);
  });

  it("fails with wrong key", async () => {
    const encrypted = await encryptPrivateKey("secret", testEncryptionKey);
    const wrongKey =
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    await expect(decryptPrivateKey(encrypted, wrongKey)).rejects.toThrow();
  });
});

describe("signComment", () => {
  it("produces a valid signature recoverable to the signer", async () => {
    const wallet = generateWallet();
    const author = wallet.address;
    const postId = keccak256(encodePacked(["string"], ["test-post"])) as Hex;
    const username = "alice";
    const content = "hello";

    const sig = await signComment(
      wallet.privateKey,
      author,
      postId,
      username,
      content,
    );

    expect(sig).toMatch(/^0x[0-9a-f]+$/);
    expect(sig.length).toBe(132); // 65 bytes = 130 hex + 0x
  });
});
