// SPDX-License-Identifier: 0BSD
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Golos} from "../src/Golos.sol";

contract GolosTest is Test {
    Golos golos;

    address owner = address(this);
    uint256 relayerKey = 0xA11CE;
    address relayer = vm.addr(relayerKey);
    uint256 authorKey = 0xB0B;
    address author = vm.addr(authorKey);

    bytes32 postId = keccak256("20260317-blogpost");

    function setUp() public {
        vm.warp(1000);
        golos = new Golos(relayer);
    }

    // --- Helpers ---

    /// @dev Sign a comment message with the given private key
    function _sign(
        uint256 privateKey,
        address _author,
        bytes32 _postId,
        string memory _content
    ) internal pure returns (bytes memory) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(_author, _postId, _content)
        );
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, ethSignedHash);
        return abi.encodePacked(r, s, v);
    }

    /// @dev Owner can transfer ownership
    function test_setOwner() public {
        address newOwner = address(0xBEEF);
        golos.setOwner(newOwner);
        assertEq(golos.owner(), newOwner);
    }

    /// @dev Non-owner cannot transfer ownership
    function test_setOwner_revert_notOwner() public {
        vm.prank(author);
        vm.expectRevert("Not owner");
        golos.setOwner(address(0xBEEF));
    }

    // --- comment() ---

    /// @dev Owner can post a comment directly
    function test_comment() public {
        golos.comment(postId, "hello");
    }

    /// @dev Non-owner is rejected
    function test_comment_revert_notOwner() public {
        vm.prank(author);
        vm.expectRevert("Not owner");
        golos.comment(postId, "hello");
    }

    /// @dev Comment exceeding 5KB is rejected
    function test_comment_revert_tooLong() public {
        bytes memory longContent = new bytes(5121);
        vm.expectRevert("Comment too long");
        golos.comment(postId, string(longContent));
    }

    // --- commentFor() ---

    /// @dev Relayer can post on behalf of a user with valid signature
    function test_commentFor() public {
        bytes memory sig = _sign(authorKey, author, postId, "great post");

        vm.prank(relayer);
        golos.commentFor(author, postId, "great post", sig);
    }

    /// @dev Non-relayer is rejected
    function test_commentFor_revert_notRelayer() public {
        bytes memory sig = _sign(authorKey, author, postId, "hello");

        vm.prank(author);
        vm.expectRevert("Not relayer");
        golos.commentFor(author, postId, "hello", sig);
    }

    /// @dev Comment exceeding 5KB is rejected
    function test_commentFor_revert_tooLong() public {
        bytes memory longContent = new bytes(5121);
        string memory content = string(longContent);
        bytes memory sig = _sign(authorKey, author, postId, content);

        vm.prank(relayer);
        vm.expectRevert("Comment too long");
        golos.commentFor(author, postId, content, sig);
    }

    /// @dev Signature from a different key is rejected
    function test_commentFor_revert_invalidSignature() public {
        // Sign with relayer key instead of author key
        bytes memory sig = _sign(relayerKey, author, postId, "hello");

        vm.prank(relayer);
        vm.expectRevert("Invalid signature");
        golos.commentFor(author, postId, "hello", sig);
    }

    // --- Cooldown ---

    /// @dev Second comment within cooldown period is rejected
    function test_commentFor_revert_cooldown() public {
        bytes memory sig1 = _sign(authorKey, author, postId, "first");
        vm.prank(relayer);
        golos.commentFor(author, postId, "first", sig1);

        bytes memory sig2 = _sign(authorKey, author, postId, "second");
        vm.prank(relayer);
        vm.expectRevert("Too soon");
        golos.commentFor(author, postId, "second", sig2);
    }

    /// @dev Comment after cooldown period passes
    function test_commentFor_afterCooldown() public {
        bytes memory sig1 = _sign(authorKey, author, postId, "first");
        vm.prank(relayer);
        golos.commentFor(author, postId, "first", sig1);

        vm.warp(block.timestamp + 61);

        bytes memory sig2 = _sign(authorKey, author, postId, "second");
        vm.prank(relayer);
        golos.commentFor(author, postId, "second", sig2);
    }

    // --- setRelayer() ---

    /// @dev Owner can update the relayer address
    function test_setRelayer() public {
        address newRelayer = address(0xDEAD);
        golos.setRelayer(newRelayer);
        assertEq(golos.relayer(), newRelayer);
    }

    /// @dev Non-owner cannot update the relayer address
    function test_setRelayer_revert_notOwner() public {
        vm.prank(author);
        vm.expectRevert("Not owner");
        golos.setRelayer(address(0xDEAD));
    }
}
