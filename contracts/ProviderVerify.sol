
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    AccessControlDefaultAdminRules
} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";

/// @title ProviderVerify
/// @notice Manages on-chain verification status for service providers.
/// @dev KYC and wallet identity binding happen off-chain.
contract ProviderVerify is AccessControlDefaultAdminRules {

    enum ProviderStatus {
        None,
        Verified,
        Suspended,
        Revoked
    }

    struct Provider {
        ProviderStatus status;
        uint48 verifiedAt;
        uint48 expiresAt;
    }

    // Authorized credential issuer role.
    bytes32 public constant VERIFIER_ROLE =
        keccak256("VERIFIER_ROLE");

    // Stores each provider's verification record.
    mapping(address => Provider) private _providers;

    // Events used by the frontend and blockchain explorer.
    event ProviderVerified(
        address indexed provider,
        uint48 expiresAt,
        bytes32 credentialHash
    );

    event ProviderSuspended(address indexed provider);

    event ProviderRevoked(address indexed provider);

    // Custom errors.
    error ZeroAddress();
    error InvalidExpiry();
    error ProviderIsRevoked();
    error InvalidProviderStatus();

    /// @param adminDelay Delay for transferring admin control.
    /// @param admin Platform administrator wallet.
    /// @param verifier Authorized credential issuer wallet.
    constructor(
        uint48 adminDelay,
        address admin,
        address verifier
    )
        AccessControlDefaultAdminRules(adminDelay, admin)
    {
        if (verifier == address(0)) {
            revert ZeroAddress();
        }

        _grantRole(VERIFIER_ROLE, verifier);
    }

    /// @notice Verify, renew, or reinstate a provider.
    /// @param provider Provider's wallet address.
    /// @param expiresAt Future Unix expiry timestamp.
    /// @param credentialHash Hash of an off-chain credential.
    function verifyProvider(
        address provider,
        uint48 expiresAt,
        bytes32 credentialHash
    )
        external
        onlyRole(VERIFIER_ROLE)
    {
        if (provider == address(0)) {
            revert ZeroAddress();
        }

        if (expiresAt <= block.timestamp) {
            revert InvalidExpiry();
        }

        Provider storage p = _providers[provider];

        if (p.status == ProviderStatus.Revoked) {
            revert ProviderIsRevoked();
        }

        p.status = ProviderStatus.Verified;
        p.verifiedAt = uint48(block.timestamp);
        p.expiresAt = expiresAt;

        emit ProviderVerified(
            provider,
            expiresAt,
            credentialHash
        );
    }

    /// @notice Temporarily suspend a verified provider.
    /// @dev Only an authorized verifier can suspend.
    function suspendProvider(
        address provider
    )
        external
        onlyRole(VERIFIER_ROLE)
    {
        Provider storage p = _providers[provider];

        if (p.status != ProviderStatus.Verified) {
            revert InvalidProviderStatus();
        }

        p.status = ProviderStatus.Suspended;

        emit ProviderSuspended(provider);
    }

    /// @notice Permanently revoke provider verification.
    /// @dev Only the platform administrator can revoke.
    function revokeProvider(
        address provider
    )
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        Provider storage p = _providers[provider];

        if (
            p.status == ProviderStatus.None ||
            p.status == ProviderStatus.Revoked
        ) {
            revert InvalidProviderStatus();
        }

        p.status = ProviderStatus.Revoked;

        emit ProviderRevoked(provider);
    }

    /// @notice Check whether a provider is currently verified.
    /// @dev Expired or suspended providers return false.
    function isVerifiedProvider(
        address provider
    )
        public
        view
        returns (bool)
    {
        Provider storage p = _providers[provider];

        return (
            p.status == ProviderStatus.Verified &&
            block.timestamp < p.expiresAt
        );
    }

    /// @notice Return a provider's stored verification record.
    function getProvider(
        address provider
    )
        external
        view
        returns (Provider memory)
    {
        return _providers[provider];
    }
}
