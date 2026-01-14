// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "bima-frontend/BimaLandMarketplace.sol";

contract DeployBima is Script {
    function run() external {
        vm.startBroadcast();

        BimaLandMarketplace bima = new BimaLandMarketplace();

        vm.stopBroadcast();
    }
}