// SPDX-License-Identifier: 0BSD
pragma solidity ^0.8.13;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract Golos {
    address public owner;
    address public relayer;
    mapping(address => uint256) public lastCommentTime;
    uint256 public constant COOLDOWN = 60;
    uint256 public commentCount;
    mapping(uint256 => bool) public isSpam;

    event CommentPosted(
        uint256 indexed commentId,
        bytes32 indexed postId,
        address indexed author,
        string username,
        string ensName,
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

    function comment(bytes32 postId, string calldata username, string calldata ensName, string calldata content)
        external
        onlyOwner
    {
        require(bytes(content).length <= 5120, "Comment too long");
        uint256 id = commentCount++;
        emit CommentPosted(id, postId, msg.sender, username, ensName, content, block.timestamp);
    }

    function commentFor(
        address author,
        bytes32 postId,
        string calldata username,
        string calldata ensName,
        string calldata content,
        bytes calldata signature
    ) external onlyRelayer {
        require(bytes(content).length <= 5120, "Comment too long");
        require(block.timestamp >= lastCommentTime[author] + COOLDOWN, "Too soon");
        lastCommentTime[author] = block.timestamp;

        bytes32 messageHash = keccak256(abi.encodePacked(author, postId, username, content));
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address recovered = ECDSA.recover(ethSignedHash, signature);
        require(recovered == author, "Invalid signature");

        uint256 id = commentCount++;
        emit CommentPosted(id, postId, author, username, ensName, content, block.timestamp);
    }

    function setSpam(uint256 commentId, bool _isSpam) external onlyOwner {
        isSpam[commentId] = _isSpam;
    }

    function setRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
    }
}
