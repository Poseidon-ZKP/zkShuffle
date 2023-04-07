//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface IAccountManagement {
    // Generate a new game id.
    function generateGameId() external returns (uint256);

    // Joins a game with `gameId`, `buyIn`, and `isNewGame` on whether joining a new game or an existing game.
    //
    // # Note
    //
    // We prohibit players to join arbitrary game with `gameId`. We allow registered game contract to specify
    // `gameId` to resolve issues such as player collusion.
    function join(
        address player,
        uint256 gameId,
        uint256 buyIn
    ) external;

    // Settles chips for `player` and `gameId` by adding `amount` if `isPositive` and subtracting `amount` otherwise.
    // Chips are immediately repaid to `chipEquity` if `removeDelay`.
    //
    // # Note
    //
    // We allow registered contracts to settle wins and loses for `player` after each game.
    function settle(
        address player,
        uint256 gameId,
        uint256 amount,
        bool isPositive,
        bool collectVigor,
        bool removeDelay
    ) external;

    // Exchange ratio where `chipEquity` = `ratio` * `token`
    function ratio() external view returns (uint256);

    // ERC20 Token type to swap with `chipEquity`
    function token() external view returns (address);

    // Deposits ERC20 tokens for chips.
    function deposit(uint256 tokenAmount) external payable;

    // Moves all chips from `from` to `to`.
    function move(address from, address to) external;

    // Authorizes `ephemeralAccount` for `permanentAccount` by a registered contract.
    function authorize(address permanentAccount, address ephemeralAccount)
        external;

    // Checks if `permanentAccount` has authorized `ephemeralAccount`.
    function hasAuthorized(address permanentAccount, address ephemeralAccount)
        external
        returns (bool);

    // Gets the largest game id which have been created.
    function getLargestGameId() external view returns (uint256);

    // Gets the current game id of `player`.
    function getCurGameId(address player) external view returns (uint256);

    // Returns the corresponding permanent account by ephemeral account
    function accountMapping(address ephemeral) external view returns (address);

    // Returns `account` if it has not been registered as an ephemeral account;
    // otherwise returns the corresponding permanent account.
    function getPermanentAccount(address account)
        external
        view
        returns (address);

    // Gets the amount of chip equity.
    function getChipEquityAmount(address player) external view returns (uint256);

    // Batch get the chip amounts of players 
    function getChipEquityAmounts(address[] calldata players) external view returns (uint256[] memory chips);
}