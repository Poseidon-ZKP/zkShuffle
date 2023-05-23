import { mudConfig } from "@latticexyz/world/register";

export default mudConfig({
  tables: {
    MyTable: {
      schema: {
        largestGameId: "uint256",
      },
    },
  },
});
