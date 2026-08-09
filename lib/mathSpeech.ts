/**
 * Makes a maths question audible for the read-aloud accommodation.
 *
 * The accommodation feeds question text straight into the browser's speech
 * engine. Two tokens in this content are not merely mispronounced — they are
 * SILENT. Measured with `say -v Samantha -r 95` (the same Apple voice assets the
 * browser exposes as its local en-US voice), rendering to AIFF and comparing
 * MD5 against the identical string with the token deleted:
 *
 *   "80 − 30 = ?"  vs "80  30 = ?"   -> byte-identical   (U+2212)
 *   "80 - 30 = ?"  vs "80  30 = ?"   -> byte-identical   (ASCII hyphen too)
 *   "63 − 27 = ?"  vs "63  27 = ?"   -> byte-identical
 *   "6 + ___ = 10" vs "6 +  = 10"    -> byte-identical
 *   "3 __ 8"       vs "3  8"         -> byte-identical
 *
 * So a Grade 1 student hears "ten plus eight equals." for "10 + 8 = ___." and
 * "eighty thirty equals" for "80 − 30 = ?". The operator, and the very thing
 * being asked for, both vanish — on the surface built for students who cannot
 * read the question themselves.
 *
 * Everything else in this corpus IS voiced, and is deliberately left alone:
 * `+ = × ÷ °`, superscript digits, and "3/4" each produced audio that differed
 * from the same string with the token removed. A minus attached to its digit
 * ("−5") is voiced as well, which is why only the SPACED binary form is
 * rewritten — rewriting the unspaced form would change something already
 * correct.
 *
 * Substituting one dash character for the other does NOT help: the ASCII hyphen
 * is equally silent. Only the word works.
 *
 * This changes what is SPOKEN. It never touches what is displayed.
 */
export function speechTextForMath(text: string): string {
  if (!text) return text;
  return (
    text
      // A run of underscores is the blank the student is asked to fill. Without
      // this the question loses the only part that makes it a question.
      .replace(/_{2,}/g, " blank ")
      // Spaced binary minus, either dash character. The neighbours must be a
      // digit, a letter, or a bracket, so this leaves alone: "twenty-one" and
      // any other hyphenated word (no surrounding spaces), a dash used as
      // punctuation between words with spaces on only one side, and "−5", whose
      // minus is already voiced.
      .replace(/(?<=[\dA-Za-z)])[ \t][−-][ \t](?=[\dA-Za-z(])/g, " minus ")
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  );
}
