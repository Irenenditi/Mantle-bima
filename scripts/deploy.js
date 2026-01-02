const hre = require("hardhat");

async function main() {
  console.log("Deploying MantleNFT contract...");
  
  const MantleNFT = await hre.ethers.getContractFactory("MantleNFT");
  const mantleNFT = await MantleNFT.deploy();
  
  await mantleNFT.waitForDeployment();
  
  console.log(`MantleNFT deployed to: ${await mantleNFT.getAddress()}`);
  
  // Verify the contract on Mantle Explorer
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for block confirmations...");
    await mantleNFT.deploymentTransaction().wait(6);
    
    console.log("Verifying contract on Mantle Explorer...");
    try {
      await hre.run("verify:verify", {
        address: await mantleNFT.getAddress(),
        constructorArguments: [],
      });
      console.log("Contract verified successfully!");
    } catch (error) {
      console.error("Error verifying contract:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
