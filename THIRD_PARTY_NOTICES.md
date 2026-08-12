# Third-party puzzle data

The bundled Sudoku puzzles are a 1,000-puzzle subset of the fixed
[`d8c8eba` version of Sudoku Exchange Puzzle Bank](https://github.com/grantm/sudoku-exchange-puzzle-bank/tree/d8c8ebaee0c08c412cfba96af1923dfa61c83317)
by Grant McLean.

The source repository states that QQWing generated and uniqueness-checked the
puzzles, and Sukaku Explainer assigned each difficulty rating. The data set is
released into the public domain under
[The Unlicense](https://github.com/grantm/sudoku-exchange-puzzle-bank/blob/master/LICENSE.txt).

Each bundled record preserves the original 81-digit puzzle and Sukaku Explainer
rating. The app groups those ratings into five deliberately harder ranges and
independently checks every bundled puzzle for exactly one solution in its test suite.
