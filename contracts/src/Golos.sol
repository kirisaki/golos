// SPDX-License-Identifier: 0BSD
pragma solidity ^0.8.13;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {
    MessageHashUtils
} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract Golos {
    address public owner;
    address public relayer;
    mapping(address => uint256) public lastCommentTime;
    uint256 public constant COOLDOWN = 60;

    event CommentPosted(
        bytes32 indexed postId,
        address indexed author,
        string content,
        uint256 timestamp
    );

    function setOwner(address _owner) external onlyOwner {
        owner = _owner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyRelayer() {
        require(msg.sender == relayer, "Not relayer");
        _;
    }

    constructor(address _relayer) {
        owner = msg.sender;
        relayer = _relayer;
    }

    function comment(
        bytes32 postId,
        string calldata content
    ) external onlyOwner {
        require(bytes(content).length <= 5120, "Comment too long");
        emit CommentPosted(postId, msg.sender, content, block.timestamp);
    }

    function commentFor(
        address author,
        bytes32 postId,
        string calldata content,
        bytes calldata signature
    ) external onlyRelayer {
        require(bytes(content).length <= 5120, "Comment too long");
        require(
            block.timestamp >= lastCommentTime[author] + COOLDOWN,
            "Too soon"
        );
        lastCommentTime[author] = block.timestamp;

        bytes32 messageHash = keccak256(
            abi.encodePacked(author, postId, content)
        );
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(
            messageHash
        );
        address recovered = ECDSA.recover(ethSignedHash, signature);
        require(recovered == author, "Invalid signature");

        emit CommentPosted(postId, author, content, block.timestamp);
    }

    function setRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
    }
}
