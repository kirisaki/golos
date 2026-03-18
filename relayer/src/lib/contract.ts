import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, mainnet } from "viem/chains";

export const golosAbi = [
  {
    type: "function",
    name: "commentFor",
    inputs: [
      { name: "author", type: "address" },
      { name: "postId", type: "bytes32" },
      { name: "username", type: "string" },
      { name: "ensName", type: "string" },
      { name: "content", type: "string" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export function slugToPostId(postSlug: string): Hex {
  return keccak256(toHex(postSlug));
}

export async function resolveEnsName(
  ensRpcUrl: string,
  address: Hex,
): Promise<string> {
  const client = createPublicClient({
    chain: mainnet,
    transport: http(ensRpcUrl),
  });

  try {
    const name = await client.getEnsName({ address });
    return name ?? "";
  } catch {
    return "";
  }
}

export async function submitComment(
  env: { RELAYER_PRIVATE_KEY: string; CONTRACT_ADDRESS: string; RPC_URL: string },
  author: Hex,
  postSlug: string,
  username: string,
  ensName: string,
  content: string,
  signature: Hex,
): Promise<Hex> {
  const account = privateKeyToAccount(env.RELAYER_PRIVATE_KEY as Hex);

  const client = createWalletClient({
    account,
    chain: base,
    transport: http(env.RPC_URL),
  });

  const publicClient = createPublicClient({
    chain: base,
    transport: http(env.RPC_URL),
  });

  const postId = slugToPostId(postSlug);

  const { request } = await publicClient.simulateContract({
    account,
    address: env.CONTRACT_ADDRESS as Hex,
    abi: golosAbi,
    functionName: "commentFor",
    args: [author, postId, username, ensName, content, signature],
  });

  return client.writeContract(request);
}
