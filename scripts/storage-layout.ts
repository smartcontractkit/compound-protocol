import { storageLayout } from "hardhat";

async function main() {
  await storageLayout.export();
}

main()
  .then()
  .catch((err) => console.error(err));
