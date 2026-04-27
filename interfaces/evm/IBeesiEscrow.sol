// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IBeesiEscrow — public interface for BeesiEscrow V3 (fee-in-escrow).
 *
 * @dev This file is the *integration interface* — function signatures, events,
 * and revert reasons. The reference implementation lives in the engineering
 * monorepo and is audited separately.
 *
 * Properties enforced by the implementation:
 *  1. fundTask locks (rewardPerCompletion + feePerCompletion) * maxInstances
 *     in a single ERC-20 transferFrom.
 *  2. approveSubmission atomically transfers reward → performer and
 *     fee → feeRecipient. There is no partial state.
 *  3. (taskKey, submissionKey) is processed at most once across approve/reject.
 *  4. refundRemaining returns ALL un-released funds (reward + fee components)
 *     to the publisher. Callable even when paused.
 */
interface IBeesiEscrow {
    // ─── Types ──────────────────────────────────────────────────────────

    enum TaskState { None, Funded, Closed }

    struct TaskEscrow {
        address publisher;
        address token;
        uint256 rewardPerCompletion;
        uint256 feePerCompletion;
        address feeRecipient;
        uint32 maxInstances;
        uint32 releasedCount;
        uint64 autoApproveAt;
        uint256 totalFunded;
        uint256 totalReleased;
        uint256 totalRefunded;
        TaskState state;
    }

    // ─── Events ─────────────────────────────────────────────────────────

    event OperatorUpdated(address indexed operator, bool enabled);
    event OperatorAdminUpdated(address indexed operatorAdmin);
    event PauserUpdated(address indexed pauser);
    event PauseUpdated(bool paused);
    event OwnerTransferred(address indexed previousOwner, address indexed newOwner);

    event TaskFunded(
        bytes32 indexed taskKey,
        address indexed publisher,
        address indexed token,
        uint256 rewardPerCompletion,
        uint256 feePerCompletion,
        uint32 maxInstances,
        uint256 totalFunded,
        address feeRecipient,
        uint64 autoApproveAt
    );

    event SubmissionApproved(
        bytes32 indexed taskKey,
        bytes32 indexed submissionKey,
        address indexed performer,
        uint256 rewardAmount,
        uint256 feeAmount,
        address feeRecipient,
        bool autoApproved
    );

    event SubmissionRejected(bytes32 indexed taskKey, bytes32 indexed submissionKey);

    event TaskRefunded(bytes32 indexed taskKey, address indexed publisher, uint256 amount);

    // ─── Authority management ───────────────────────────────────────────

    function setOperator(address operator, bool enabled) external;
    function setOperatorAdmin(address value) external;
    function setPauser(address value) external;
    function transferOwnership(address newOwner) external;
    function setPaused(bool value) external;

    // ─── Lifecycle ──────────────────────────────────────────────────────

    /**
     * @notice Lock (rewardPerCompletion + feePerCompletion) * maxInstances
     *         from the caller. Caller must approve allowance first.
     * @dev Reverts on duplicate taskKey.
     *
     * Reverts:
     *  - "TASK_KEY_EMPTY"            taskKey == 0
     *  - "TOKEN_EMPTY"               token   == 0
     *  - "REWARD_ZERO"               rewardPerCompletion == 0
     *  - "INSTANCES_ZERO"            maxInstances == 0
     *  - "AUTO_APPROVE_AT_ZERO"      autoApproveAt == 0
     *  - "FEE_RECIPIENT_REQUIRED"    feePerCompletion > 0 && feeRecipient == 0
     *  - "TASK_ALREADY_FUNDED"       state != None
     *  - "TOTAL_OVERFLOW"            (reward + fee) * max overflows uint256
     *  - "TOTAL_ZERO"                computed total == 0
     *  - "TRANSFER_FROM_FAILED"      ERC-20 transferFrom returned false
     *  - "ESCROW_PAUSED"             paused == true
     */
    function fundTask(
        bytes32 taskKey,
        address token,
        uint256 rewardPerCompletion,
        uint256 feePerCompletion,
        uint32 maxInstances,
        address feeRecipient,
        uint64 autoApproveAt
    ) external;

    /**
     * @notice Operator-mediated approval. Atomically pays reward → performer
     *         and fee → feeRecipient.
     *
     * Reverts:
     *  - "ONLY_OPERATOR"
     *  - "TASK_NOT_FUNDED"
     *  - "SUBMISSION_ALREADY_PROCESSED"
     *  - "PERFORMER_EMPTY"
     *  - "TASK_INSTANCES_FULL"
     *  - "TRANSFER_FAILED" / "FEE_TRANSFER_FAILED"
     *  - "ESCROW_PAUSED"
     */
    function approveSubmission(
        bytes32 taskKey,
        bytes32 submissionKey,
        address performer
    ) external;

    /**
     * @notice Same as approveSubmission but additionally requires
     *         block.timestamp >= autoApproveAt. The chain double-checks
     *         the deadline so an over-eager scheduler cannot approve early.
     *
     * Additional revert:
     *  - "AUTO_APPROVE_NOT_READY"
     */
    function autoApproveSubmission(
        bytes32 taskKey,
        bytes32 submissionKey,
        address performer
    ) external;

    /**
     * @notice Operator-mediated rejection. No funds move. The submission slot
     *         is NOT consumed — another performer can still earn it.
     */
    function rejectSubmission(bytes32 taskKey, bytes32 submissionKey) external;

    /**
     * @notice Returns all un-released funds (reward + fee components for every
     *         un-released slot) to the publisher.
     * @dev Intentionally callable while paused.
     *
     * Reverts:
     *  - "ONLY_OPERATOR"
     *  - "TASK_NOT_FOUND"
     *  - "NO_REMAINING_BALANCE"
     *  - "REFUND_TRANSFER_FAILED"
     */
    function refundRemaining(bytes32 taskKey) external;

    // ─── Views ──────────────────────────────────────────────────────────

    function getRemaining(bytes32 taskKey) external view returns (uint256);

    function tasks(bytes32 taskKey) external view returns (
        address publisher,
        address token,
        uint256 rewardPerCompletion,
        uint256 feePerCompletion,
        address feeRecipient,
        uint32 maxInstances,
        uint32 releasedCount,
        uint64 autoApproveAt,
        uint256 totalFunded,
        uint256 totalReleased,
        uint256 totalRefunded,
        TaskState state
    );

    function submissionProcessed(bytes32 taskKey, bytes32 submissionKey)
        external view returns (bool);

    function operators(address operator) external view returns (bool);
    function operatorAdmin() external view returns (address);
    function pauser() external view returns (address);
    function owner() external view returns (address);
    function paused() external view returns (bool);
}
