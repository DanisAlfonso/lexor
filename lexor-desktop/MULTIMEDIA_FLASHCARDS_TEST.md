# 🎵 Multimedia Flashcard Test

This file tests multimedia content in flashcards - images, audio, and mixed content.

## Flash: What does this image show?
### Answer: ![Test Image](https://via.placeholder.com/300x200/4f46e5/ffffff?text=Test+Image)
This is a test image placeholder that should render in the flashcard.

## Flash: Play this audio clip [inline: pronunciation](https://www.soundjay.com/misc/beep-03.wav)
### Answer: This was an inline audio player demonstration. The sound should have been a short beep.

## Flash: What is this audio file about?
[audio: Sample Audio File](https://www.soundjay.com/misc/beep-07.wav)

### Answer: This is a block audio player with full controls. It should show play/pause, progress bar, and duration.

## Flash: Mixed Media Example
This flashcard has both text and media:

![Sample Image](https://via.placeholder.com/250x150/10b981/ffffff?text=Sample)

And an inline audio: [inline: example sound](https://www.soundjay.com/misc/beep-01.wav)

### Answer: The answer can also have mixed media!

Here's an answer image:
![Answer Image](https://via.placeholder.com/200x120/ef4444/ffffff?text=Answer+Image)

Plus some explanatory audio:
[audio: Explanation Audio](https://www.soundjay.com/misc/beep-02.wav)

## Flash: Complex Media Layout
Front side with multiple elements:

1. First, an image: ![Image 1](https://via.placeholder.com/150x100/8b5cf6/ffffff?text=Image+1)
2. Then inline audio: [inline: sound 1](https://www.soundjay.com/misc/beep-04.wav)
3. Block audio: [audio: Background Music](https://www.soundjay.com/misc/beep-05.wav)
4. Another image: ![Image 2](https://via.placeholder.com/150x100/f59e0b/ffffff?text=Image+2)

### Answer: Complex answer with media:

**Step 1:** Study this diagram
![Diagram](https://via.placeholder.com/300x180/06b6d4/ffffff?text=Study+Diagram)

**Step 2:** Listen to the explanation
[audio: Detailed Explanation](https://www.soundjay.com/misc/beep-06.wav)

**Step 3:** Practice with this audio
[inline: practice](https://www.soundjay.com/misc/beep-08.wav)

## Flash: Local File Path Test (will show error gracefully)
This tests local file paths that don't exist:

![Local Image](~/Pictures/nonexistent.jpg)

### Answer: Local audio test:
[audio: Local Audio](~/Music/nonexistent.mp3)

This should show error states gracefully without breaking the flashcard interface.

## Flash: Text-only control case
This is a regular text-only flashcard for comparison.

### Answer: This answer has no multimedia content, just plain text to ensure text rendering still works properly.