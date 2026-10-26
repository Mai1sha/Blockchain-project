// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IEscrow {
    function withdraw(uint256 id) external;
}

/// @dev Test helper: a provider that tries to re-enter withdraw() from its receive hook.
///      Used only in tests; never deployed to a real network.
contract ReentrantProvider {
    IEscrow public escrow;
    uint256 public id;
    bool public reentryAttempted;
    bool public reentrySucceeded;

    function setTarget(address escrow_, uint256 id_) external {
        escrow = IEscrow(escrow_);
        id = id_;
    }

    function exec(address to, bytes calldata data) external {
        (bool ok,) = to.call(data);
        require(ok, "exec failed");
    }

    receive() external payable {
        reentryAttempted = true;
        try escrow.withdraw(id) {
            reentrySucceeded = true;
        } catch {}
    }
}
