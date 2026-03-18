# golos

A comment system for pravda.klara.works

## Architecture

- **contracts/** — Solidity smart contract (Foundry)
- **relayer/** — Hono + Cloudflare Workers relayer server

## Contract

- **Address**: `0x4Dbfdd81D982c2F7b1fD844D49b93483b5c0900D`
- **Chain**: Base mainnet
- **Owner**: `0xAef634E4Af8a43c279d1c151a7984810FC86A367`
- **Relayer**: `0x69D35C64Eccbc16e7f553306b4f21783EA3955C5`

## Admin Operations

### Mark a comment as spam

```bash
cast send \
  --private-key $OWNER_PRIVATE_KEY \
  --rpc-url https://mainnet.base.org \
  0x4Dbfdd81D982c2F7b1fD844D49b93483b5c0900D \
  'setSpam(uint256,bool)' <commentId> true
```

### Unmark spam

```bash
cast send \
  --private-key $OWNER_PRIVATE_KEY \
  --rpc-url https://mainnet.base.org \
  0x4Dbfdd81D982c2F7b1fD844D49b93483b5c0900D \
  'setSpam(uint256,bool)' <commentId> false
```

### Check if a comment is spam

```bash
cast call \
  --rpc-url https://mainnet.base.org \
  0x4Dbfdd81D982c2F7b1fD844D49b93483b5c0900D \
  'isSpam(uint256)(bool)' <commentId>
```

### Check total comment count

```bash
cast call \
  --rpc-url https://mainnet.base.org \
  0x4Dbfdd81D982c2F7b1fD844D49b93483b5c0900D \
  'commentCount()(uint256)'
```
