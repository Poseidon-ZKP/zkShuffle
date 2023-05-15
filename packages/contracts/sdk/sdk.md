# zkShuffle SDK


<!-- ## TODO
1. gameId mapping
2. create game id
3. checkTurn , checkShuffleTurn, checkDealTurn...
4. playerId implicit.
 -->

## Demo
```typescript=
    const player = new zkShuffle(ShuffleManater, owner)
    await player.init()

    // join game
    const playerIdx = await player.joinGame(gameId)

    // play game
    let state
    while (state != BaseState.Complete) {
        state = await player.checkTurn(gameId)

        if (state != NOT_TRUN) {
            switch(state) {
                case BaseState.Shuffle :
                    await player.shuffle(gameId)
                    break
                case BaseState.Deal :
                    await player.draw(gameId)
                    break
                case BaseState.Open :
                    await player.open(gameId)
                    break
                case BaseState.Complete :
                    break
                case BaseState.Error :
                    break
                default :
                    console.log("err state ", state)
                    exit(-1)
            }
        }

    }
    
```





## Solidity Interface
```solidity
interface IBaseGame {
    function cardConfig() external view returns (DeckConfig);
    function shuffleGameId(uint gameId) external view returns(uint shuffleId);
    // function newGame() external returns(uint gameId)
    // function startGame(uint gameId)
}

interface IBaseStateManager {
    ...
}

```


## SDK Interface


```typescript=
interface IZKShuffle {
    joinGame : (gameId : number) => Promise<number>
    checkTurn : (gameId : number) => Promise<number>
    shuffle : (gameId: number) => Promise<boolean>
    draw : (gameId: number) => Promise<boolean>
    open : (gameId: number, cardIds : number[]) => Promise<number[]>
    openOffchain : (gameId: number, cardIds : number[]) => Promise<number[]>

    // helper
    getPlayerId : (gameId : number) => Promise<number> 
}>
}
```

- ### joinGame
    - join the game specified by ${gameId}$, and get an onchain per game's ${playerId}$
    - parameters :
        - ${gameId}$ : number
    - return :
        - ${playerId}$ : number

- ### checkTurn
    - Query player's current turn in game ${gameId}$, specified by ${GameTurn}$
    ```typescript
            enum GameTurn {
                NOP,                // Not Your Turn
                Shuffle,            // Shuffle Turn
                Deal,               // Deal Decrypt Turn
                Open,               // Open Card
                Error,              // Game Error
                Complete            // Game End
            }
    ```
    - parameters:
        - ${gameId}$ : number
    - return : 
        - ${turn}$ : ${GameTurn}$


- ### shuffle
    - shuffle card in game ${gameId}$, and submit a proof on-chain, return true is shuffle successs, otherwise false
    - parameters:
        - ${gameId}$ : number
    - return : 
        - ${success}$ : boolean
    

- ### draw
    - draw card in game ${gameId}$, and submit a proof on-chain, return true is draw successs, otherwise false
    - parameters:
        - ${gameId}$ : number
    - return : 
        - ${success}$ : boolean


- ### open
    - open cards specified by ${cardIds}$, and submit a proof on-chain, return card's original value if open successs, otherwise return -1 for the card.
    - parameters:
        - ${gameId}$ : number
        - ${cardIds}$ : number[]
    - return :
        - ${cards}$ : number[]

- ### openOffchain
    - open cards specified by ${cardIds}$, return card's original value if open successs, otherwise return -1 for the card.
    - parameters:
        - ${gameId}$ : number
        - ${cardIds}$ : number[]
    - return :
        - ${cards}$ : number[]

- ### getPlayerId
    - get player's id from onchain game ${gameId}$
    - parameters :
        - ${gameId}$ : number
    - return :
        - ${playerId}$ : number
