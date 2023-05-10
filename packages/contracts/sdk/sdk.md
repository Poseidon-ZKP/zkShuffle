# zkShuffle SDK




## Workflow





## Interface

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
    