import { useState, useEffect } from "react";
import validWords from "./words.json";

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
  const [targetWord, setTargetWord] = useState("");
  const [currentGuess, setCurrentGuess] = useState("");
  const [guesses, setGuesses] = useState([]);
  const [gameStatus, setGameStatus] = useState("playing");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentRow, setCurrentRow] = useState(0);
  const WORD_LENGTH = 5;
  const MAX_ATTEMPTS = 6;

  /* const targetWord = "APPLE"; */
  const [message, setMessage] = useState("");
  const [showTargetWord, setShowTargetWord] = useState(false);

  useEffect(() => {
    function loadTargetWord() {
      const randomWord = Math.floor(Math.random() * validWords.words.length);
      const targetWord = validWords.words[randomWord].toUpperCase();

      setTargetWord(targetWord);
      console.log("Target word je:", targetWord);
    }

    loadTargetWord();
  }, []);

  useEffect(() => {
    const handleKeyDown = async (event) => {
      const key = event.key;
      // If game is not in playing state ignore input
      if (gameStatus !== "playing") {
        return;
      }
      // Enter Key
      if (key === "Enter") {
        // Enter not working when guess word length !== 5
        if (currentGuess.length !== WORD_LENGTH) {
          return;
        }
        // Enter not working when max attempts reached
        if (currentRow >= MAX_ATTEMPTS) {
          return;
        }

        // Validate the word with API Dict
        console.log("validating:", currentGuess);
        const validWord = await isValidWord(currentGuess);
        if (!validWord) {
          setMessage("Word is not valid");
          return;
        } else {
          setMessage("");
        }

        // Check if word was already guessed
        if (guessedWord(currentGuess, guesses)) {
          setMessage("You already guessed that word");
          return;
        }

        // Process the guess word
        // Compare the current guess word with target word
        const compare = compareGuess(currentGuess, targetWord);
        console.log("compare result:", compare);

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

        // Check if guess word is correct
        if (currentGuess === targetWord) {
          setGameStatus("won");
          return;
        }

        // Check if max attempts reached
        if (currentRow === MAX_ATTEMPTS - 1) {
          setGameStatus("lost");
          return;
        }

        setCurrentGuess("");
        setCurrentRow((prevRow) => prevRow + 1);
        return;
      }

      // Backspace Key
      if (key === "Backspace") {
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

      // A-Z Keys
      if (/^[a-zA-Z]$/.test(key)) {
        setCurrentGuess((prev) => {
          if (prev.length < WORD_LENGTH) {
            return prev + key.toUpperCase();
          } else {
            return prev;
          }
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentGuess, currentRow, gameStatus, targetWord]);

  // Debugging
  useEffect(() => {
    console.group("APP STATE CHANGED");
    console.log("guesses:", guesses);
    console.log("currentGuess:", currentGuess);
    console.log("currentRow:", currentRow);
    console.log("gameStatus:", gameStatus);
    console.groupEnd();
  }, [guesses, currentGuess, currentRow, gameStatus]);

  return (
    <>
      <div className="app container">
        <div className="board">
          <p className="text-center">
            Word is: {showTargetWord ? targetWord : "*****"} <br />
            <button className="btn btn-primary" onClick={() => setShowTargetWord(!showTargetWord)}>
              {showTargetWord ? "Hide" : "Reveal"} Word
            </button>
            <br />
            Current guess:
            <strong>
              {currentGuess} <br />
              Row: {currentRow + 1} / {MAX_ATTEMPTS} <br /> Status: {gameStatus} <br />
              {message} <br />
            </strong>
          </p>

          {Array.from({ length: MAX_ATTEMPTS }).map((value, rowIndex) => {
            const guess = guesses[rowIndex];

            return (
              <div key={rowIndex} className="d-flex justify-content-center mb-2">
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
                    <div key={cellIndex} className={`cell ${status ? `cell--${status}` : ""}`}>
                      {char}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default App;
