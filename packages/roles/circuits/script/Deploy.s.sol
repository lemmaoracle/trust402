// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {Groth16Verifier} from "../build/RoleSpendLimitVerifier.sol";

contract DeployRoleSpendLimitVerifier is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        Groth16Verifier verifier = new Groth16Verifier();

        vm.stopBroadcast();

        console.log("RoleSpendLimitVerifier deployed at:", address(verifier));
    }
}
