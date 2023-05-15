# zkShuffle SDK


<!-- ## TODO
1. gameId mapping
2. create game id
3. checkTurn , checkShuffleTurn, checkDealTurn...
4. playerId implicit.
 -->


## Workflow


## Solidity Interface
```solidity
interface IBaseGame {
    function cardConfig() external view returns (DeckConfig);
    function shuffleGameId(uint gameId) external view returns(uint shuffleGameId);
}

interface IBaseStateManager {
    ...
}

```


## SDK Interface


```typescript=
interface IZKShuffle {
    joinGame : (gameId : number) => Promise<number>
    checkTurn : (gameId : number, playerId : number) => Promise<number>
    shuffle : (gameId: number, playerId : number) => Promise<void>
    draw : (gameId: number) => Promise<void>
    open : (gameId: number, cardId : number[]) => Promise<void>
}
```

- ### joinGame
    - gameId : number
    - return :
        - playerId : number

- ### checkTurn
    - gameId : number
    - playerId : number
    - return : 
        - TrunState
        ```typescript
            enum {
                NOP,                // Do nothing
                Shuffle,            // Shuffle Turn
                Deal,               // Deal Decrypt Turn
                Open,               // Open Card
                GameError,
                Complete
            }
        ```

- ### shuffle
    - gameId : number
    - playerId : number
    

- ### draw
    - gameId : number


- ### open
    - gameId : number
    - cardId : number[]



## Demo
```typescript=
    const player = new zkShuffle(ShuffleManater, owner)
    await player.init()

    // join game
    const playerIdx = await player.joinGame(gameId)

    // play game
    let state
    while (state != BaseState.Complete) {
        state = await player.checkTurn(gameId, playerIdx)

        if (state != NOT_TRUN) {
            switch(state) {
                case BaseState.Shuffle :
                    await player.shuffle(gameId, playerIdx)
                    break
                case BaseState.Deal :
                    await player.draw(gameId)
                    break
                case BaseState.Open :
                    await player.open(gameId, playerIdx)
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
    