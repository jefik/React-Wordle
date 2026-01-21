import { useState, useEffect, useCallback } from "react";
import validWords from "./words.json";
import { motion } from "motion/react";

// Func to compare guess word with target word
function compareGuess(guess, target) {
  const result = Array(guess.length).fill("absent");
  const targetLetters = target.split("");

  // First pass, check letters in correct position
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === target[i]) {
      result[i] = "correct";
      targetLetters[i] = null;
    }
  }

  // Second pass, check letters that exist in the word but in wrong position
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === "correct") continue;

    // Find position of the guess word letter in targetLetters
    const index = targetLetters.indexOf(guess[i]);

    if (index !== -1) {
      result[i] = "present";
      targetLetters[index] = null;
    }
  }

  return result;
}

// Func to check if word has already beenm guessed
function guessedWord(word, guesses) {
  // Map over all previous guesses
  const guessedWords = guesses.map((guess) => {
    // Map letters array to get chars of each guess word
    const letters = guess.letters.map((letter) => {
      return letter.char;
    });

    // Join the letter back into the string word
    const guessedWord = letters.join("");
    return guessedWord;
  });

  return guessedWords.includes(word);
}

// API for validating inputs words
async function isValidWord(word) {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);

    if (!response.ok) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Dictionary API error:", error);
    return false;
  }
}

