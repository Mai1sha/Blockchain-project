// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Read-only view of the provider registry used by the escrow.
interface IProviderRegistry {
    /// @return True if the provider is currently Verified and its credential has not expired.
    function isVerifiedProvider(address provider) external view returns (bool);
}
