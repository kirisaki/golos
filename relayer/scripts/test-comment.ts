// Usage: npx tsx scripts/test-comment.ts [options]
//
// Environment variables:
//   PRIVATE_KEY    - Wallet private key (default: hardhat #0)
//   RELAYER_URL    - Relayer endpoint (default: https://relayer.kristina3731.workers.dev)
//
// Options:
//   --slug <slug>       Post slug (default: "20260317-test")
//   --username <name>   Username (default: "kirisaki")
//   --content <text>    Comment content (default: "Hello from golos!")

import { privateKeyToAccount } from "viem/accounts";
import { keccak256, toHex, encodePacked, type Hex } from "viem";

const args = process.argv.slice(2);

function getArg(name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const privateKey = (process.env.PRIVATE_KEY ??
  "0x5a668acba9d739f536d020ac7b92a79554f1f512793f0ecb40e498586233c339") as Hex;
const relayerUrl =
  process.env.RELAYER_URL ?? "https://relayer.kristina3731.workers.dev";

const postSlug = getArg("slug", "20260317-test");
const username = getArg("username", "kirisaki");
const content = getArg("content", "Hello from golos!");

const account = privateKeyToAccount(privateKey);
const postId = keccak256(toHex(postSlug));

const messageHash = keccak256(
  encodePacked(
    ["address", "bytes32", "string", "string"],
    [account.address, postId, username, content],
  ),
);

const signature = await account.signMessage({ message: { raw: messageHash } });

const body = { author: account.address, postSlug, username, content, signature };

console.log("POST", relayerUrl + "/comment");
console.log("Body:", JSON.stringify(body, null, 2));

const res = await fetch(relayerUrl + "/comment", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

console.log("Status:", res.status);
console.log("Response:", await res.json());
