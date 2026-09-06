# Third-party puzzle data

## Sudoku puzzles

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

## Idiom corpus

The bundled idioms in `src/data/idioms.js` are the surface forms of the main
text of the *Idioms Dictionary* (《成語典》), 2020 edition, data file
`dict_idioms_2020_20240926.xls` dated 2024-09-26.

- Original author: the Ministry of Education, Republic of China (中華民國教育部).
- Maintaining institution: the National Academy for Educational Research
  (國家教育研究院).
- Edition: 2020 年版 (`dict_idioms_2020_20240926`).
- Licence: [創用 CC 姓名標示－禁止改作 3.0 臺灣](https://creativecommons.org/licenses/by-nd/3.0/tw/)
  (CC BY-ND 3.0 TW, Attribution-NoDerivs 3.0 Taiwan).

The Ministry's own reading of the no-derivatives term, as recorded by the g0v
moedict project, is that the restriction applies to the dictionary text itself
and does not restrict format conversion or downstream application. This
repository therefore converts the dictionary into a JavaScript array and ships
only a filtered subset of it — the four-character surface forms, with no
definition, 注音, or 漢語拼音 text. Any dictionary text the application displays
in future must be reproduced verbatim: it may not be abridged, paraphrased,
summarised, or reworded.

The rows were taken from the machine-readable conversion published as
[`c5b5eae` of jfsblog/Idiom-Search-Engine](https://github.com/jfsblog/Idiom-Search-Engine/tree/c5b5eae731fb3f4e565f802aa91be354cb91bcd9),
which converts the Ministry's spreadsheet and excludes the common four-character
words of the *Revised Mandarin Chinese Dictionary*.

### Frequency tiers

The frequency tier attached to each idiom is ranked from the 成語 lexicon of
THUOCL (清華大學開放中文詞庫, Tsinghua Open Chinese Lexicon) by Shiyi Han, Yuhui
Zhang, Yunshan Ma, Cunchao Tu, Zhipeng Guo, Zhiyuan Liu and Maosong Sun,
released under the [MIT licence](https://github.com/thunlp/THUOCL/blob/master/LICENSE)
at [`a30ce79`](https://github.com/thunlp/THUOCL/tree/a30ce79d895d01ab5132a5c74c29703ff7efb4cc).
That lexicon is used only to order entries that already exist in the dictionary
corpus; it never adds one.

Aligning the Traditional corpus to that Simplified lexicon uses the
Traditional-to-Simplified character table `TSCharacters.txt` from
[`2675388` of BYVoid/OpenCC](https://github.com/BYVoid/OpenCC/tree/26753884f1984add422f3b0249ccee8613deaff6),
licensed [Apache-2.0](https://github.com/BYVoid/OpenCC/blob/master/LICENSE).
The table is a build-time input only and is not redistributed here.
