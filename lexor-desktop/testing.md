# Markdown Feature Test Document

This document tests all major Markdown features to see how they render in the editor.

## Headings

# H1 Heading
## H2 Heading
### H3 Heading
#### H4 Heading
##### H5 Heading
###### H6 Heading

## Text Formatting

**Bold text** and __also bold__

*Italic text* and _also italic_

***Bold and italic*** and ___also bold and italic___

~~Strikethrough text~~

`Inline code` with backticks

## Lists

### Unordered Lists

- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
    - Double nested item
- Item 3

* Alternative bullet style
* Another item
  * Nested with asterisk

+ Plus sign bullets
+ Another plus item

### Ordered Lists

1. First item
2. Second item
   1. Nested numbered item
   2. Another nested item
3. Third item

1. Numbers don't have to be sequential
3. Like this
7. Or this

## Links and Images

[Link to Google](https://www.google.com)

[Link with title](https://www.example.com "Example Title")

Auto-link: https://www.github.com

Reference-style link: [Reference link][1]

[1]: https://www.example.com "Reference URL"

![Alt text for image](https://via.placeholder.com/300x200.png "Image Title")

## Code Blocks

### Inline Code
Here's some `inline code` in a sentence.

### Fenced Code Blocks

```javascript
function greet(name) {
    console.log(`Hello, ${name}!`);
    return `Welcome, ${name}`;
}

greet("World");
```

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print([fibonacci(i) for i in range(10)])
```

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test Page</title>
</head>
<body>
    <h1>Hello World</h1>
</body>
</html>
```

### Indented Code Block

    function oldSchoolCode() {
        return "This is indented with 4 spaces";
    }

## Blockquotes

> This is a blockquote
> 
> It can span multiple lines

> Blockquotes can be nested
> > Like this
> > > And even deeper

> ## Blockquotes can contain other Markdown elements
> 
> 1. Ordered lists
> 2. **Bold text**
> 3. `Code snippets`

## Tables

| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Cell 1       | Cell 2         | Cell 3        |
| Cell 4       | Cell 5         | Cell 6        |
| Long content | Short          | 123.45        |

| Feature | Support | Notes |
|---------|:-------:|-------|
| Headers | ✅ | All 6 levels |
| **Bold** | ✅ | Multiple syntaxes |
| *Italic* | ✅ | Multiple syntaxes |
| `Code` | ✅ | Inline and blocks |
| Links | ✅ | Multiple styles |
| Tables | ✅ | With alignment |

## Horizontal Rules

---

***

___

## Special Characters and Escaping

\*This is not italic\*

\`This is not code\`

\# This is not a heading

## Task Lists

- [x] Completed task
- [ ] Incomplete task
- [x] Another completed task
  - [ ] Nested incomplete task
  - [x] Nested completed task

## HTML in Markdown

<div style="background-color: #f0f0f0; padding: 10px;">
This is HTML content inside Markdown.
<strong>HTML bold</strong> and <em>HTML italic</em>.
</div>

<details>
<summary>Click to expand</summary>
This content is hidden by default and can be expanded.

It can contain **Markdown** too!
</details>

## Footnotes

Here's a sentence with a footnote[^1].

Here's another footnote[^note].

[^1]: This is the first footnote.
[^note]: This is a named footnote with more content.
    
    It can have multiple paragraphs.

## Definition Lists

Apple
:   A red or green fruit

Orange
:   An orange citrus fruit

Banana
:   A yellow tropical fruit
:   Also great in smoothies

## Abbreviations

*[HTML]: Hyper Text Markup Language
*[CSS]: Cascading Style Sheets

The HTML specification is maintained by W3C.
CSS is used for styling web pages.

## Math (if supported)

Inline math: $E = mc^2$

Block math:
$$
\sum_{i=1}^{n} x_i = x_1 + x_2 + \cdots + x_n
$$

## Emoji (if supported)

:smile: :heart: :thumbsup: :rocket: :fire: :tada:

## Line Breaks and Paragraphs

This is a paragraph with a soft line break.
This line continues the same paragraph.

This is a new paragraph after a blank line.

This line ends with two spaces..  
So this is a hard line break.

---

## Testing Edge Cases

### Empty Elements

**

__

**__

### Nested Formatting

This is **bold with *italic* inside**.

This is *italic with **bold** inside*.

This is ***bold italic with `code` inside***.

### Special Characters in Code

`<script>alert('xss')</script>`

```javascript
const regex = /\*\*(.+?)\*\*/g;
const html = `<div class="test">Hello</div>`;
```

### Mixed Lists

1. Ordered item
   - Unordered nested
   - Another unordered
2. Back to ordered
   1. Nested ordered
   2. Another nested ordered

### Long Content Test

This is a very long line of text that should wrap properly in the editor and test how the line wrapping functionality works with different font families and sizes. It contains various formatting like **bold text**, *italic text*, `inline code`, and [links](https://example.com) to see how they all flow together in a long paragraph.

---

*This test document covers most Markdown features. Some features like math, footnotes, and certain HTML elements may depend on the specific Markdown renderer being used.*