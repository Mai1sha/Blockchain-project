// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ServiceRegistry
/// @notice Anchors commitments to encrypted service deliverables stored off chain
///         (DIDLab Secure IPFS), under role-based authorization.
///
///         Stakeholders in ServicePortal:
///           ADMIN    - platform operator; grants and revokes roles only.
///           PROVIDER - service provider; anchors a commitment to a deliverable.
///           CLIENT   - client (or platform reviewer); verifies a delivered record.
///
///         Privacy rules:
///           - The deliverable itself never goes on chain; only the SHA-256 of
///             its stored ciphertext and its CID.
///           - recordId must be random (or derived from a key that identifies
///             no person). Never derive it from a name, email, KYC id or any
///             other personal identifier, hashed or otherwise.
contract ServiceRegistry {
    bytes32 public constant ADMIN    = keccak256("ADMIN");
    bytes32 public constant PROVIDER = keccak256("PROVIDER");
    bytes32 public constant CLIENT   = keccak256("CLIENT");

    struct Record {
        bytes32 digest;      // SHA-256 of the stored ciphertext (bytes the gateway serves)
        string  cid;         // where the encrypted object lives
        address submitter;   // provider wallet that anchored it
        uint64  submittedAt;
        address verifier;    // client wallet that verified it
        uint64  verifiedAt;  // zero until verified
    }

    mapping(bytes32 => mapping(address => bool)) private _roles;
    mapping(bytes32 => Record) private _records;

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed by);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed by);
    event RecordAnchored(bytes32 indexed recordId, bytes32 indexed digest, address indexed submitter, string cid);
    event RecordVerified(bytes32 indexed recordId, address indexed verifier, uint64 at);

    error NotAuthorized(bytes32 role);
    error ZeroAddress();
    error EmptyRecordId();
    error EmptyDigest();
    error EmptyCid();
    error AlreadyAnchored();
    error UnknownRecord();
    error AlreadyVerified();
    error SelfVerification();

    modifier onlyRole(bytes32 role) {
        if (!_roles[role][msg.sender]) revert NotAuthorized(role);
        _;
    }

    constructor() {
        _roles[ADMIN][msg.sender] = true;
        emit RoleGranted(ADMIN, msg.sender, msg.sender);
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account];
    }

    function grantRole(bytes32 role, address account) external onlyRole(ADMIN) {
        if (account == address(0)) revert ZeroAddress();
        _roles[role][account] = true;
        emit RoleGranted(role, account, msg.sender);
    }

    function revokeRole(bytes32 role, address account) external onlyRole(ADMIN) {
        _roles[role][account] = false;
        emit RoleRevoked(role, account, msg.sender);
    }

    /// @notice Provider commits to a deliverable stored off chain.
    function anchor(bytes32 recordId, bytes32 digest, string calldata cid)
        external
        onlyRole(PROVIDER)
    {
        if (recordId == bytes32(0)) revert EmptyRecordId();
        if (digest == bytes32(0)) revert EmptyDigest();
        if (bytes(cid).length == 0) revert EmptyCid();
        if (_records[recordId].submittedAt != 0) revert AlreadyAnchored();

        _records[recordId] = Record({
            digest: digest,
            cid: cid,
            submitter: msg.sender,
            submittedAt: uint64(block.timestamp),
            verifier: address(0),
            verifiedAt: 0
        });

        emit RecordAnchored(recordId, digest, msg.sender, cid);
    }

    /// @notice Client confirms they checked the deliverable against the anchored digest.
    function verify(bytes32 recordId) external onlyRole(CLIENT) {
        Record storage r = _records[recordId];
        if (r.submittedAt == 0) revert UnknownRecord();
        if (r.verifiedAt != 0) revert AlreadyVerified();
        if (r.submitter == msg.sender) revert SelfVerification();

        r.verifier = msg.sender;
        r.verifiedAt = uint64(block.timestamp);

        emit RecordVerified(recordId, msg.sender, uint64(block.timestamp));
    }

    function get(bytes32 recordId) external view returns (Record memory) {
        return _records[recordId];
    }
}
