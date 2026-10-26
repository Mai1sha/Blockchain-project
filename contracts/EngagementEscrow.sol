// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IProviderRegistry} from "./interfaces/IProviderRegistry.sol";

/**
 * @title EngagementEscrow
 * @notice One generic escrow for all engagements between a client and a verified provider.
 *         Payment is in the chain's native currency.
 * @dev Lifecycle:
 *        Requested -> Accepted -> Delivered -> Completed -> Settled
 *        Requested -> Cancelled -> Refunded
 *        Accepted  -> Cancelled (delivery overdue) -> Refunded
 *
 *      Payments are pull-based and tracked per engagement. State is always updated
 *      before ETH is sent. No admin can move escrowed funds, and there is no upgrade path.
 *      Provider verification gates NEW engagements only; an engagement already accepted can
 *      always finish, so a later revocation never traps funds.
 */
contract EngagementEscrow is ReentrancyGuard {
    enum Status {
        None,
        Requested,
        Accepted,
        Delivered,
        Completed,
        Settled,
        Cancelled,
        Refunded
    }

    enum CancelReason {
        ClientCancelled,
        ProviderDeclined,
        DeliveryOverdue
    }

    // Field order packs into 6 slots:
    // client+status+clientConfirmed+createdAt | provider+acceptBy+deliveryPeriod |
    // deliverBy+reviewBy+completedAt+reviewPeriod | amount | specHash | deliverableHash
    struct Engagement {
        address client;
        Status status;
        bool clientConfirmed; // true only if the client themselves accepted the delivery
        uint48 createdAt;
        address provider;
        uint48 acceptBy;
        uint32 deliveryPeriod;
        uint48 deliverBy;
        uint48 reviewBy;
        uint48 completedAt;
        uint32 reviewPeriod;
        uint256 amount;
        bytes32 specHash; // hash of the agreed off-chain scope
        bytes32 deliverableHash; // hash of the delivered work
    }

    uint48 public constant ACCEPT_WINDOW = 7 days;
    uint32 public constant MIN_PERIOD = 1 hours;
    uint32 public constant MAX_PERIOD = 180 days;

    IProviderRegistry public immutable registry;
    uint256 public lastEngagementId;
    mapping(uint256 => Engagement) private _engagements;

    event EngagementCreated(
        uint256 indexed engagementId,
        address indexed client,
        address indexed provider,
        uint256 amount,
        bytes32 specHash
    );
    event EngagementAccepted(uint256 indexed engagementId, uint48 deliverBy);
    event DeliverySubmitted(uint256 indexed engagementId, bytes32 deliverableHash, uint48 reviewBy);
    /// @param clientConfirmed false when completion happened by review-window timeout.
    event EngagementCompleted(uint256 indexed engagementId, bool clientConfirmed);
    event EngagementCancelled(uint256 indexed engagementId, CancelReason reason);
    event PaymentWithdrawn(uint256 indexed engagementId, address indexed provider, uint256 amount);
    event RefundWithdrawn(uint256 indexed engagementId, address indexed client, uint256 amount);

    error ZeroAddress();
    error Unauthorized();
    error ProviderNotVerified();
    error InvalidEngagement();
    error InvalidState();
    error InvalidAmount();
    error InvalidParties();
    error InvalidPeriod();
    error InvalidHash();
    error DeadlinePassed();
    error DeadlineNotReached();
    error TransferFailed();

    constructor(IProviderRegistry registry_) {
        if (address(registry_) == address(0) || address(registry_).code.length == 0) revert ZeroAddress();
        registry = registry_;
    }

    // ---------------------------------------------------------------------
    // Client / provider lifecycle
    // ---------------------------------------------------------------------

    /**
     * @notice Create an engagement and lock the sent ETH in escrow.
     * @param provider       The verified provider wallet being engaged.
     * @param specHash       Hash of the agreed scope (the scope itself stays off-chain).
     * @param deliveryPeriod Seconds the provider has to deliver after accepting.
     * @param reviewPeriod   Seconds the client has to review after delivery.
     */
    function createEngagement(address provider, bytes32 specHash, uint32 deliveryPeriod, uint32 reviewPeriod)
        external
        payable
        returns (uint256 id)
    {
        if (provider == address(0)) revert ZeroAddress();
        if (provider == msg.sender) revert InvalidParties();
        if (msg.value == 0) revert InvalidAmount();
        if (specHash == bytes32(0)) revert InvalidHash();
        if (!_validPeriod(deliveryPeriod) || !_validPeriod(reviewPeriod)) revert InvalidPeriod();
        if (!registry.isVerifiedProvider(provider)) revert ProviderNotVerified();

        id = ++lastEngagementId;
        uint48 nowTs = uint48(block.timestamp);
        Engagement storage e = _engagements[id];
        e.client = msg.sender;
        e.provider = provider;
        e.amount = msg.value;
        e.status = Status.Requested;
        e.createdAt = nowTs;
        e.acceptBy = nowTs + ACCEPT_WINDOW;
        e.deliveryPeriod = deliveryPeriod;
        e.reviewPeriod = reviewPeriod;
        e.specHash = specHash;
        emit EngagementCreated(id, msg.sender, provider, msg.value, specHash);
    }

    /// @notice Provider accepts a requested engagement. The provider must be verified right now.
    function acceptEngagement(uint256 id) external {
        Engagement storage e = _get(id);
        if (msg.sender != e.provider) revert Unauthorized();
        if (e.status != Status.Requested) revert InvalidState();
        if (block.timestamp > e.acceptBy) revert DeadlinePassed();
        if (!registry.isVerifiedProvider(msg.sender)) revert ProviderNotVerified();

        e.status = Status.Accepted;
        e.deliverBy = uint48(block.timestamp) + e.deliveryPeriod;
        emit EngagementAccepted(id, e.deliverBy);
    }

    /// @notice Provider declines a requested engagement; the client can then withdraw the refund.
    function declineEngagement(uint256 id) external {
        Engagement storage e = _get(id);
        if (msg.sender != e.provider) revert Unauthorized();
        if (e.status != Status.Requested) revert InvalidState();

        e.status = Status.Cancelled;
        emit EngagementCancelled(id, CancelReason.ProviderDeclined);
    }

    /// @notice Client cancels an engagement the provider has not accepted yet.
    function cancelEngagement(uint256 id) external {
        Engagement storage e = _get(id);
        if (msg.sender != e.client) revert Unauthorized();
        if (e.status != Status.Requested) revert InvalidState();

        e.status = Status.Cancelled;
        emit EngagementCancelled(id, CancelReason.ClientCancelled);
    }

    /// @notice Provider records delivery by committing a hash of the delivered work.
    function submitDelivery(uint256 id, bytes32 deliverableHash) external {
        Engagement storage e = _get(id);
        if (msg.sender != e.provider) revert Unauthorized();
        if (e.status != Status.Accepted) revert InvalidState();
        if (block.timestamp > e.deliverBy) revert DeadlinePassed();
        if (deliverableHash == bytes32(0)) revert InvalidHash();

        e.status = Status.Delivered;
        e.deliverableHash = deliverableHash;
        e.reviewBy = uint48(block.timestamp) + e.reviewPeriod;
        emit DeliverySubmitted(id, deliverableHash, e.reviewBy);
    }

    /// @notice Client confirms the delivery; the payment becomes withdrawable by the provider.
    function acceptDelivery(uint256 id) external {
        Engagement storage e = _get(id);
        if (msg.sender != e.client) revert Unauthorized();
        if (e.status != Status.Delivered) revert InvalidState();

        e.status = Status.Completed;
        e.clientConfirmed = true;
        e.completedAt = uint48(block.timestamp);
        emit EngagementCompleted(id, true);
    }

    /// @notice Anyone may complete a delivered engagement once the client's review window has passed.
    /// @dev `clientConfirmed` stays false so verifiers can tell this apart from a client confirmation.
    function completeAfterReviewWindow(uint256 id) external {
        Engagement storage e = _get(id);
        if (e.status != Status.Delivered) revert InvalidState();
        if (block.timestamp <= e.reviewBy) revert DeadlineNotReached();

        e.status = Status.Completed;
        e.completedAt = uint48(block.timestamp);
        emit EngagementCompleted(id, false);
    }

    /// @notice Client cancels an accepted engagement whose delivery deadline has passed.
    function cancelOverdue(uint256 id) external {
        Engagement storage e = _get(id);
        if (msg.sender != e.client) revert Unauthorized();
        if (e.status != Status.Accepted) revert InvalidState();
        if (block.timestamp <= e.deliverBy) revert DeadlineNotReached();

        e.status = Status.Cancelled;
        emit EngagementCancelled(id, CancelReason.DeliveryOverdue);
    }

    // ---------------------------------------------------------------------
    // Pull payments
    // ---------------------------------------------------------------------

    /// @notice Provider withdraws the payment of a completed engagement.
    function withdraw(uint256 id) external nonReentrant {
        Engagement storage e = _get(id);
        if (msg.sender != e.provider) revert Unauthorized();
        if (e.status != Status.Completed) revert InvalidState();

        e.status = Status.Settled; // effects before interaction
        uint256 amount = e.amount;
        _send(msg.sender, amount);
        emit PaymentWithdrawn(id, msg.sender, amount);
    }

    /// @notice Client withdraws the refund of a cancelled engagement.
    function withdrawRefund(uint256 id) external nonReentrant {
        Engagement storage e = _get(id);
        if (msg.sender != e.client) revert Unauthorized();
        if (e.status != Status.Cancelled) revert InvalidState();

        e.status = Status.Refunded; // effects before interaction
        uint256 amount = e.amount;
        _send(msg.sender, amount);
        emit RefundWithdrawn(id, msg.sender, amount);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getEngagement(uint256 id) external view returns (Engagement memory) {
        return _get(id);
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    function _get(uint256 id) private view returns (Engagement storage e) {
        e = _engagements[id];
        if (e.status == Status.None) revert InvalidEngagement();
    }

    function _validPeriod(uint32 period) private pure returns (bool) {
        return period >= MIN_PERIOD && period <= MAX_PERIOD;
    }

    function _send(address to, uint256 amount) private {
        (bool ok,) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