function App() {
  /* console.log("1. LOADING WHOLE APP COMPONENT"); */
  // Game states
  const [targetWord, setTargetWord] = useState("");
  const [currentGuess, setCurrentGuess] = useState("");
  const [guesses, setGuesses] = useState([]);
  const [gameStatus, setGameStatus] = useState("playing");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentRow, setCurrentRow] = useState(0);
  const [isInvalid, setIsInvalid] = useState(false);
  const [message, setMessage] = useState("");
  const [showTargetWord, setShowTargetWord] = useState(false);
  const [keyStatus, setKeyStatus] = useState({});

  // Constants
  const Keyboard = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
  ];
  const WORD_LENGTH = 5;
  const MAX_ATTEMPTS = 6;

  // Func to pick random word to guess
  async function loadTargetWord() {
    let valid = false;
    let targetWord = "";

    // Control if word from JSON is valid from the API DICT
    while (!valid) {
      const randomIndex = Math.floor(Math.random() * validWords.words.length);
      targetWord = validWords.words[randomIndex].toUpperCase();

      try {
        valid = await isValidWord(targetWord);
      } catch (err) {
        console.error("Error: Not a valid word:", err);
        valid = false;
      }
    }

    setTargetWord(targetWord);
    /* console.log("Valid target word:", targetWord); */
  }

  // Pick and load random word to guess
  useEffect(() => {
    loadTargetWord();
  }, []);

  // Func to reset game
  const resetGame = () => {
    setGuesses([]);
    setCurrentGuess("");
    setCurrentRow(0);
    setKeyStatus({});
    setGameStatus("playing");
    setMessage("");
    // Load new word
    loadTargetWord();
  };

  // Func to add status to keys on keyboard
  const updateKeyStatus = (guessLetters) => {
    setKeyStatus((prev) => {
      const newStatus = { ...prev };
      guessLetters.forEach(({ char, status }) => {
        // Only upgrade status if correct > present > absent
        const oldStatus = prev[char];
        if (oldStatus === "correct") return;
        if (oldStatus === "present" && status === "absent") return; // Dont downgrade
        newStatus[char] = status;
      });
      return newStatus;
    });
  };

  // Func to handle all inputs and game logic
  const handleInput = useCallback(
    async (event) => {
      if (gameStatus !== "playing") return;

      const key = event.toUpperCase();
      /*  console.log("USED KEY:", key); */
      // ENTER KEY
      if (key === "ENTER") {
        // Enter not working when guess word length !== 5
        if (currentGuess.length !== WORD_LENGTH) {
          return;
        }
        // Enter not working when max attempts reached
        if (currentRow >= MAX_ATTEMPTS) {
          return;
        }

        // Validate the word with API Dict
        /* console.log("validating:", currentGuess); */
        const validWord = await isValidWord(currentGuess);
        if (!validWord) {
          setMessage("Word is not valid");
          // For Shake animation
          setIsInvalid(true);
          setTimeout(() => setIsInvalid(false), 500);
          return;
        } else {
          setMessage("");
        }

        // Check if word was already guessed
        if (guessedWord(currentGuess, guesses)) {
          setMessage("You already guessed that word");
          // For Shake animation
          setIsInvalid(true);
          setTimeout(() => setIsInvalid(false), 500);
          return;
        }

        // Process the guess word
        // Compare the current guess word with target word
        const compare = compareGuess(currentGuess, targetWord);
        /* console.log("compare result:", compare); */

        // Split the guessed word into letters and add their status
        const guessletters = currentGuess.split("").map((char, index) => ({
          char,
          status: compare[index],
        }));

        // Add the new guess word to the guesses
        setGuesses((prev) => [
          ...prev, // All previous guesses
          {
            letters: guessletters, // Add the current new guess
          },
        ]);

        /* updateKeyStatus(guessletters); */
        setTimeout(() => {
          updateKeyStatus(guessletters);
        }, 1000);

        // Check if guess word is correct
        if (currentGuess === targetWord) {
          setTimeout(() => {
            setGameStatus("won");
            setMessage("You Won!");
          }, 1200);

          return;
        }

        // Check if max attempts reached
        if (currentRow === MAX_ATTEMPTS - 1) {
          setGameStatus("lost");
          setMessage("You Lost :(");
          return;
        }

        setCurrentGuess("");
        setCurrentRow((prevRow) => prevRow + 1);
      }

      // BACKSPACE KEY
      else if (key === "BACKSPACE") {
        setCurrentGuess((prev) => {
          setMessage("");
          if (prev.length > 0) {
            return prev.slice(0, -1);
          } else {
            return prev;
          }
        });
        return;
      }

      // A-Z KEYS
      else if (/^[a-zA-Z]$/.test(key)) {
        setCurrentGuess((prev) => {
          if (prev.length < WORD_LENGTH) {
            return prev + key.toUpperCase();
          } else {
            return prev;
          }
        });
      }
    },
    [currentGuess, currentRow, gameStatus, guesses, targetWord]
  );

  // Func for clicks on virtual keyboard
  const handleKeyClick = (letter) => {
    handleInput(letter);
  };

  // Event listener for all inputs
  useEffect(() => {
    /* console.log("2. LOADING EVENT LISTENER"); */
    const handleKeyDown = (event) => {
      handleInput(event.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleInput]);

  /*   // Debugging
  useEffect(() => {
    console.group("APP STATE CHANGED");
    console.log("guesses:", guesses);
    console.log("currentGuess:", currentGuess);
    console.log("currentRow:", currentRow);
    console.log("gameStatus:", gameStatus);
    console.groupEnd();
  }, [guesses, currentGuess, currentRow, gameStatus]); */

  return (
    <>
      <div className="app">
        <motion.div
          className="board"
          initial={{ opacity: 0, y: 1000 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <h1>Wordle</h1>
          <p className={gameStatus === "won" ? "text-success" : "text-danger"}>{message}</p>
          <p className="m-0">Word is: {showTargetWord ? targetWord : "*****"}</p>
          <div className="row game-buttons">
            <div className="col-auto flex-shrink-0">
              <button className="btn btn-primary text-nowrap" onClick={() => setShowTargetWord(!showTargetWord)}>
                {showTargetWord ? "Hide Word" : "Reveal Word"}
              </button>
            </div>
            <div className="col-auto flex-shrink-0">
              <button className="btn btn-secondary" onClick={resetGame}>
                New Word
              </button>
            </div>
          </div>

          {Array.from({ length: MAX_ATTEMPTS }).map((value, rowIndex) => {
            const guess = guesses[rowIndex];
            const isCurrentRow = rowIndex === currentRow;
            return (
              <motion.div
                key={rowIndex}
                className="d-flex justify-content-center mb-2"
                // If its current row and its not valid then shake animation
                animate={isCurrentRow && isInvalid ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div key={rowIndex} className="d-flex gap-2 justify-content-center mb-2">
                  {Array.from({ length: WORD_LENGTH }).map((value, cellIndex) => {
                    let char = "";
                    let status = null;

                    // If guess word exists for this row, show it with status
                    if (guess) {
                      const cell = guess.letters[cellIndex];
                      // If cell exists, get char and status
                      if (cell) {
                        char = cell.char;
                        status = cell.status;
                      }
                    }
                    // If this is active row, show current guess word letters
                    else if (rowIndex === currentRow) {
                      char = currentGuess[cellIndex] || "";
                    }

                    return (
                      <motion.div
                        key={cellIndex}
                        className={`cell ${status ? `cell--${status}` : ""}`}
                        // Calculation for the animation times,
                        style={{
                          transitionDelay: status ? `${cellIndex * 0.15 + 0.25}s` : "0s",
                        }}
                        animate={
                          gameStatus === "won" && rowIndex === currentRow
                            ? {
                                y: [0, -30, 0],
                              }
                            : status
                            ? { rotateX: [0, 90, 0] }
                            : {}
                        }
                        transition={
                          gameStatus === "won" && rowIndex === currentRow
                            ? {
                                delay: cellIndex * 0.15,
                                duration: 0.5,
                                repeat: 3,
                                ease: "easeInOut",
                              }
                            : {
                                delay: status ? cellIndex * 0.15 : 0,
                                duration: 0.5,
                                times: [0, 0.5, 1],
                              }
                        }
                      >
                        {char}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
          <div className="keyboard">
            {Keyboard.map((row, rowIndex) => (
              <div key={rowIndex} className="keyboard-row">
                {row.map((letter) => (
                  <button
                    key={letter}
                    className={`key ${letter === "ENTER" || letter === "BACKSPACE" ? "key--wide" : ""} ${
                      keyStatus[letter] ? `cell--${keyStatus[letter]}` : ""
                    }`}
                    onClick={() => handleKeyClick(letter)}
                  >
                    {letter === "BACKSPACE" ? "⌫" : letter}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default App;
