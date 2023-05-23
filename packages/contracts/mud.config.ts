import { mudConfig } from "@latticexyz/world/register";

export default mudConfig({
  tables: {
    MyTable: {
      schema: {
        largestGameId: "uint256",
      },
    },
    NextToCall: {
      keySchema: { gameId: "uint256" },
      schema: { call: "bytes" },
    },
  },
});
