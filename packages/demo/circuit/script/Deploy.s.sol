// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "FinancialDataVerifier.sol";

contract DeployFinancialDataVerifier is Script {
    function run() external {
        vm.startBroadcast();

        FinancialDataVerifier verifier = new FinancialDataVerifier();

        vm.stopBroadcast();

        console.log("FinancialDataVerifier deployed at:", address(verifier));
    }
}
